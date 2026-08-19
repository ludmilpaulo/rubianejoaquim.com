"""
Social login / account-linking API views.
"""

from __future__ import annotations

import base64
import hashlib
import logging
import secrets
from datetime import timedelta
from urllib.parse import urlencode

from django.conf import settings
from django.http import HttpResponseRedirect
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
    throttle_classes,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.authtoken.models import Token

from .models import OAuthState, SocialAccount
from .serializers import UserSerializer
from .social_providers import (
    ProviderVerificationError,
    build_tiktok_authorize_url,
    exchange_tiktok_code,
    log_oauth_failure,
    log_oauth_step,
    verify_apple_identity_token,
    verify_facebook_access_token,
    verify_google_id_token,
)
from .social_service import (
    SocialAuthError,
    authenticate_social_user,
    confirm_social_link,
    list_login_methods,
    make_session_exchange_code,
    redeem_session_exchange_code,
    unlink_social_account,
)

logger = logging.getLogger(__name__)


class AppSchemeRedirect(HttpResponseRedirect):
    """
    Django's HttpResponseRedirect only allows http/https/ftp.
    Redirecting to zenda:// raises DisallowedRedirect, which production maps to HTTP 400.
    """

    allowed_schemes = ['http', 'https', 'ftp', 'zenda', 'com.rubianejoaquim.zenda']


class AuthBurstThrottle(AnonRateThrottle):
    scope = 'auth_burst'


class AuthUserThrottle(UserRateThrottle):
    scope = 'auth_user'


def _frontend_url(path: str = '/') -> str:
    base = getattr(settings, 'FRONTEND_URL', 'https://www.rubianejoaquim.com').rstrip('/')
    if not path.startswith('/'):
        path = '/' + path
    return f'{base}{path}'


def _safe_redirect_path(path: str | None) -> str:
    """Only allow relative in-app paths (prevent open redirects)."""
    if not path or not isinstance(path, str):
        return '/area-do-aluno'
    path = path.strip()
    if not path.startswith('/') or path.startswith('//') or ':' in path:
        return '/area-do-aluno'
    return path[:255]


def _post_auth_redirect_base(*, client: str | None) -> str:
    """Web frontend or allow-listed mobile deep-link base (no open redirects)."""
    if client == 'mobile':
        mobile = (getattr(settings, 'MOBILE_OAUTH_REDIRECT_URI', '') or '').rstrip('/')
        if mobile.startswith(('zenda://', 'com.rubianejoaquim.zenda://')):
            return mobile
    return _frontend_url('/login/social-callback')


def _encode_mobile_redirect_path(platform: str, path: str) -> str:
    plat = platform if platform in ('android', 'ios') else 'mobile'
    return f'mobile:{plat}:{path}'


def _parse_mobile_redirect_path(stored: str | None) -> tuple[str, str, str]:
    """Return (client, platform, path) from OAuthState.redirect_path."""
    stored = stored or '/area-do-aluno'
    if not stored.startswith('mobile:'):
        return 'web', 'web', stored
    rest = stored[7:]
    for plat in ('android', 'ios', 'mobile'):
        prefix = f'{plat}:'
        if rest.startswith(prefix):
            return 'mobile', plat, rest[len(prefix):]
    return 'mobile', 'mobile', rest


def _oauth_param(request, name: str) -> str:
    value = str(request.query_params.get(name) or '').strip()
    if value:
        return value
    try:
        data = getattr(request, 'data', None)
        if data is not None:
            return str(data.get(name) or '').strip()
    except Exception:
        pass
    return str(request.POST.get(name) or '').strip()


def _auth_response(result) -> Response:
    if result.status == 'link_required':
        return Response(
            {
                'status': 'link_required',
                'link_token': result.link_token,
                'email': result.email,
                'provider': result.provider,
                'message': result.message,
            },
            status=status.HTTP_200_OK,
        )
    return Response(
        {
            'status': 'authenticated',
            'user': UserSerializer(result.user).data,
            'token': result.token,
            'created': result.created,
            'provider': result.provider,
            'message': result.message,
        },
        status=status.HTTP_200_OK,
    )


def _error_response(exc: Exception) -> Response:
    if isinstance(exc, ProviderVerificationError):
        if exc.cancelled:
            return Response(
                {'status': 'cancelled', 'message': 'Autenticação cancelada.'},
                status=status.HTTP_200_OK,
            )
        return Response(
            {'error': exc.public_message, 'code': 'provider_verification_failed'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if isinstance(exc, SocialAuthError):
        return Response(
            {'error': exc.message, 'code': exc.code},
            status=exc.status,
        )
    logger.exception('Unexpected social auth error')
    return Response(
        {'error': 'Não foi possível concluir o login. Tente novamente.', 'code': 'server_error'},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


def _pkce_pair() -> tuple[str, str]:
    verifier = secrets.token_urlsafe(64)[:128]
    challenge = base64.urlsafe_b64encode(
        hashlib.sha256(verifier.encode('ascii')).digest()
    ).decode('ascii').rstrip('=')
    return verifier, challenge


def _client_platform(request) -> str:
    raw = ''
    try:
        data = getattr(request, 'data', None)
        if data is not None:
            raw = str(data.get('platform') or data.get('client') or '')
    except Exception:
        raw = ''
    if not raw:
        raw = str(request.query_params.get('platform') or request.query_params.get('client') or '')
    raw = raw.strip().lower()
    if raw in ('android', 'ios', 'web', 'mobile'):
        return raw
    return 'unknown'


def _tiktok_redirect_uri() -> str:
    redirect_uri = (getattr(settings, 'TIKTOK_REDIRECT_URI', '') or '').strip()
    if redirect_uri:
        return redirect_uri
    api_base = getattr(settings, 'API_PUBLIC_URL', '').rstrip('/')
    if not api_base:
        return ''
    return f'{api_base}/api/auth/social/tiktok/callback/'


def _create_tiktok_authorize(*, purpose: str, redirect_path: str, linking_user=None) -> str:
    redirect_uri = _tiktok_redirect_uri()
    if not redirect_uri:
        raise ProviderVerificationError('Login com TikTok não está configurado.')
    state = secrets.token_urlsafe(32)
    code_verifier, code_challenge = _pkce_pair()
    OAuthState.objects.create(
        state=state,
        provider=SocialAccount.PROVIDER_TIKTOK,
        purpose=purpose,
        user=linking_user,
        redirect_path=redirect_path,
        code_verifier=code_verifier,
        expires_at=timezone.now() + timedelta(minutes=10),
    )
    return build_tiktok_authorize_url(
        state=state,
        code_challenge=code_challenge,
        redirect_uri=redirect_uri,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthBurstThrottle])
@csrf_exempt
def google_login(request):
    """Exchange a Google GIS ID token for an application session (or link when authenticated)."""
    id_token = request.data.get('id_token') or request.data.get('credential')
    if not id_token:
        return Response({'error': 'Credencial Google em falta.', 'code': 'missing_token'}, status=400)
    try:
        verified = verify_google_id_token(id_token)
        linking_user = request.user if request.user.is_authenticated else None
        result = authenticate_social_user(verified, linking_user=linking_user)
        return _auth_response(result)
    except (ProviderVerificationError, SocialAuthError) as exc:
        log_oauth_failure(
            provider='google',
            step='login',
            platform=_client_platform(request),
            error=getattr(exc, 'code', None) or type(exc).__name__,
        )
        return _error_response(exc)
    except Exception as exc:
        return _error_response(exc)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthBurstThrottle])
@csrf_exempt
def facebook_login(request):
    """Exchange a Facebook user access token for an application session."""
    access_token = request.data.get('access_token')
    if not access_token:
        return Response({'error': 'Token Facebook em falta.', 'code': 'missing_token'}, status=400)
    try:
        verified = verify_facebook_access_token(access_token)
        linking_user = request.user if request.user.is_authenticated else None
        result = authenticate_social_user(verified, linking_user=linking_user)
        return _auth_response(result)
    except (ProviderVerificationError, SocialAuthError) as exc:
        log_oauth_failure(
            provider='facebook',
            step='login',
            platform=_client_platform(request),
            error=getattr(exc, 'code', None) or type(exc).__name__,
        )
        return _error_response(exc)
    except Exception as exc:
        return _error_response(exc)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthBurstThrottle])
@csrf_exempt
def apple_login(request):
    """
    Exchange a Sign in with Apple identity token for an application session.
    Body: { identity_token, full_name?: { givenName, familyName }, user?: apple_user_id }
    The Apple `user` string is never trusted alone — JWT `sub` is the identity.
    """
    identity_token = request.data.get('identity_token') or request.data.get('id_token')
    if not identity_token:
        return Response({'error': 'Credencial Apple em falta.', 'code': 'missing_token'}, status=400)
    full_name = request.data.get('full_name')
    if full_name is not None and not isinstance(full_name, dict):
        full_name = None
    try:
        verified = verify_apple_identity_token(identity_token, full_name=full_name)
        linking_user = request.user if request.user.is_authenticated else None
        result = authenticate_social_user(verified, linking_user=linking_user)
        return _auth_response(result)
    except (ProviderVerificationError, SocialAuthError) as exc:
        return _error_response(exc)
    except Exception as exc:
        return _error_response(exc)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthBurstThrottle])
@csrf_exempt
def social_exchange(request):
    """Redeem a short-lived OAuth exchange code for a DRF session token (mobile TikTok)."""
    code = request.data.get('exchange_code') or request.data.get('code')
    if not code:
        return Response({'error': 'exchange_code em falta.', 'code': 'missing_code'}, status=400)
    platform = _client_platform(request)
    log_oauth_step(provider='tiktok', step='session_exchange', platform=platform, status='started')
    try:
        token_key = redeem_session_exchange_code(code)
        token = Token.objects.select_related('user').filter(key=token_key).first()
        if not token or not token.user.is_active:
            raise SocialAuthError('Sessão inválida.', code='invalid_session', status=401)
        log_oauth_step(provider='tiktok', step='session_exchange', platform=platform, status='success')
        return Response({
            'status': 'authenticated',
            'user': UserSerializer(token.user).data,
            'token': token.key,
            'created': False,
            'provider': request.data.get('provider') or 'tiktok',
        })
    except SocialAuthError as exc:
        log_oauth_failure(
            provider='tiktok',
            step='session_exchange',
            platform=platform,
            error=exc.code,
        )
        return _error_response(exc)
    except Exception as exc:
        return _error_response(exc)


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([AuthBurstThrottle])
@csrf_exempt
def social_link_confirm(request):
    """Confirm linking a social identity to an existing email/password account."""
    link_token = request.data.get('link_token')
    password = request.data.get('password')
    if not link_token or not password:
        return Response(
            {'error': 'link_token e password são obrigatórios.', 'code': 'missing_fields'},
            status=400,
        )
    try:
        result = confirm_social_link(link_token=link_token, password=password)
        return _auth_response(result)
    except SocialAuthError as exc:
        return _error_response(exc)
    except Exception as exc:
        return _error_response(exc)


@api_view(['GET'])
@permission_classes([AllowAny])
@authentication_classes([])
@throttle_classes([AuthBurstThrottle])
def tiktok_start(request):
    """
    Begin TikTok OAuth (authorization-code + PKCE).
    Redirects the browser to TikTok, then back to our callback.
    """
    purpose = request.query_params.get('purpose') or OAuthState.PURPOSE_LOGIN
    if purpose not in (OAuthState.PURPOSE_LOGIN, OAuthState.PURPOSE_LINK):
        purpose = OAuthState.PURPOSE_LOGIN

    client = (request.query_params.get('client') or 'web').strip().lower()
    redirect_path = _safe_redirect_path(request.query_params.get('redirect'))
    platform = _client_platform(request)
    if client == 'mobile':
        redirect_path = _encode_mobile_redirect_path(platform, redirect_path)

    log_oauth_step(provider='tiktok', step='authorization', platform=platform, status='started')

    linking_user = None
    if purpose == OAuthState.PURPOSE_LINK:
        if not request.user.is_authenticated:
            return Response({'error': 'Autenticação necessária para associar.', 'code': 'auth_required'}, status=401)
        linking_user = request.user

    try:
        url = _create_tiktok_authorize(
            purpose=purpose,
            redirect_path=redirect_path,
            linking_user=linking_user,
        )
    except ProviderVerificationError as exc:
        log_oauth_failure(
            provider='tiktok',
            step='authorization',
            platform=platform,
        )
        return _error_response(exc)

    log_oauth_step(provider='tiktok', step='authorization', platform=platform, status='redirected')
    return AppSchemeRedirect(url)


@api_view(['GET', 'POST'])
@permission_classes([AllowAny])
@authentication_classes([])
@throttle_classes([AuthBurstThrottle])
@csrf_exempt
def tiktok_callback(request):
    """TikTok OAuth callback — validate state, exchange code, create app session, redirect to app/web."""
    state = _oauth_param(request, 'state')
    oauth_state = (
        OAuthState.objects.filter(state=state, provider=SocialAccount.PROVIDER_TIKTOK).first()
        if state
        else None
    )
    client, platform, _stored_path = _parse_mobile_redirect_path(
        oauth_state.redirect_path if oauth_state else None
    )
    if not oauth_state:
        client, platform = 'web', 'web'
    code = _oauth_param(request, 'code')
    error = _oauth_param(request, 'error')
    error_description = _oauth_param(request, 'error_description')
    log_id = _oauth_param(request, 'log_id')
    log_oauth_step(
        provider='tiktok',
        step='callback',
        platform=platform,
        status='received',
        error=error or None,
        log_id=log_id,
    )
    logger.info(
        'oauth_step provider=tiktok platform=%s step=callback_received status=received has_code=%s has_state=%s has_error=%s',
        platform,
        'true' if code else 'false',
        'true' if state else 'false',
        'true' if error else 'false',
    )

    def _fail_redirect(*, cancelled: bool = False, message: str = '') -> AppSchemeRedirect:
        params = {
            'social': 'tiktok',
            'status': 'cancelled' if cancelled else 'error',
        }
        if message and not cancelled:
            params['message'] = message
        if client == 'mobile':
            return AppSchemeRedirect(f"{_post_auth_redirect_base(client='mobile')}?{urlencode(params)}")
        return AppSchemeRedirect(f"{_frontend_url('/login')}?{urlencode(params)}")

    if error:
        cancelled = error in ('access_denied', 'user_cancelled', 'login_denied')
        if not cancelled:
            provider_error = error
            if error_description:
                provider_error = f'{error}: {error_description[:120]}'
            log_oauth_failure(
                provider='tiktok',
                step='authorization_callback',
                platform=platform,
                error=provider_error,
                log_id=log_id,
            )
        if oauth_state and oauth_state.is_valid():
            oauth_state.consume()
        return _fail_redirect(
            cancelled=cancelled,
            message='Não foi possível entrar com TikTok. Tente novamente.',
        )

    if not state or not code:
        return _fail_redirect(message='Resposta OAuth inválida.')

    if not oauth_state or not oauth_state.is_valid():
        return _fail_redirect(message='Sessão de autenticação expirada.')

    oauth_state.consume()

    redirect_uri = _tiktok_redirect_uri()

    try:
        verified = exchange_tiktok_code(
            code=code,
            redirect_uri=redirect_uri,
            code_verifier=oauth_state.code_verifier,
        )
        log_oauth_step(provider='tiktok', step='token_exchange', platform=platform, status='success')
        linking_user = oauth_state.user if oauth_state.purpose == OAuthState.PURPOSE_LINK else None
        result = authenticate_social_user(verified, linking_user=linking_user)
        log_oauth_step(
            provider='tiktok',
            step='user_create_or_login',
            platform=platform,
            status='success' if result.status == 'authenticated' else result.status,
        )
    except (ProviderVerificationError, SocialAuthError) as exc:
        log_oauth_failure(
            provider='tiktok',
            step='callback_exchange',
            platform=platform,
            error=getattr(exc, 'code', None) or type(exc).__name__,
        )
        return _fail_redirect(message='Não foi possível entrar com TikTok. Tente novamente.')
    except Exception:
        logger.exception('TikTok callback failed')
        log_oauth_failure(provider='tiktok', step='callback_unexpected', platform=platform)
        return _fail_redirect(message='Não foi possível entrar com TikTok. Tente novamente.')

    client, platform, stored_redirect = _parse_mobile_redirect_path(oauth_state.redirect_path)
    dest = _safe_redirect_path(stored_redirect)

    if result.status == 'link_required':
        params = urlencode({
            'social': 'tiktok',
            'status': 'link_required',
            'link_token': result.link_token or '',
            'email': result.email or '',
            'provider': 'tiktok',
        })
        if client == 'mobile':
            return AppSchemeRedirect(f"{_post_auth_redirect_base(client='mobile')}?{params}")
        return AppSchemeRedirect(f"{_frontend_url('/login')}?{params}")

    # Hand a short-lived exchange code to the client (never put the DRF token in the URL).
    exchange = make_session_exchange_code(result.token or '')
    params = urlencode({
        'social': 'tiktok',
        'status': 'authenticated',
        'exchange_code': exchange,
        'created': '1' if result.created else '0',
        'next': dest,
    })
    return AppSchemeRedirect(f"{_post_auth_redirect_base(client=client)}?{params}")


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([AuthUserThrottle])
@csrf_exempt
def tiktok_link_start(request):
    """
    Start TikTok OAuth for linking from an authenticated web session.
    Returns JSON { authorize_url } so the browser can navigate with a prior Token auth.
    GET /tiktok/?purpose=link cannot send the DRF token as a header on a full-page redirect.
    """
    redirect_path = _safe_redirect_path(
        request.data.get('redirect') if isinstance(request.data, dict) else None
    )
    try:
        url = _create_tiktok_authorize(
            purpose=OAuthState.PURPOSE_LINK,
            redirect_path=redirect_path,
            linking_user=request.user,
        )
    except ProviderVerificationError as exc:
        log_oauth_failure(
            provider='tiktok',
            step='link_start',
            platform='web',
        )
        return _error_response(exc)
    return Response({'authorize_url': url})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@throttle_classes([AuthUserThrottle])
def login_methods(request):
    return Response(list_login_methods(request.user))


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@throttle_classes([AuthUserThrottle])
def unlink_provider(request, provider: str):
    provider = (provider or '').lower().strip()
    if provider not in (
        SocialAccount.PROVIDER_GOOGLE,
        SocialAccount.PROVIDER_FACEBOOK,
        SocialAccount.PROVIDER_TIKTOK,
        SocialAccount.PROVIDER_APPLE,
    ):
        return Response({'error': 'Fornecedor inválido.', 'code': 'invalid_provider'}, status=400)
    try:
        unlink_social_account(user=request.user, provider=provider)
        return Response({'status': 'unlinked', 'methods': list_login_methods(request.user)})
    except SocialAuthError as exc:
        return _error_response(exc)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@throttle_classes([AuthUserThrottle])
def logout_view(request):
    """Invalidate the current application token (does not log out of Google/Facebook/TikTok)."""
    Token.objects.filter(user=request.user).delete()
    return Response({'status': 'logged_out', 'message': 'Sessão terminada.'})


@api_view(['GET'])
@permission_classes([AllowAny])
def social_config(request):
    """Public client IDs / enabled flags for frontend buttons (never secrets)."""
    apple_enabled = bool(getattr(settings, 'APPLE_SIGN_IN_ENABLED', True))
    return Response({
        'google_client_id': getattr(settings, 'GOOGLE_CLIENT_ID', '') or '',
        'google_client_id_ios': getattr(settings, 'GOOGLE_CLIENT_ID_IOS', '') or '',
        # Public config exposes the first Android client ID (Play Store / primary).
        'google_client_id_android': (
            (getattr(settings, 'GOOGLE_CLIENT_ID_ANDROID', '') or '').split(',')[0].strip()
        ),
        'facebook_app_id': getattr(settings, 'FACEBOOK_APP_ID', '') or '',
        'apple_bundle_id': getattr(settings, 'APPLE_BUNDLE_ID', '') or 'com.rubianejoaquim.zenda',
        'tiktok_enabled': bool(getattr(settings, 'TIKTOK_CLIENT_KEY', None)),
        'google_enabled': bool(getattr(settings, 'GOOGLE_CLIENT_ID', None)),
        'facebook_enabled': bool(
            getattr(settings, 'FACEBOOK_APP_ID', None)
            and getattr(settings, 'FACEBOOK_APP_SECRET', None)
        ),
        # Sign in with Apple is available on iOS when capability is enabled in the app.
        'apple_enabled': apple_enabled,
    })

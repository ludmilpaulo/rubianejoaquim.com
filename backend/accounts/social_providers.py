"""
Server-side verification for Google, Facebook, and TikTok identities.

Never trust provider user IDs or emails supplied by the client without verification.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlencode

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

SAFE_PROVIDER_ERROR = 'Não foi possível validar a autenticação com o fornecedor. Tente novamente.'


def log_oauth_step(
    *,
    provider: str,
    step: str,
    platform: str = 'unknown',
    status: str = 'started',
    status_code: Optional[int] = None,
    error: Optional[str] = None,
    log_id: Optional[str] = None,
) -> None:
    """Production-safe OAuth diagnostic log. Never includes secrets, tokens, or PII."""
    err = (error or '')[:120].replace('\n', ' ')
    logger.info(
        'oauth_step provider=%s platform=%s step=%s status=%s http=%s error=%s log_id=%s',
        provider,
        platform or 'unknown',
        step,
        status,
        status_code if status_code is not None else '-',
        err or '-',
        (log_id or '-')[:80],
    )


def log_oauth_failure(
    *,
    provider: str,
    step: str,
    platform: str = 'unknown',
    status_code: Optional[int] = None,
    error: Optional[str] = None,
    log_id: Optional[str] = None,
) -> None:
    """Log OAuth failures without tokens, secrets, emails, or personal data."""
    log_oauth_step(
        provider=provider,
        step=step,
        platform=platform,
        status='failure',
        status_code=status_code,
        error=error,
        log_id=log_id,
    )


def _tiktok_error_meta(payload: object, resp: Optional[requests.Response] = None) -> tuple[str, str]:
    """Return (error_code, log_id) from a TikTok JSON body. Never includes tokens."""
    data = payload if isinstance(payload, dict) else {}
    nested = data.get('error')
    if isinstance(nested, dict):
        code = str(nested.get('code') or nested.get('message') or nested.get('error') or '')[:80]
        log_id = str(nested.get('log_id') or data.get('log_id') or '')[:80]
        return code, log_id
    code = str(nested or data.get('error_description') or '')[:80]
    log_id = str(data.get('log_id') or '')[:80]
    if not log_id and resp is not None:
        log_id = str(resp.headers.get('x-tt-logid') or resp.headers.get('X-Tt-Logid') or '')[:80]
    return code, log_id


class ProviderVerificationError(Exception):
    """Raised when a provider token/code cannot be verified."""

    def __init__(self, message: str = SAFE_PROVIDER_ERROR, *, cancelled: bool = False):
        super().__init__(message)
        self.cancelled = cancelled
        self.public_message = message


@dataclass
class VerifiedProviderUser:
    provider: str
    provider_user_id: str
    email: Optional[str] = None
    email_verified: bool = False
    first_name: str = ''
    last_name: str = ''
    full_name: str = ''
    picture_url: str = ''
    raw: Optional[dict] = None


def _split_name(full_name: str) -> tuple[str, str]:
    parts = (full_name or '').strip().split(None, 1)
    if not parts:
        return '', ''
    if len(parts) == 1:
        return parts[0], ''
    return parts[0], parts[1]


def verify_google_id_token(id_token: str) -> VerifiedProviderUser:
    """Verify a Google Identity Services ID token and return the verified subject."""
    if not id_token or not isinstance(id_token, str):
        raise ProviderVerificationError()

    # Comma-separated values allowed (e.g. Play App Signing + upload-key Android clients).
    client_ids: list[str] = []
    for raw in (
        getattr(settings, 'GOOGLE_CLIENT_ID', None),
        getattr(settings, 'GOOGLE_CLIENT_ID_IOS', None),
        getattr(settings, 'GOOGLE_CLIENT_ID_ANDROID', None),
    ):
        if not raw:
            continue
        for part in str(raw).split(','):
            cid = part.strip()
            if cid and cid not in client_ids:
                client_ids.append(cid)
    if not client_ids:
        logger.error('Google social login misconfigured: GOOGLE_CLIENT_ID missing')
        raise ProviderVerificationError('Login com Google não está configurado.')

    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests

        idinfo = google_id_token.verify_oauth2_token(
            id_token,
            google_requests.Request(),
            audience=None,
        )
    except Exception:
        log_oauth_failure(provider='google', step='id_token_verify')
        raise ProviderVerificationError() from None

    aud = idinfo.get('aud')
    if aud not in client_ids:
        log_oauth_failure(provider='google', step='audience_mismatch')
        raise ProviderVerificationError()

    iss = idinfo.get('iss')
    if iss not in ('accounts.google.com', 'https://accounts.google.com'):
        raise ProviderVerificationError()

    sub = idinfo.get('sub')
    if not sub:
        raise ProviderVerificationError()

    email = (idinfo.get('email') or '').strip().lower() or None
    email_verified = bool(idinfo.get('email_verified')) and bool(email)
    given = (idinfo.get('given_name') or '').strip()
    family = (idinfo.get('family_name') or '').strip()
    name = (idinfo.get('name') or '').strip()
    if not given and name:
        given, family = _split_name(name)

    return VerifiedProviderUser(
        provider='google',
        provider_user_id=str(sub),
        email=email,
        email_verified=email_verified,
        first_name=given,
        last_name=family,
        full_name=name,
        picture_url=(idinfo.get('picture') or '').strip(),
        raw={'iss': iss, 'aud': aud},
    )


def verify_facebook_access_token(access_token: str) -> VerifiedProviderUser:
    """Validate a Facebook user access token against Meta Graph API."""
    if not access_token or not isinstance(access_token, str):
        raise ProviderVerificationError()

    app_id = getattr(settings, 'FACEBOOK_APP_ID', None)
    app_secret = getattr(settings, 'FACEBOOK_APP_SECRET', None)
    if not app_id or not app_secret:
        logger.error('Facebook social login misconfigured')
        raise ProviderVerificationError('Login com Facebook não está configurado.')

    debug_resp = None
    try:
        debug_resp = requests.get(
            'https://graph.facebook.com/debug_token',
            params={
                'input_token': access_token,
                'access_token': f'{app_id}|{app_secret}',
            },
            timeout=10,
        )
        debug_resp.raise_for_status()
        debug_data = debug_resp.json().get('data') or {}
    except Exception:
        log_oauth_failure(
            provider='facebook',
            step='debug_token',
            status_code=getattr(debug_resp, 'status_code', None),
        )
        raise ProviderVerificationError() from None

    if not debug_data.get('is_valid'):
        log_oauth_failure(provider='facebook', step='debug_token_invalid')
        raise ProviderVerificationError()
    if str(debug_data.get('app_id')) != str(app_id):
        log_oauth_failure(provider='facebook', step='app_id_mismatch')
        raise ProviderVerificationError()

    user_id = debug_data.get('user_id')
    if not user_id:
        raise ProviderVerificationError()

    me_resp = None
    try:
        me_resp = requests.get(
            'https://graph.facebook.com/me',
            params={
                'fields': 'id,name,email,first_name,last_name,picture.type(large)',
                'access_token': access_token,
            },
            timeout=10,
        )
        me_resp.raise_for_status()
        me = me_resp.json()
    except Exception:
        log_oauth_failure(
            provider='facebook',
            step='graph_me',
            status_code=getattr(me_resp, 'status_code', None),
        )
        raise ProviderVerificationError() from None

    if str(me.get('id')) != str(user_id):
        raise ProviderVerificationError()

    email = (me.get('email') or '').strip().lower() or None
    # Facebook only returns email when granted; treat as verified when present.
    email_verified = bool(email)
    picture = ''
    pic_data = me.get('picture') or {}
    if isinstance(pic_data, dict):
        picture = ((pic_data.get('data') or {}).get('url') or '').strip()

    return VerifiedProviderUser(
        provider='facebook',
        provider_user_id=str(user_id),
        email=email,
        email_verified=email_verified,
        first_name=(me.get('first_name') or '').strip(),
        last_name=(me.get('last_name') or '').strip(),
        full_name=(me.get('name') or '').strip(),
        picture_url=picture,
        raw={'app_id': app_id},
    )


def build_tiktok_authorize_url(*, state: str, code_challenge: str, redirect_uri: str) -> str:
    client_key = getattr(settings, 'TIKTOK_CLIENT_KEY', None)
    if not client_key:
        raise ProviderVerificationError('Login com TikTok não está configurado.')

    scopes = getattr(settings, 'TIKTOK_SCOPES', 'user.info.basic')
    params = {
        'client_key': client_key,
        'scope': scopes,
        'response_type': 'code',
        'redirect_uri': redirect_uri,
        'state': state,
        'code_challenge': code_challenge,
        'code_challenge_method': 'S256',
    }
    return f'https://www.tiktok.com/v2/auth/authorize/?{urlencode(params)}'


def exchange_tiktok_code(*, code: str, redirect_uri: str, code_verifier: str) -> VerifiedProviderUser:
    """Exchange TikTok authorization code server-side and fetch verified user info."""
    client_key = getattr(settings, 'TIKTOK_CLIENT_KEY', None)
    client_secret = getattr(settings, 'TIKTOK_CLIENT_SECRET', None)
    if not client_key or not client_secret:
        logger.error('TikTok social login misconfigured')
        raise ProviderVerificationError('Login com TikTok não está configurado.')

    try:
        token_resp = requests.post(
            'https://open.tiktokapis.com/v2/oauth/token/',
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            data={
                'client_key': client_key,
                'client_secret': client_secret,
                'code': code,
                'grant_type': 'authorization_code',
                'redirect_uri': redirect_uri,
                'code_verifier': code_verifier,
            },
            timeout=15,
        )
        token_payload = token_resp.json()
    except Exception:
        log_oauth_failure(provider='tiktok', step='token_exchange_request')
        raise ProviderVerificationError() from None

    if token_resp.status_code >= 400 or token_payload.get('error'):
        err, log_id = _tiktok_error_meta(token_payload, token_resp)
        log_oauth_failure(
            provider='tiktok',
            step='token_exchange',
            status_code=token_resp.status_code,
            error=err,
            log_id=log_id,
        )
        raise ProviderVerificationError()

    access_token = token_payload.get('access_token')
    open_id = token_payload.get('open_id')
    if not access_token or not open_id:
        log_oauth_failure(provider='tiktok', step='token_exchange', error='missing_token_or_open_id')
        raise ProviderVerificationError()
    log_oauth_step(provider='tiktok', step='token_exchange', status='success')

    try:
        user_resp = requests.get(
            'https://open.tiktokapis.com/v2/user/info/',
            headers={'Authorization': f'Bearer {access_token}'},
            params={'fields': 'open_id,union_id,avatar_url,display_name'},
            timeout=10,
        )
        user_payload = user_resp.json()
    except Exception:
        log_oauth_failure(provider='tiktok', step='user_info_request')
        raise ProviderVerificationError() from None
    finally:
        # Do not retain provider access tokens
        access_token = None

    if user_resp.status_code >= 400:
        err, log_id = _tiktok_error_meta(user_payload, user_resp)
        log_oauth_failure(
            provider='tiktok',
            step='user_info',
            status_code=user_resp.status_code,
            error=err,
            log_id=log_id,
        )
        raise ProviderVerificationError()

    user_obj = ((user_payload.get('data') or {}).get('user') or {})
    provider_user_id = str(user_obj.get('open_id') or open_id)
    display_name = (user_obj.get('display_name') or '').strip()
    first_name, last_name = _split_name(display_name)

    return VerifiedProviderUser(
        provider='tiktok',
        provider_user_id=provider_user_id,
        email=None,
        email_verified=False,
        first_name=first_name,
        last_name=last_name,
        full_name=display_name,
        picture_url=(user_obj.get('avatar_url') or '').strip(),
        raw={'union_id': user_obj.get('union_id')},
    )


def verify_apple_identity_token(
    identity_token: str,
    *,
    full_name: Optional[dict] = None,
) -> VerifiedProviderUser:
    """
    Verify a Sign in with Apple identity token (JWT) against Apple's JWKS.
    Never trust client-supplied email/sub without JWT verification.
    Handles Apple's private relay emails (is_private_email claim).
    """
    if not identity_token or not isinstance(identity_token, str):
        raise ProviderVerificationError()

    bundle_id = getattr(settings, 'APPLE_BUNDLE_ID', None) or 'com.rubianejoaquim.zenda'
    # Optionally accept additional audiences (e.g. Services ID for web)
    audiences: list[str] = [bundle_id]
    extra = getattr(settings, 'APPLE_SIGN_IN_AUDIENCES', '') or ''
    for part in str(extra).split(','):
        aud = part.strip()
        if aud and aud not in audiences:
            audiences.append(aud)

    try:
        import jwt
        from jwt import PyJWKClient
    except ImportError as exc:
        logger.error('PyJWT is required for Sign in with Apple')
        raise ProviderVerificationError('Login com Apple não está configurado.') from exc

    try:
        jwks_client = PyJWKClient('https://appleid.apple.com/auth/keys', cache_keys=True)
        signing_key = jwks_client.get_signing_key_from_jwt(identity_token)
        claims = jwt.decode(
            identity_token,
            signing_key.key,
            algorithms=['RS256'],
            audience=audiences,
            issuer='https://appleid.apple.com',
            options={'verify_email': False},
        )
    except Exception:
        logger.info('Apple identity token verification failed')
        raise ProviderVerificationError() from None

    sub = claims.get('sub')
    if not sub:
        raise ProviderVerificationError()

    email = (claims.get('email') or '').strip().lower() or None
    # Apple tokens: email_verified may be bool or string "true"
    email_verified_raw = claims.get('email_verified', False)
    email_verified = bool(email) and (
        email_verified_raw is True
        or str(email_verified_raw).lower() == 'true'
    )
    # Private relay is still a real Apple-issued address for this user+app
    is_private = claims.get('is_private_email')
    if is_private is True or str(is_private).lower() == 'true':
        email_verified = bool(email)

    given = ''
    family = ''
    if isinstance(full_name, dict):
        given = str(full_name.get('givenName') or full_name.get('given_name') or '').strip()
        family = str(full_name.get('familyName') or full_name.get('family_name') or '').strip()

    return VerifiedProviderUser(
        provider='apple',
        provider_user_id=str(sub),
        email=email,
        email_verified=email_verified,
        first_name=given,
        last_name=family,
        full_name=(f'{given} {family}').strip(),
        picture_url='',
        raw={
            'iss': claims.get('iss'),
            'aud': claims.get('aud'),
            'is_private_email': claims.get('is_private_email'),
        },
    )

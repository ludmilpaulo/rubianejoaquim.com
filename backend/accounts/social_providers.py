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

    client_ids = [
        cid for cid in [
            getattr(settings, 'GOOGLE_CLIENT_ID', None),
            getattr(settings, 'GOOGLE_CLIENT_ID_IOS', None),
            getattr(settings, 'GOOGLE_CLIENT_ID_ANDROID', None),
        ]
        if cid
    ]
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
        logger.info('Google ID token verification failed')
        raise ProviderVerificationError() from None

    aud = idinfo.get('aud')
    if aud not in client_ids:
        logger.info('Google ID token audience mismatch')
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
        logger.info('Facebook debug_token failed')
        raise ProviderVerificationError() from None

    if not debug_data.get('is_valid'):
        raise ProviderVerificationError()
    if str(debug_data.get('app_id')) != str(app_id):
        raise ProviderVerificationError()

    user_id = debug_data.get('user_id')
    if not user_id:
        raise ProviderVerificationError()

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
        logger.info('Facebook /me failed')
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
        logger.info('TikTok token exchange request failed')
        raise ProviderVerificationError() from None

    if token_resp.status_code >= 400 or token_payload.get('error'):
        logger.info('TikTok token exchange rejected')
        raise ProviderVerificationError()

    access_token = token_payload.get('access_token')
    open_id = token_payload.get('open_id')
    if not access_token or not open_id:
        raise ProviderVerificationError()

    try:
        user_resp = requests.get(
            'https://open.tiktokapis.com/v2/user/info/',
            headers={'Authorization': f'Bearer {access_token}'},
            params={'fields': 'open_id,union_id,avatar_url,display_name'},
            timeout=10,
        )
        user_payload = user_resp.json()
    except Exception:
        logger.info('TikTok user info request failed')
        raise ProviderVerificationError() from None
    finally:
        # Do not retain provider access tokens
        access_token = None

    if user_resp.status_code >= 400:
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

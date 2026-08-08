"""
Shared social authentication service.

All providers (Google, Facebook, TikTok) resolve to the same User + DRF Token session.
Identity is based on verified provider_user_id, never on client-supplied email alone.
"""

from __future__ import annotations

import logging
import re
import secrets
from dataclasses import dataclass
from typing import Optional

from django.core import signing
from django.db import transaction
from django.utils import timezone
from rest_framework.authtoken.models import Token

from .models import SocialAccount, User
from .social_providers import VerifiedProviderUser

logger = logging.getLogger(__name__)

LINK_TOKEN_SALT = 'accounts.social.link'
LINK_TOKEN_MAX_AGE = 60 * 10  # 10 minutes


class SocialAuthError(Exception):
    def __init__(self, message: str, *, code: str = 'social_auth_error', status: int = 400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status = status


@dataclass
class SocialAuthResult:
    status: str  # authenticated | link_required | email_required
    user: Optional[User] = None
    token: Optional[str] = None
    created: bool = False
    link_token: Optional[str] = None
    email: Optional[str] = None
    provider: Optional[str] = None
    message: Optional[str] = None


def _unique_username(base: str) -> str:
    cleaned = re.sub(r'[^a-zA-Z0-9._-]', '', (base or '').lower())[:24]
    if not cleaned:
        cleaned = 'user'
    candidate = cleaned
    n = 0
    while User.objects.filter(username=candidate).exists():
        n += 1
        suffix = f'_{n}'
        candidate = f'{cleaned[: 150 - len(suffix)]}{suffix}'
    return candidate


def _issue_token(user: User) -> str:
    token, _ = Token.objects.get_or_create(user=user)
    user.last_login = timezone.now()
    user.save(update_fields=['last_login'])
    return token.key


def _make_link_token(*, user_id: int, provider: str, provider_user_id: str, provider_email: Optional[str]) -> str:
    payload = {
        'uid': user_id,
        'provider': provider,
        'provider_user_id': provider_user_id,
        'provider_email': provider_email or '',
        'nonce': secrets.token_hex(8),
    }
    return signing.dumps(payload, salt=LINK_TOKEN_SALT)


def parse_link_token(link_token: str) -> dict:
    try:
        return signing.loads(link_token, salt=LINK_TOKEN_SALT, max_age=LINK_TOKEN_MAX_AGE)
    except signing.BadSignature as exc:
        raise SocialAuthError(
            'Pedido de associação expirado ou inválido. Tente novamente.',
            code='invalid_link_token',
        ) from exc


def _apply_profile_defaults(user: User, verified: VerifiedProviderUser, *, is_new: bool) -> list[str]:
    """Fill empty profile fields from provider data; never overwrite customized values."""
    updates: list[str] = []
    if is_new or not user.first_name:
        if verified.first_name:
            user.first_name = verified.first_name[:150]
            updates.append('first_name')
    if is_new or not user.last_name:
        if verified.last_name:
            user.last_name = verified.last_name[:150]
            updates.append('last_name')
    if verified.picture_url and not user.profile_image_url and not user.profile_photo:
        user.profile_image_url = verified.picture_url[:500]
        updates.append('profile_image_url')
    if verified.email_verified and verified.email and not user.email_verified:
        user.email_verified = True
        updates.append('email_verified')
    return updates


@transaction.atomic
def authenticate_social_user(
    verified: VerifiedProviderUser,
    *,
    linking_user: Optional[User] = None,
) -> SocialAuthResult:
    """
    Resolve a verified provider identity to an application user + session token.

    Rules:
    1. Existing SocialAccount(provider, provider_user_id) → log in that user
    2. Authenticated linking_user → attach provider (fail if already linked elsewhere)
    3. Verified email matches existing user → require explicit password link
    4. Otherwise create a new user (+ social account)
    """
    if not verified.provider_user_id:
        raise SocialAuthError('Identidade do fornecedor inválida.', code='invalid_identity')

    existing = (
        SocialAccount.objects.select_related('user')
        .filter(provider=verified.provider, provider_user_id=verified.provider_user_id)
        .first()
    )

    if existing:
        user = existing.user
        if not user.is_active:
            raise SocialAuthError('Conta desativada.', code='inactive', status=403)
        if linking_user and linking_user.pk != user.pk:
            raise SocialAuthError(
                'Esta conta social já está associada a outro utilizador.',
                code='provider_already_linked',
                status=409,
            )
        # Refresh non-destructive metadata
        changed = False
        if verified.email and existing.provider_email != verified.email:
            existing.provider_email = verified.email
            changed = True
        updates = _apply_profile_defaults(user, verified, is_new=False)
        if updates:
            user.save(update_fields=updates + ['updated_at'])
        if changed:
            existing.save(update_fields=['provider_email', 'updated_at'])
        token = _issue_token(user)
        return SocialAuthResult(status='authenticated', user=user, token=token, created=False, provider=verified.provider)

    if linking_user:
        if not linking_user.is_active:
            raise SocialAuthError('Conta desativada.', code='inactive', status=403)
        if SocialAccount.objects.filter(user=linking_user, provider=verified.provider).exists():
            raise SocialAuthError(
                f'Já tem {verified.provider} associado a esta conta.',
                code='already_linked',
                status=409,
            )
        SocialAccount.objects.create(
            user=linking_user,
            provider=verified.provider,
            provider_user_id=verified.provider_user_id,
            provider_email=verified.email,
            provider_data={'name': verified.full_name} if verified.full_name else {},
        )
        updates = _apply_profile_defaults(linking_user, verified, is_new=False)
        if verified.email and not linking_user.email:
            linking_user.email = verified.email
            updates.append('email')
        if updates:
            linking_user.save(update_fields=list(dict.fromkeys(updates + ['updated_at'])))
        token = _issue_token(linking_user)
        return SocialAuthResult(
            status='authenticated',
            user=linking_user,
            token=token,
            created=False,
            provider=verified.provider,
            message='Conta social associada com sucesso.',
        )

    # Email collision with an existing account — require explicit link (never auto-merge)
    if verified.email and verified.email_verified:
        email_owner = User.objects.filter(email__iexact=verified.email, is_active=True).first()
        if email_owner:
            link_token = _make_link_token(
                user_id=email_owner.pk,
                provider=verified.provider,
                provider_user_id=verified.provider_user_id,
                provider_email=verified.email,
            )
            return SocialAuthResult(
                status='link_required',
                user=None,
                token=None,
                link_token=link_token,
                email=verified.email,
                provider=verified.provider,
                message=(
                    'Já existe uma conta com este email. '
                    'Introduza a palavra-passe para associar este método de login.'
                ),
            )

    # New social user — email optional (e.g. TikTok basic scope)
    if not verified.email and verified.provider == 'tiktok':
        # Create account keyed only by provider id; client may collect email later
        pass

    base_username = ''
    if verified.email:
        base_username = verified.email.split('@')[0]
    elif verified.full_name:
        base_username = verified.full_name
    else:
        base_username = f'{verified.provider}_{verified.provider_user_id[:12]}'

    user = User(
        email=verified.email,
        username=_unique_username(base_username),
        first_name=(verified.first_name or '')[:150],
        last_name=(verified.last_name or '')[:150],
        email_verified=bool(verified.email_verified and verified.email),
        profile_image_url=(verified.picture_url or '')[:500],
    )
    user.set_unusable_password()
    user.save()

    SocialAccount.objects.create(
        user=user,
        provider=verified.provider,
        provider_user_id=verified.provider_user_id,
        provider_email=verified.email,
        provider_data={'name': verified.full_name} if verified.full_name else {},
    )

    token = _issue_token(user)
    logger.info(
        'Created social user id=%s provider=%s',
        user.pk,
        verified.provider,
    )
    return SocialAuthResult(
        status='authenticated',
        user=user,
        token=token,
        created=True,
        provider=verified.provider,
    )


@transaction.atomic
def confirm_social_link(*, link_token: str, password: str) -> SocialAuthResult:
    """Prove ownership of an existing email/password account, then attach the social identity."""
    payload = parse_link_token(link_token)
    try:
        user = User.objects.get(pk=payload['uid'], is_active=True)
    except User.DoesNotExist as exc:
        raise SocialAuthError('Conta não encontrada.', code='not_found', status=404) from exc

    if not user.has_usable_password() or not user.check_password(password):
        raise SocialAuthError('Palavra-passe incorreta.', code='invalid_password', status=400)

    provider = payload['provider']
    provider_user_id = payload['provider_user_id']
    provider_email = (payload.get('provider_email') or '').strip().lower() or None

    if SocialAccount.objects.filter(provider=provider, provider_user_id=provider_user_id).exists():
        raise SocialAuthError(
            'Esta conta social já está associada.',
            code='provider_already_linked',
            status=409,
        )
    if SocialAccount.objects.filter(user=user, provider=provider).exists():
        raise SocialAuthError(
            f'Já tem {provider} associado a esta conta.',
            code='already_linked',
            status=409,
        )

    SocialAccount.objects.create(
        user=user,
        provider=provider,
        provider_user_id=provider_user_id,
        provider_email=provider_email,
    )
    if provider_email and user.email and user.email.lower() == provider_email:
        if not user.email_verified:
            user.email_verified = True
            user.save(update_fields=['email_verified', 'updated_at'])

    token = _issue_token(user)
    return SocialAuthResult(
        status='authenticated',
        user=user,
        token=token,
        created=False,
        provider=provider,
        message='Método de login associado com sucesso.',
    )


@transaction.atomic
def unlink_social_account(*, user: User, provider: str) -> None:
    account = SocialAccount.objects.filter(user=user, provider=provider).first()
    if not account:
        raise SocialAuthError('Este método de login não está associado.', code='not_linked', status=404)

    has_password = user.has_usable_password()
    other_social = SocialAccount.objects.filter(user=user).exclude(pk=account.pk).exists()
    if not has_password and not other_social:
        raise SocialAuthError(
            'Não pode remover o único método de login. Associe outro método ou defina uma palavra-passe primeiro.',
            code='last_login_method',
            status=400,
        )
    account.delete()


def list_login_methods(user: User) -> dict:
    linked = set(SocialAccount.objects.filter(user=user).values_list('provider', flat=True))
    return {
        'email': bool(user.email and user.has_usable_password()),
        'email_address': user.email,
        'email_verified': bool(user.email_verified),
        'google': 'google' in linked,
        'facebook': 'facebook' in linked,
        'tiktok': 'tiktok' in linked,
        'providers': sorted(linked),
    }

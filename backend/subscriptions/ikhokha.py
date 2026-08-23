"""
iKhokha iK Pay API client.

Credentials stay on the Django server. Never log secrets or include them in responses.
Official docs: https://developer.ikhokha.com/overview
"""
import hashlib
import hmac
import json
import logging
from dataclasses import dataclass
from decimal import Decimal
from urllib.parse import urlparse

import requests
from django.conf import settings

from .billing import get_ikhokha_config_row
from .models import PaymentGatewayConfig

logger = logging.getLogger(__name__)

DEFAULT_API_BASE = 'https://api.ikhokha.com/public-api/v1'
DEFAULT_PAYMENT_URL = 'https://api.ikhokha.com/public-api/v1/api/payment'
DEFAULT_CALLBACK_PATH = '/api/subscriptions/ikhokha/webhook/'


def canonical_ikhokha_urls() -> dict[str, str]:
    """Fixed iK Pay endpoints — not overridden by admin form or DB URL fields."""
    api_base = (getattr(settings, 'IKHOKHA_API_BASE_URL', None) or '').strip() or DEFAULT_API_BASE
    payment_url = (getattr(settings, 'IKHOKHA_PAYMENT_URL', None) or '').strip() or DEFAULT_PAYMENT_URL
    callback_url = (getattr(settings, 'IKHOKHA_CALLBACK_URL', None) or '').strip()
    if not callback_url:
        api_public = getattr(settings, 'API_PUBLIC_URL', '').rstrip('/')
        if api_public:
            callback_url = f'{api_public}{DEFAULT_CALLBACK_PATH}'
    return {
        'api_base_url': api_base.rstrip('/'),
        'payment_url': payment_url,
        'callback_url': callback_url,
    }


class IkhokhaError(Exception):
    """Safe error for callers — message must never contain secrets."""


@dataclass
class IkhokhaCredentials:
    app_id: str
    app_secret: str
    environment: str
    api_base_url: str
    payment_url: str
    callback_url: str
    is_active: bool

    @property
    def mode(self) -> str:
        return 'live' if self.environment == PaymentGatewayConfig.ENV_PRODUCTION else 'test'


def _js_string_escape(value: str) -> str:
    return (
        value.replace('\\', '\\\\')
        .replace('"', '\\"')
        .replace("'", "\\'")
        .replace('\x00', '\\0')
    )


def sign_payload(url: str, body: str, app_secret: str) -> str:
    parsed = urlparse(url)
    path = parsed.path or ''
    if parsed.query:
        path = f'{path}?{parsed.query}'
    payload = _js_string_escape(path + (body or ''))
    return hmac.new(
        app_secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256,
    ).hexdigest()


def compact_json(payload: dict) -> str:
    return json.dumps(payload, separators=(',', ':'), ensure_ascii=False)


def _pick_str(override: dict | None, key: str, fallback: str = '') -> str:
    if not override or key not in override:
        return fallback
    return (override.get(key) or '').strip()


def resolve_ikhokha_credentials(override: dict | None = None) -> IkhokhaCredentials | None:
    """Load credentials from DB/env, optionally overridden by unsaved admin form values."""
    saved = load_ikhokha_credentials()
    urls = canonical_ikhokha_urls()
    if not override:
        return saved

    row = get_ikhokha_config_row()
    app_id = _pick_str(override, 'app_id', saved.app_id if saved else '')
    app_secret = _pick_str(override, 'app_secret', saved.app_secret if saved else '')
    environment = _pick_str(override, 'environment', saved.environment if saved else PaymentGatewayConfig.ENV_PRODUCTION)

    if environment not in (PaymentGatewayConfig.ENV_SANDBOX, PaymentGatewayConfig.ENV_PRODUCTION):
        environment = saved.environment if saved else PaymentGatewayConfig.ENV_PRODUCTION

    if not app_id and row:
        app_id = (row.app_id or '').strip()
    if not app_secret and row:
        app_secret = (row.get_app_secret() or '').strip()

    if not app_id or not app_secret:
        return None

    is_active = saved.is_active if saved is not None else bool(row and row.is_active)
    if 'is_active' in (override or {}):
        is_active = bool(override.get('is_active'))

    return IkhokhaCredentials(
        app_id=app_id,
        app_secret=app_secret,
        environment=environment,
        api_base_url=urls['api_base_url'],
        payment_url=urls['payment_url'],
        callback_url=urls['callback_url'],
        is_active=is_active,
    )


def load_ikhokha_credentials() -> IkhokhaCredentials | None:
    row = get_ikhokha_config_row()
    urls = canonical_ikhokha_urls()
    app_id = ''
    app_secret = ''
    environment = PaymentGatewayConfig.ENV_PRODUCTION
    is_active = False

    if row:
        app_id = (row.app_id or '').strip()
        app_secret = (row.get_app_secret() or '').strip()
        environment = row.environment or environment
        is_active = row.is_active

    if not app_id:
        app_id = (getattr(settings, 'IKHOKHA_APP_ID', None) or '').strip()
    if not app_secret:
        app_secret = (getattr(settings, 'IKHOKHA_APP_SECRET', None) or '').strip()
    env_setting = (getattr(settings, 'IKHOKHA_ENVIRONMENT', None) or '').strip().lower()
    if env_setting in (PaymentGatewayConfig.ENV_SANDBOX, PaymentGatewayConfig.ENV_PRODUCTION) and not row:
        environment = env_setting

    if not app_id or not app_secret:
        return None
    active = is_active if row is not None else True
    return IkhokhaCredentials(
        app_id=app_id,
        app_secret=app_secret,
        environment=environment,
        api_base_url=urls['api_base_url'],
        payment_url=urls['payment_url'],
        callback_url=urls['callback_url'],
        is_active=active,
    )


def ikhokha_configured() -> bool:
    creds = load_ikhokha_credentials()
    return bool(creds and creds.is_active)


def _network_error_message(exc: requests.RequestException) -> str:
    detail = str(exc).lower()
    if any(token in detail for token in ('403', 'proxy', 'tunnel', 'forbidden', 'connection refused', 'nodename')):
        return (
            'This server cannot reach api.ikhokha.com. On PythonAnywhere free accounts, '
            'outbound APIs must be allowlisted — request api.ikhokha.com at '
            'help.pythonanywhere.com (iK Pay docs: developer.ikhokha.com), or upgrade to a paid plan.'
        )
    if 'timeout' in detail or 'timed out' in detail:
        return 'Payment gateway timed out. Try again or check server outbound network access.'
    return 'Payment gateway unavailable from this server. Check outbound HTTPS to api.ikhokha.com.'


def _request(method: str, url: str, creds: IkhokhaCredentials, payload: dict | None = None, timeout: int = 20):
    body = compact_json(payload) if payload is not None else ''
    signature = sign_payload(url, body, creds.app_secret)
    headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'IK-APPID': creds.app_id,
        'IK-SIGN': signature,
    }
    try:
        if method == 'GET':
            response = requests.get(url, headers=headers, timeout=timeout)
        else:
            response = requests.post(url, headers=headers, data=body.encode('utf-8'), timeout=timeout)
    except requests.RequestException as exc:
        logger.exception('iKhokha request failed')
        raise IkhokhaError(_network_error_message(exc))
    if response.status_code >= 400:
        logger.warning('iKhokha HTTP %s', response.status_code)
        if response.status_code in (401, 403):
            raise IkhokhaError('Invalid iKhokha credentials')
        raise IkhokhaError('Payment gateway request failed')
    try:
        return response.json()
    except ValueError:
        logger.warning('iKhokha returned non-JSON')
        raise IkhokhaError('Payment gateway returned an invalid response')


def create_payment_link(
    *,
    amount: Decimal,
    currency: str,
    external_id: str,
    description: str,
    success_url: str,
    failure_url: str,
    cancel_url: str,
    requester_url: str,
) -> dict:
    creds = load_ikhokha_credentials()
    if not creds or not creds.is_active:
        raise IkhokhaError('Card payments are not configured')
    from .billing import amount_to_cents
    payload = {
        'entityID': creds.app_id,
        'amount': amount_to_cents(amount),
        'currency': currency,
        'requesterUrl': requester_url,
        'mode': creds.mode,
        'description': description[:200],
        'externalTransactionID': external_id,
        'urls': {
            'callbackUrl': creds.callback_url,
            'successPageUrl': success_url,
            'failurePageUrl': failure_url,
            'cancelUrl': cancel_url,
        },
    }
    data = _request('POST', creds.payment_url, creds, payload)
    response_code = str(data.get('responseCode') or '')
    paylink_url = data.get('paylinkUrl') or ''
    paylink_id = data.get('paylinkID') or data.get('paylinkId') or ''
    if response_code not in ('00', '0', '') or not paylink_url:
        logger.warning('iKhokha create paylink rejected')
        raise IkhokhaError('Could not start card payment')
    return {
        'paylink_url': paylink_url,
        'paylink_id': paylink_id,
        'external_id': data.get('externalTransactionID') or external_id,
        'response_code': response_code,
    }


def get_payment_status(*, paylink_id: str = '', external_id: str = '') -> dict:
    creds = load_ikhokha_credentials()
    if not creds:
        raise IkhokhaError('Card payments are not configured')
    if paylink_id:
        url = f'{creds.api_base_url}/api/getStatus/{paylink_id}'
    elif external_id:
        url = f'{creds.api_base_url}/api/getStatus/external?externalReference={external_id}'
    else:
        raise IkhokhaError('Missing payment reference')
    data = _request('GET', url, creds)
    return {
        'paylink_id': data.get('paylinkID') or data.get('paylinkId') or paylink_id,
        'status': str(data.get('status') or '').upper(),
        'amount': data.get('amount'),
        'description': data.get('description') or '',
        'raw_status': str(data.get('status') or ''),
    }


def test_connection(override: dict | None = None) -> dict:
    """Verify credentials without exposing secrets or raw provider errors."""
    creds = resolve_ikhokha_credentials(override)
    if not creds:
        return {
            'ok': False,
            'message': 'Enter your Application ID and Secret Key, then test again.',
        }
    if not creds.callback_url:
        return {
            'ok': False,
            'message': 'Callback URL is not configured. Set API_PUBLIC_URL on the server.',
        }

    import uuid
    frontend = getattr(settings, 'FRONTEND_URL', 'https://www.rubianejoaquim.com').rstrip('/')
    test_external = f'TEST-{uuid.uuid4().hex[:12].upper()}'
    payload = {
        'entityID': creds.app_id,
        'amount': 100,
        'currency': 'ZAR',
        'requesterUrl': frontend,
        'mode': creds.mode,
        'description': 'Zenda connection test',
        'externalTransactionID': test_external,
        'urls': {
            'callbackUrl': creds.callback_url,
            'successPageUrl': f'{frontend}/payments/ikhokha/success?payment={test_external}',
            'failurePageUrl': f'{frontend}/payments/ikhokha/failure?payment={test_external}',
            'cancelUrl': f'{frontend}/payments/ikhokha/cancel?payment={test_external}',
        },
    }
    try:
        data = _request('POST', creds.payment_url, creds, payload, timeout=20)
    except IkhokhaError as exc:
        message = str(exc)
        if 'api.ikhokha.com' in message or 'allowlisted' in message or 'timed out' in message:
            return {'ok': False, 'message': message}
        if message == 'Invalid iKhokha credentials':
            hint = 'Check Application ID and Secret Key from the iKhokha Merchant Dashboard.'
        elif creds.environment == PaymentGatewayConfig.ENV_SANDBOX:
            hint = 'Merchant Dashboard credentials usually require Environment = Production (live mode).'
        else:
            hint = 'Please verify your iKhokha credentials and try again.'
        return {'ok': False, 'message': f'{message}. {hint}' if message != hint else hint}

    response_code = str(data.get('responseCode') or '')
    paylink_url = data.get('paylinkUrl') or ''
    if response_code not in ('00', '0', '') or not paylink_url:
        msg = 'iKhokha rejected the test payment link.'
        if creds.environment == PaymentGatewayConfig.ENV_SANDBOX:
            msg += ' Try Environment = Production for live Merchant Dashboard keys.'
        return {'ok': False, 'message': msg}

    return {
        'ok': True,
        'message': 'iKhokha connection successful',
        'environment': 'Production' if creds.environment == PaymentGatewayConfig.ENV_PRODUCTION else 'Sandbox',
        'merchant': f'****{(creds.app_id or "")[-4:]}' if creds.app_id else '',
        'api': 'Connected',
        'webhook': creds.callback_url,
        'mode': creds.mode,
        'payment_url': creds.payment_url,
    }


def verify_webhook_signature(callback_url: str, raw_body: bytes, provided_sign: str, provided_app_id: str) -> bool:
    creds = load_ikhokha_credentials()
    if not creds:
        return False
    if provided_app_id and provided_app_id.strip() != creds.app_id:
        return False
    body = raw_body.decode('utf-8') if raw_body else ''
    expected = sign_payload(callback_url, body, creds.app_secret)
    provided = (provided_sign or '').strip()
    if hmac.compare_digest(expected, provided):
        return True
    parsed = urlparse(callback_url)
    if parsed.path:
        expected_path = sign_payload(parsed.path, body, creds.app_secret)
        if hmac.compare_digest(expected_path, provided):
            return True
    return False

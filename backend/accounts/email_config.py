"""Resolve SMTP settings from admin DB config with env fallbacks."""
import os

from django.conf import settings

from .models import EmailServerConfig

DEFAULT_SMTP_HOST = 'smtpout.secureserver.net'
DEFAULT_FROM = 'Rubiane Joaquim <noreply@rubianejoaquim.com>'


def _on_pythonanywhere() -> bool:
    return bool(os.environ.get('PYTHONANYWHERE_DOMAIN'))


def _env_bool(name: str, default: str = 'false') -> bool:
    raw = os.environ.get(name, default)
    return str(raw).strip().lower() in ('1', 'true', 'yes', 'on')


def default_smtp_transport() -> dict[str, int | bool]:
    if _on_pythonanywhere():
        return {'port': 587, 'use_tls': True, 'use_ssl': False}
    return {
        'port': int(os.environ.get('EMAIL_PORT', '587')),
        'use_tls': _env_bool('EMAIL_USE_TLS', 'true'),
        'use_ssl': _env_bool('EMAIL_USE_SSL', 'false'),
    }


def get_email_config_row() -> EmailServerConfig | None:
    return EmailServerConfig.objects.filter(pk=1).first()


def get_email_config_row_or_create() -> EmailServerConfig:
    row, _ = EmailServerConfig.objects.get_or_create(
        pk=1,
        defaults={
            'email_host': getattr(settings, 'EMAIL_HOST', DEFAULT_SMTP_HOST),
            'email_host_user': getattr(settings, 'EMAIL_HOST_USER', ''),
            'default_from_email': getattr(settings, 'DEFAULT_FROM_EMAIL', DEFAULT_FROM),
        },
    )
    return row


def resolve_smtp_connection_kwargs() -> dict[str, str | int | bool]:
    """Connection kwargs for Django SMTP backend."""
    transport = default_smtp_transport()
    host = getattr(settings, 'EMAIL_HOST', DEFAULT_SMTP_HOST)
    username = getattr(settings, 'EMAIL_HOST_USER', '')
    password = getattr(settings, 'EMAIL_HOST_PASSWORD', '')
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', DEFAULT_FROM)
    timeout = int(getattr(settings, 'EMAIL_TIMEOUT', 30))

    row = get_email_config_row()
    if row and row.is_active:
        host = (row.email_host or host).strip() or host
        username = (row.email_host_user or username).strip() or username
        db_password = row.get_password()
        if db_password:
            password = db_password
        from_email = (row.default_from_email or from_email).strip() or from_email
        if row.email_port is not None:
            transport['port'] = row.email_port
        if row.use_tls is not None:
            transport['use_tls'] = row.use_tls
        if row.use_ssl is not None:
            transport['use_ssl'] = row.use_ssl

    return {
        'host': host,
        'port': int(transport['port']),
        'username': username,
        'password': password,
        'use_tls': bool(transport['use_tls']),
        'use_ssl': bool(transport['use_ssl']),
        'timeout': timeout,
        'from_email': from_email,
    }


def apply_email_settings() -> None:
    """Sync django.conf.settings from DB/env SMTP config (call after admin save)."""
    params = resolve_smtp_connection_kwargs()
    settings.EMAIL_HOST = str(params['host'])
    settings.EMAIL_PORT = int(params['port'])
    settings.EMAIL_HOST_USER = str(params['username'])
    settings.EMAIL_HOST_PASSWORD = str(params['password'])
    settings.EMAIL_USE_TLS = bool(params['use_tls'])
    settings.EMAIL_USE_SSL = bool(params['use_ssl'])
    settings.EMAIL_TIMEOUT = int(params['timeout'])
    settings.DEFAULT_FROM_EMAIL = str(params['from_email'])


def smtp_configured() -> bool:
    params = resolve_smtp_connection_kwargs()
    return bool(params.get('username') and params.get('password'))


def test_smtp_connection(*, override: dict | None = None, recipient: str) -> dict:
    from django.core.mail import EmailMessage
    from accounts.email_backends import ConfigurableEmailBackend

    params = resolve_smtp_connection_kwargs()
    if override:
        if override.get('email_host'):
            params['host'] = str(override['email_host']).strip()
        if override.get('email_host_user'):
            params['username'] = str(override['email_host_user']).strip()
        if override.get('default_from_email'):
            params['from_email'] = str(override['default_from_email']).strip()
        if override.get('email_host_password'):
            params['password'] = str(override['email_host_password'])
        if override.get('email_port') is not None:
            params['port'] = int(override['email_port'])
        if override.get('use_tls') is not None:
            params['use_tls'] = bool(override['use_tls'])
        if override.get('use_ssl') is not None:
            params['use_ssl'] = bool(override['use_ssl'])

    if not params.get('username') or not params.get('password'):
        return {
            'ok': False,
            'message': 'Enter SMTP username and password, then test again.',
        }

    backend = ConfigurableEmailBackend(
        host=str(params['host']),
        port=int(params['port']),
        username=str(params['username']),
        password=str(params['password']),
        use_tls=bool(params['use_tls']),
        use_ssl=bool(params['use_ssl']),
        timeout=int(params['timeout']),
        fail_silently=False,
    )
    msg = EmailMessage(
        subject='Zenda SMTP test',
        body='This is a test email from the Zenda admin dashboard.',
        from_email=str(params['from_email'] or params['username']),
        to=[recipient],
        connection=backend,
    )
    try:
        msg.send(fail_silently=False)
    except Exception:
        return {
            'ok': False,
            'message': (
                'Could not send test email. On PythonAnywhere use port 587 with TLS '
                '(GoDaddy smtpout.secureserver.net). Check username and password.'
            ),
        }
    return {
        'ok': True,
        'message': f'Test email sent to {recipient}.',
        'host': params['host'],
        'port': params['port'],
        'from_email': params['from_email'],
    }

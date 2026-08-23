"""SMTP backend that reads live settings from admin EmailServerConfig."""
from django.core.mail.backends.smtp import EmailBackend as SmtpEmailBackend

from .email_config import resolve_smtp_connection_kwargs


class ConfigurableEmailBackend(SmtpEmailBackend):
    def __init__(self, host=None, port=None, username=None, password=None, use_tls=None, use_ssl=None, timeout=None, **kwargs):
        if host is None and port is None and username is None and password is None:
            params = resolve_smtp_connection_kwargs()
            host = params['host']
            port = params['port']
            username = params['username']
            password = params['password']
            use_tls = params['use_tls']
            use_ssl = params['use_ssl']
            timeout = params['timeout']
        super().__init__(
            host=host,
            port=port,
            username=username,
            password=password,
            use_tls=use_tls,
            use_ssl=use_ssl,
            timeout=timeout,
            **kwargs,
        )

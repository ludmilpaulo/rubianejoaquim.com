"""Admin API for SMTP email configuration."""
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from subscriptions.permissions import IsStaffAdmin

from .email_config import (
    apply_email_settings,
    default_smtp_transport,
    get_email_config_row_or_create,
    test_smtp_connection,
)
from .models import EmailServerConfig


def _public_payload(row: EmailServerConfig) -> dict:
    transport = default_smtp_transport()
    port = row.email_port if row.email_port is not None else transport['port']
    use_tls = row.use_tls if row.use_tls is not None else transport['use_tls']
    use_ssl = row.use_ssl if row.use_ssl is not None else transport['use_ssl']
    return {
        'is_active': row.is_active,
        'email_host': row.email_host,
        'email_host_user': row.email_host_user,
        'default_from_email': row.default_from_email,
        'email_port': port,
        'use_tls': use_tls,
        'use_ssl': use_ssl,
        'password_set': bool(row.get_password()),
        'transport_auto': row.email_port is None and row.use_tls is None and row.use_ssl is None,
        'updated_at': row.updated_at,
    }


class AdminEmailConfigViewSet(viewsets.ViewSet):
    permission_classes = [IsStaffAdmin]

    def list(self, request):
        row = get_email_config_row_or_create()
        return Response(_public_payload(row))

    @action(detail=False, methods=['patch', 'put'], url_path='update')
    def update_config(self, request):
        data = request.data or {}
        row = get_email_config_row_or_create()

        if 'is_active' in data:
            row.is_active = bool(data['is_active'])
        if 'email_host' in data:
            row.email_host = (data.get('email_host') or '').strip() or row.email_host
        if 'email_host_user' in data:
            row.email_host_user = (data.get('email_host_user') or '').strip()
        if 'default_from_email' in data:
            row.default_from_email = (data.get('default_from_email') or '').strip()
        if 'email_port' in data and data['email_port'] not in (None, ''):
            row.email_port = int(data['email_port'])
        if 'use_tls' in data and data['use_tls'] is not None:
            row.use_tls = bool(data['use_tls'])
        if 'use_ssl' in data and data['use_ssl'] is not None:
            row.use_ssl = bool(data['use_ssl'])
        if data.get('reset_transport'):
            row.email_port = None
            row.use_tls = None
            row.use_ssl = None

        password = (data.get('email_host_password') or '').strip()
        if password:
            row.email_host_password = password

        row.updated_by = request.user
        row.save()
        apply_email_settings()
        return Response(_public_payload(row))

    @action(detail=False, methods=['post'], url_path='test')
    def test_connection(self, request):
        data = request.data or {}
        recipient = (data.get('recipient') or request.user.email or '').strip()
        if not recipient:
            return Response(
                {'ok': False, 'message': 'No recipient email. Add an email to your admin account.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        override = {}
        for key in (
            'email_host',
            'email_host_user',
            'default_from_email',
            'email_host_password',
            'email_port',
            'use_tls',
            'use_ssl',
        ):
            if key in data and data[key] not in (None, ''):
                override[key] = data[key]

        result = test_smtp_connection(override=override or None, recipient=recipient)
        if result.get('ok'):
            return Response(result)
        return Response(result, status=status.HTTP_400_BAD_REQUEST)

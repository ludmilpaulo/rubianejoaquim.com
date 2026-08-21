"""
Admin API for mobile app subscriptions and payment proofs.
Staff/superuser can list subscriptions, list payment proofs, approve/reject proofs,
manage plans, export, and review analytics.
"""
import csv
import io
import logging
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from accounts.models import User

from .audit import record_admin_action
from .models import (
    MobileAppSubscription,
    MobileAppSubscriptionPaymentProof,
    PaymentGatewayConfig,
    SubscriptionAdminAuditLog,
    SubscriptionPayment,
)
from .permissions import IsStaffAdmin
from .serializers import (
    AdminAuditLogSerializer,
    AdminMobileAppSubscriptionDetailSerializer,
    AdminMobileAppSubscriptionPaymentProofSerializer,
    AdminMobileAppSubscriptionSerializer,
    AdminSubscriptionPaymentSerializer,
    BillingSettingsSerializer,
    PaymentGatewayConfigPublicSerializer,
    PaymentGatewayConfigWriteSerializer,
)
from .services import (
    apply_proof_filters,
    apply_subscription_filters,
    build_analytics,
    default_currency,
    effective_amount,
    effective_currency,
    monthly_price,
    subscription_queryset,
)
from .tiers import PLAN_TIERS
from .billing import get_billing_settings, get_ikhokha_config_row
from .ikhokha import test_connection as ikhokha_test_connection
from .payments import (
    create_proof_ledger,
    fulfill_paid_payment,
    mark_payment_failed,
)

logger = logging.getLogger(__name__)


class AdminPagePagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


def _extend_subscription(sub, days=30):
    now = timezone.now()
    if sub.subscription_ends_at and sub.subscription_ends_at > now:
        sub.subscription_ends_at += timedelta(days=days)
    else:
        sub.subscription_ends_at = now + timedelta(days=days)
    sub.status = 'active'
    sub.paused_at = None
    sub.expiry_reminder_sent_at = None
    sub.reminder_7d_sent_at = None
    sub.reminder_3d_sent_at = None
    sub.reminder_1d_sent_at = None
    sub.save()
    return sub


def _send_customer_email(user, subject, body):
    if not user.email:
        return False, 'no_email'
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@rubianejoaquim.com')
    try:
        send_mail(subject, body, from_email, [user.email], fail_silently=False)
        return True, 'sent'
    except Exception:
        logger.exception('Failed to send subscription admin email to %s', user.email)
        return False, 'send_failed'


class AdminMobileAppSubscriptionViewSet(viewsets.ReadOnlyModelViewSet):
    """List and manage mobile app subscriptions (admin only)."""
    queryset = MobileAppSubscription.objects.all().select_related('user').order_by('-created_at')
    serializer_class = AdminMobileAppSubscriptionSerializer
    permission_classes = [IsStaffAdmin]
    pagination_class = AdminPagePagination

    def get_queryset(self):
        return subscription_queryset()

    def filter_queryset(self, queryset):
        if self.action in ('list', 'export'):
            return apply_subscription_filters(queryset, self.request.query_params)
        return queryset

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AdminMobileAppSubscriptionDetailSerializer
        return AdminMobileAppSubscriptionSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    @action(detail=False, methods=['get'], url_path='analytics')
    def analytics(self, request):
        revenue_range = request.query_params.get('range') or '6m'
        return Response(build_analytics(revenue_range))

    @action(detail=False, methods=['get'], url_path='search-users')
    def search_users(self, request):
        q = (request.query_params.get('q') or '').strip()
        qs = User.objects.all().order_by('email')
        if q:
            from django.db.models import Q
            qs = qs.filter(
                Q(email__icontains=q)
                | Q(first_name__icontains=q)
                | Q(last_name__icontains=q)
                | Q(phone__icontains=q)
                | Q(username__icontains=q)
            )
        users = []
        for user in qs[:20]:
            has_sub = MobileAppSubscription.objects.filter(user=user).exists()
            users.append({
                'id': user.id,
                'email': user.email,
                'name': f"{user.first_name or ''} {user.last_name or ''}".strip() or user.username,
                'phone': user.phone or '',
                'has_subscription': has_sub,
            })
        return Response({'results': users})

    @action(detail=False, methods=['post'], url_path='create-subscription')
    def create_subscription(self, request):
        user_id = request.data.get('user_id')
        plan_tier = request.data.get('plan_tier') or 'premium'
        start_trial = bool(request.data.get('start_trial', True))
        if plan_tier not in PLAN_TIERS:
            return Response({'detail': 'Plano inválido.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(pk=user_id)
        except (User.DoesNotExist, TypeError, ValueError):
            return Response({'detail': 'Utilizador não encontrado.'}, status=status.HTTP_400_BAD_REQUEST)
        if MobileAppSubscription.objects.filter(user=user).exists():
            return Response(
                {'detail': 'Este utilizador já tem uma subscrição.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        now = timezone.now()
        sub = MobileAppSubscription.objects.create(
            user=user,
            plan_tier=plan_tier,
            status='trial' if start_trial else 'active',
            trial_ends_at=now + timedelta(days=7) if start_trial else None,
            subscription_ends_at=None if start_trial else now + timedelta(days=30),
        )
        record_admin_action(
            request, 'create_subscription', subscription=sub,
            details={'plan_tier': plan_tier, 'status': sub.status},
        )
        serializer = AdminMobileAppSubscriptionDetailSerializer(sub, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='export')
    def export(self, request):
        fmt = (request.query_params.get('export_format') or request.query_params.get('format') or 'csv').lower()
        if fmt in ('json', 'api'):
            fmt = 'csv'
        qs = self.filter_queryset(self.get_queryset())
        price = float(monthly_price())
        currency = default_currency()
        rows = []
        for sub in qs[:5000]:
            proof = list(sub.payment_proofs.all())
            latest = proof[0] if proof else None
            rows.append({
                'id': sub.id,
                'transaction_id': latest.transaction_id if latest else f'ZND-SUB-{sub.id:06d}',
                'customer': f"{sub.user.first_name or ''} {sub.user.last_name or ''}".strip() or sub.user.username,
                'email': sub.user.email,
                'phone': sub.user.phone or '',
                'plan': sub.plan_tier,
                'status': sub.display_status(latest),
                'amount': float(effective_amount(latest)),
                'currency': effective_currency(latest) if latest else currency,
                'start_date': sub.created_at.date().isoformat() if sub.created_at else '',
                'renewal_date': sub.renewal_at.date().isoformat() if sub.renewal_at else '',
                'payment_method': latest.payment_method if latest else '',
            })
        record_admin_action(request, 'export', details={'format': fmt, 'count': len(rows)})
        if fmt == 'xlsx':
            return _excel_xml_response(rows)
        if fmt == 'pdf':
            return _pdf_text_response(rows, price, currency)
        return _csv_response(rows)

    @action(detail=False, methods=['get'], url_path='audit-logs')
    def audit_logs(self, request):
        qs = SubscriptionAdminAuditLog.objects.select_related('admin').all()
        paginator = AdminPagePagination()
        page = paginator.paginate_queryset(qs, request, view=self)
        serializer = AdminAuditLogSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    @action(detail=True, methods=['post'], url_path='deactivate')
    def deactivate(self, request, pk=None):
        """Desativar subscrição (status = cancelled)."""
        sub = self.get_object()
        sub.status = 'cancelled'
        sub.save(update_fields=['status', 'updated_at'])
        record_admin_action(request, 'cancel_subscription', subscription=sub)
        serializer = self.get_serializer(sub)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='pause')
    def pause(self, request, pk=None):
        sub = self.get_object()
        if sub.status == 'cancelled':
            return Response({'detail': 'Não é possível pausar uma subscrição cancelada.'}, status=status.HTTP_400_BAD_REQUEST)
        sub.status = 'paused'
        sub.paused_at = timezone.now()
        sub.save(update_fields=['status', 'paused_at', 'updated_at'])
        record_admin_action(request, 'pause_subscription', subscription=sub)
        return Response(self.get_serializer(sub).data)

    @action(detail=True, methods=['post'], url_path='resume')
    def resume(self, request, pk=None):
        sub = self.get_object()
        now = timezone.now()
        if sub.subscription_ends_at and sub.subscription_ends_at > now:
            sub.status = 'active'
        elif sub.trial_ends_at and sub.trial_ends_at > now:
            sub.status = 'trial'
        else:
            sub.status = 'expired'
        sub.paused_at = None
        sub.save(update_fields=['status', 'paused_at', 'updated_at'])
        record_admin_action(request, 'resume_subscription', subscription=sub, details={'status': sub.status})
        return Response(self.get_serializer(sub).data)

    @action(detail=True, methods=['post'], url_path='extend-30-days')
    def extend_30_days(self, request, pk=None):
        """Estender subscrição 30 dias (ativar/renovar)."""
        sub = self.get_object()
        days = request.data.get('days', 30)
        try:
            days = int(days)
        except (TypeError, ValueError):
            days = 30
        days = max(1, min(days, 365))
        _extend_subscription(sub, days=days)
        record_admin_action(request, 'extend_subscription', subscription=sub, details={'days': days})
        serializer = self.get_serializer(sub)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='change-plan')
    def change_plan(self, request, pk=None):
        sub = self.get_object()
        plan_tier = request.data.get('plan_tier')
        if plan_tier not in PLAN_TIERS:
            return Response({'detail': 'Plano inválido.'}, status=status.HTTP_400_BAD_REQUEST)
        previous = sub.plan_tier
        sub.plan_tier = plan_tier
        sub.save(update_fields=['plan_tier', 'updated_at'])
        record_admin_action(
            request, 'change_plan', subscription=sub,
            details={'from': previous, 'to': plan_tier},
        )
        return Response(self.get_serializer(sub).data)

    @action(detail=True, methods=['post'], url_path='refund')
    def refund(self, request, pk=None):
        sub = self.get_object()
        note = (request.data.get('note') or '')[:500]
        payment = (
            SubscriptionPayment.objects.filter(
                subscription=sub,
                status=SubscriptionPayment.STATUS_PAID,
            ).order_by('-activated_at', '-created_at').first()
        )
        if payment:
            try:
                payment.transition(SubscriptionPayment.STATUS_REFUND_REQUESTED)
            except Exception:
                pass
        record_admin_action(
            request, 'refund', subscription=sub,
            details={'note': note, 'manual': True, 'payment_id': payment.id if payment else None},
        )
        return Response({
            'ok': True,
            'message': 'Refund recorded. Process the bank transfer separately.',
        })

    @action(detail=True, methods=['post'], url_path='send-reminder')
    def send_reminder(self, request, pk=None):
        from .notify import send_subscription_reminders

        sub = self.get_object()
        channels = request.data.get('channels') or ['email', 'push', 'sms', 'whatsapp']
        if isinstance(channels, str):
            channels = [part.strip() for part in channels.split(',') if part.strip()]
        days = request.data.get('days', 3)
        try:
            days = int(days)
        except (TypeError, ValueError):
            days = 3
        results = send_subscription_reminders(sub.user, sub, channels=channels, days=days)
        record_admin_action(
            request, 'send_reminder', subscription=sub,
            details={'channels': channels, 'days': days, 'results': results},
        )
        return Response({'ok': True, 'results': results})


class AdminMobileAppSubscriptionPaymentProofViewSet(viewsets.ReadOnlyModelViewSet):
    """List and approve/reject payment proofs (admin only)."""
    queryset = MobileAppSubscriptionPaymentProof.objects.all().select_related(
        'subscription', 'subscription__user', 'reviewed_by'
    ).order_by('-created_at')
    serializer_class = AdminMobileAppSubscriptionPaymentProofSerializer
    permission_classes = [IsStaffAdmin]
    pagination_class = AdminPagePagination

    def get_queryset(self):
        return MobileAppSubscriptionPaymentProof.objects.all().select_related(
            'subscription', 'subscription__user', 'reviewed_by'
        ).order_by('-created_at')

    def filter_queryset(self, queryset):
        if self.action == 'list':
            return apply_proof_filters(queryset, self.request.query_params)
        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        from django.db.models import Count
        counts = {
            row['status']: row['c']
            for row in MobileAppSubscriptionPaymentProof.objects.values('status').annotate(c=Count('id'))
        }
        return Response({
            'pending': counts.get('pending', 0),
            'approved': counts.get('approved', 0),
            'rejected': counts.get('rejected', 0),
            'info_requested': counts.get('info_requested', 0),
        })

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        """Aprovar comprovativo: ativar/renovar subscrição 30 dias."""
        proof = self.get_object()
        if proof.status not in ('pending', 'info_requested'):
            return Response(
                {'detail': 'Este comprovativo já foi processado.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        now = timezone.now()
        proof.status = 'approved'
        proof.reviewed_by = request.user
        proof.reviewed_at = now
        if proof.amount is None:
            proof.amount = monthly_price()
        if not proof.currency:
            proof.currency = default_currency()
        proof.save()
        payment = create_proof_ledger(proof)
        fulfill_paid_payment(payment)
        record_admin_action(request, 'approve_payment', subscription=proof.subscription, payment_proof=proof)
        serializer = self.get_serializer(proof)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        """Rejeitar comprovativo."""
        proof = self.get_object()
        if proof.status not in ('pending', 'info_requested'):
            return Response(
                {'detail': 'Este comprovativo já foi processado.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        proof.status = 'rejected'
        proof.reviewed_by = request.user
        proof.reviewed_at = timezone.now()
        reason = (request.data.get('reason') or request.data.get('message') or '')[:240]
        if reason:
            proof.notes = (proof.notes + '\n' + reason).strip() if proof.notes else reason
        proof.save()
        payment = SubscriptionPayment.objects.filter(proof=proof).first()
        if payment:
            mark_payment_failed(
                payment,
                status=SubscriptionPayment.STATUS_REJECTED,
                reason=reason,
                notify=True,
            )
        else:
            from .payments import notify_proof_rejected
            notify_proof_rejected(proof.subscription.user, reason)
        record_admin_action(request, 'reject_payment', subscription=proof.subscription, payment_proof=proof)
        serializer = self.get_serializer(proof)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='request-info')
    def request_info(self, request, pk=None):
        proof = self.get_object()
        if proof.status not in ('pending', 'info_requested'):
            return Response(
                {'detail': 'Este comprovativo já foi processado.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        message = (request.data.get('message') or '').strip()
        proof.status = 'info_requested'
        proof.info_request_message = message
        proof.reviewed_by = request.user
        proof.reviewed_at = timezone.now()
        proof.save()
        payment = SubscriptionPayment.objects.filter(proof=proof).first()
        if payment and payment.can_transition(SubscriptionPayment.STATUS_INFO_REQUESTED):
            payment.transition(SubscriptionPayment.STATUS_INFO_REQUESTED)
        user = proof.subscription.user
        if message:
            _send_customer_email(
                user,
                'Zenda – informação adicional sobre o pagamento',
                (
                    f'Olá {user.first_name or user.email},\n\n'
                    'Precisamos de informação adicional sobre o comprovativo de pagamento da sua subscrição Zenda:\n\n'
                    f'{message}\n\n'
                    'Por favor responda ou envie um novo comprovativo na aplicação.\n\n'
                    'Equipa Zenda\n'
                ),
            )
        record_admin_action(
            request, 'request_payment_info',
            subscription=proof.subscription, payment_proof=proof,
            details={'message': message[:200]},
        )
        return Response(self.get_serializer(proof).data)


def _csv_response(rows):
    buffer = io.StringIO()
    buffer.write('\ufeff')
    fieldnames = list(rows[0].keys()) if rows else [
        'id', 'transaction_id', 'customer', 'email', 'phone', 'plan',
        'status', 'amount', 'currency', 'start_date', 'renewal_date', 'payment_method',
    ]
    writer = csv.DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)
    response = HttpResponse(buffer.getvalue(), content_type='text/csv; charset=utf-8')
    response['Content-Disposition'] = 'attachment; filename="zenda-subscriptions.csv"'
    return response


def _excel_xml_response(rows):
    fieldnames = list(rows[0].keys()) if rows else ['id']
    cells = []
    header = ''.join(f'<Cell><Data ss:Type="String">{_xml_escape(h)}</Data></Cell>' for h in fieldnames)
    cells.append(f'<Row>{header}</Row>')
    for row in rows:
        inner = ''.join(
            f'<Cell><Data ss:Type="String">{_xml_escape(row.get(k, ""))}</Data></Cell>'
            for k in fieldnames
        )
        cells.append(f'<Row>{inner}</Row>')
    xml = (
        '<?xml version="1.0"?>'
        '<?mso-application progid="Excel.Sheet"?>'
        '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"'
        ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">'
        '<Worksheet ss:Name="Subscriptions"><Table>'
        + ''.join(cells)
        + '</Table></Worksheet></Workbook>'
    )
    response = HttpResponse(xml, content_type='application/vnd.ms-excel')
    response['Content-Disposition'] = 'attachment; filename="zenda-subscriptions.xls"'
    return response


def _pdf_text_response(rows, price, currency):
    lines = [
        'Zenda — App Subscriptions',
        f'Monthly plan reference: {price} {currency}',
        '',
        'ID | Customer | Email | Plan | Status | Amount | Renewal',
        '-' * 88,
    ]
    for row in rows:
        lines.append(
            f"{row['id']} | {row['customer']} | {row['email']} | {row['plan']} | "
            f"{row['status']} | {row['amount']} {row['currency']} | {row['renewal_date']}"
        )
    body = '\n'.join(lines)
    response = HttpResponse(body.encode('utf-8'), content_type='text/plain; charset=utf-8')
    response['Content-Disposition'] = 'attachment; filename="zenda-subscriptions.txt"'
    return response


def _xml_escape(value):
    text = '' if value is None else str(value)
    return (
        text.replace('&', '&amp;')
        .replace('<', '&lt;')
        .replace('>', '&gt;')
        .replace('"', '&quot;')
    )


def _gateway_public_payload(row: PaymentGatewayConfig | None) -> dict:
    from .ikhokha import load_ikhokha_credentials
    creds = load_ikhokha_credentials()
    if row is None:
        return {
            'provider': PaymentGatewayConfig.PROVIDER_IKHOKHA,
            'environment': PaymentGatewayConfig.ENV_SANDBOX,
            'is_active': bool(creds and creds.is_active),
            'app_id_masked': f'****{creds.app_id[-4:]}' if creds and creds.app_id else '',
            'app_id_set': bool(creds and creds.app_id),
            'app_secret_set': bool(creds and creds.app_secret),
            'webhook_secret_set': False,
            'api_base_url': (creds.api_base_url if creds else '') or '',
            'payment_url': (creds.payment_url if creds else '') or '',
            'callback_url': (creds.callback_url if creds else '') or '',
            'updated_at': None,
        }
    return {
        'provider': row.provider,
        'environment': row.environment,
        'is_active': row.is_active,
        'app_id_masked': row.app_id_masked(),
        'app_id_set': bool(row.app_id),
        'app_secret_set': bool(row.app_secret),
        'webhook_secret_set': bool(row.webhook_secret),
        'api_base_url': row.api_base_url,
        'payment_url': row.payment_url,
        'callback_url': row.callback_url,
        'updated_at': row.updated_at,
    }


class AdminPaymentGatewayConfigViewSet(viewsets.ViewSet):
    permission_classes = [IsStaffAdmin]

    def list(self, request):
        row = get_ikhokha_config_row()
        billing = get_billing_settings()
        return Response({
            'ikhokha': PaymentGatewayConfigPublicSerializer(_gateway_public_payload(row)).data,
            'billing': BillingSettingsSerializer({
                'monthly_price_aoa': billing.monthly_price_aoa,
                'monthly_price_zar': billing.monthly_price_zar,
                'iban': billing.iban,
                'payee_name': billing.payee_name,
            }).data,
        })

    def partial_update(self, request, pk=None):
        data = request.data or {}
        ikhokha_data = data.get('ikhokha') if isinstance(data.get('ikhokha'), dict) else data
        billing_data = data.get('billing') if isinstance(data.get('billing'), dict) else None

        row = get_ikhokha_config_row()
        if row is None:
            row = PaymentGatewayConfig.objects.create(provider=PaymentGatewayConfig.PROVIDER_IKHOKHA)

        writer = PaymentGatewayConfigWriteSerializer(data=ikhokha_data, partial=True)
        writer.is_valid(raise_exception=True)
        validated = writer.validated_data
        if 'environment' in validated:
            row.environment = validated['environment']
        if 'is_active' in validated:
            row.is_active = validated['is_active']
        if validated.get('app_id'):
            row.app_id = validated['app_id'].strip()
        if validated.get('app_secret'):
            row.app_secret = validated['app_secret']
        if validated.get('webhook_secret'):
            row.webhook_secret = validated['webhook_secret']
        if 'api_base_url' in validated:
            row.api_base_url = validated['api_base_url']
        if 'payment_url' in validated:
            row.payment_url = validated['payment_url']
        if 'callback_url' in validated:
            row.callback_url = validated['callback_url']
        row.updated_by = request.user
        row.save()

        if billing_data:
            billing_writer = BillingSettingsSerializer(data=billing_data, partial=True)
            billing_writer.is_valid(raise_exception=True)
            billing = get_billing_settings()
            for field, value in billing_writer.validated_data.items():
                setattr(billing, field, value)
            billing.updated_by = request.user
            billing.save()

        record_admin_action(request, 'update_gateway_config', details={'provider': 'ikhokha'})
        row = get_ikhokha_config_row()
        billing = get_billing_settings()
        return Response({
            'ikhokha': PaymentGatewayConfigPublicSerializer(_gateway_public_payload(row)).data,
            'billing': BillingSettingsSerializer({
                'monthly_price_aoa': billing.monthly_price_aoa,
                'monthly_price_zar': billing.monthly_price_zar,
                'iban': billing.iban,
                'payee_name': billing.payee_name,
            }).data,
        })

    @action(detail=False, methods=['patch', 'put'], url_path='update')
    def update_config(self, request):
        return self.partial_update(request)

    @action(detail=False, methods=['post'], url_path='test-connection')
    def test_connection(self, request):
        result = ikhokha_test_connection()
        record_admin_action(
            request, 'test_ikhokha_connection',
            result='success' if result.get('ok') else 'failed',
            details={'ok': bool(result.get('ok'))},
        )
        if result.get('ok'):
            return Response({
                'ok': True,
                'message': 'iKhokha connection successful',
                'environment': result.get('environment'),
                'merchant': result.get('merchant'),
                'api': result.get('api'),
                'webhook': result.get('webhook'),
            })
        return Response({
            'ok': False,
            'message': 'Connection failed. Please verify your iKhokha credentials.',
        }, status=status.HTTP_400_BAD_REQUEST)


class AdminSubscriptionPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AdminSubscriptionPaymentSerializer
    permission_classes = [IsStaffAdmin]
    pagination_class = AdminPagePagination

    def get_queryset(self):
        return SubscriptionPayment.objects.select_related(
            'user', 'subscription', 'proof'
        ).order_by('-created_at')

    def filter_queryset(self, queryset):
        params = self.request.query_params
        status_filter = params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        method = params.get('method')
        if method:
            queryset = queryset.filter(method=method)
        gateway = params.get('gateway')
        if gateway:
            queryset = queryset.filter(gateway=gateway)
        country = params.get('country')
        if country:
            queryset = queryset.filter(country__iexact=country)
        search = (params.get('q') or params.get('search') or '').strip()
        if search:
            from django.db.models import Q
            q_filter = (
                Q(user__email__icontains=search)
                | Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(external_id__icontains=search)
                | Q(paylink_id__icontains=search)
                | Q(provider_transaction_id__icontains=search)
            )
            if search.isdigit():
                q_filter |= Q(id=int(search))
            queryset = queryset.filter(q_filter)
        return queryset

    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        from django.db.models import Count
        qs = SubscriptionPayment.objects.all()
        counts = {row['status']: row['c'] for row in qs.values('status').annotate(c=Count('id'))}
        pending = (
            counts.get('pending', 0)
            + counts.get('processing', 0)
            + counts.get('pending_verification', 0)
            + counts.get('info_requested', 0)
        )
        return Response({
            'total': qs.count(),
            'pending': pending,
            'paid': counts.get('paid', 0),
            'failed': counts.get('failed', 0) + counts.get('cancelled', 0),
            'refunded': counts.get('refunded', 0) + counts.get('refund_requested', 0),
            'rejected': counts.get('rejected', 0),
        })


"""User-facing subscription payment APIs and iKhokha webhook."""
import json
import logging

from django.conf import settings
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, authentication_classes, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .billing import (
    angola_bank_details,
    estimate_amount,
    is_angola_user,
    monthly_price_aoa,
    monthly_price_zar,
    user_country,
)
from .ikhokha import (
    IkhokhaError,
    create_payment_link,
    get_payment_status,
    ikhokha_configured,
    load_ikhokha_credentials,
    verify_webhook_signature,
)
from .models import SubscriptionPayment
from .payments import (
    apply_ikhokha_provider_status,
    get_or_create_subscription,
    new_external_id,
)
from .serializers import CheckoutOptionsSerializer, SubscriptionPaymentSerializer

logger = logging.getLogger(__name__)


class PaymentPagePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 50


def _frontend_base() -> str:
    return getattr(settings, 'FRONTEND_URL', 'https://www.rubianejoaquim.com').rstrip('/')


def _callback_pages(external_id: str):
    base = _frontend_base()
    return {
        'success': f'{base}/payments/ikhokha/success?payment={external_id}',
        'failure': f'{base}/payments/ikhokha/failure?payment={external_id}',
        'cancel': f'{base}/payments/ikhokha/cancel?payment={external_id}',
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def checkout_options(request):
    user = request.user
    country = user_country(user)
    angola = is_angola_user(user)
    platform = (request.query_params.get('platform') or 'web').lower()
    preferred = (user.preferred_currency or 'USD').upper()
    card_enabled = ikhokha_configured()

    if angola:
        methods = ['proof_of_payment']
        charge_amount = monthly_price_aoa()
        charge_currency = 'AOA'
    else:
        methods = ['card']
        if platform == 'ios':
            methods.append('apple_iap')
        charge_amount = monthly_price_zar()
        charge_currency = 'ZAR'

    estimate = None
    if angola:
        converted = estimate_amount(charge_amount, charge_currency, preferred)
        if converted is not None and preferred != charge_currency:
            estimate = {
                'amount': str(converted),
                'currency': preferred,
                'is_estimate': True,
            }
    else:
        usd = estimate_amount(charge_amount, charge_currency, 'USD')
        if usd is not None and charge_currency != 'USD':
            estimate = {
                'amount': str(usd),
                'currency': 'USD',
                'is_estimate': True,
            }
        elif preferred not in ('', charge_currency):
            converted = estimate_amount(charge_amount, charge_currency, preferred)
            if converted is not None:
                estimate = {
                    'amount': str(converted),
                    'currency': preferred,
                    'is_estimate': True,
                }

    payload = {
        'country': country,
        'method': methods[0],
        'methods': methods,
        'ikhokha_enabled': card_enabled,
        'plan': {
            'tier': 'premium',
            'amount': str(charge_amount),
            'currency': charge_currency,
        },
        'charge': {
            'amount': str(charge_amount),
            'currency': charge_currency,
        },
        'estimate': estimate,
        'proof_of_payment': angola_bank_details() if angola else None,
    }
    serializer = CheckoutOptionsSerializer(payload)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payment_session(request):
    user = request.user
    if is_angola_user(user):
        return Response(
            {'detail': 'Angola payments use proof of payment, not card checkout.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not ikhokha_configured():
        return Response(
            {'detail': 'Card payments are not available yet.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    sub = get_or_create_subscription(user)
    amount = monthly_price_zar()
    currency = 'ZAR'
    external_id = new_external_id('IK')
    urls = _callback_pages(external_id)
    payment = SubscriptionPayment.objects.create(
        user=user,
        subscription=sub,
        plan_tier=sub.plan_tier,
        country=user_country(user),
        amount=amount,
        currency=currency,
        plan_amount=amount,
        plan_currency=currency,
        method=SubscriptionPayment.METHOD_CARD,
        gateway=SubscriptionPayment.GATEWAY_IKHOKHA,
        status=SubscriptionPayment.STATUS_PROCESSING,
        external_id=external_id,
    )
    try:
        link = create_payment_link(
            amount=amount,
            currency=currency,
            external_id=external_id,
            description=f'Zenda {sub.plan_tier} subscription',
            success_url=urls['success'],
            failure_url=urls['failure'],
            cancel_url=urls['cancel'],
            requester_url=_frontend_base(),
        )
    except IkhokhaError:
        payment.transition(
            SubscriptionPayment.STATUS_FAILED,
            failure_reason='Could not start card payment',
        )
        return Response(
            {'detail': 'Could not start card payment. Please try again.'},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    payment.paylink_id = link['paylink_id']
    payment.paylink_url = link['paylink_url']
    payment.save(update_fields=['paylink_id', 'paylink_url', 'updated_at'])
    return Response({
        'id': payment.id,
        'external_id': payment.external_id,
        'paylink_url': payment.paylink_url,
        'amount': str(payment.amount),
        'currency': payment.currency,
        'status': payment.status,
    }, status=status.HTTP_201_CREATED)


def _user_payment(request, pk=None, external_id=None):
    qs = SubscriptionPayment.objects.filter(user=request.user)
    if pk:
        return qs.filter(pk=pk).first()
    if external_id:
        return qs.filter(external_id=external_id).first()
    return None


def _sync_owned_payment(payment, outcome=''):
    if payment.status == SubscriptionPayment.STATUS_PAID:
        return payment
    if payment.gateway != SubscriptionPayment.GATEWAY_IKHOKHA:
        return payment
    client_outcome = (outcome or '').lower()
    try:
        remote = get_payment_status(paylink_id=payment.paylink_id, external_id=payment.external_id)
    except IkhokhaError:
        if client_outcome == 'cancel' and payment.status == SubscriptionPayment.STATUS_PROCESSING:
            apply_ikhokha_provider_status(payment, 'CANCELLED', notify=False)
            payment.refresh_from_db()
        return payment

    payment.provider_status = remote.get('status') or payment.provider_status
    if remote.get('paylink_id') and not payment.paylink_id:
        payment.paylink_id = remote['paylink_id']
    payment.save(update_fields=['provider_status', 'paylink_id', 'updated_at'])
    apply_ikhokha_provider_status(payment, remote.get('status') or '')
    payment.refresh_from_db()
    if client_outcome == 'cancel' and payment.status == SubscriptionPayment.STATUS_PROCESSING:
        apply_ikhokha_provider_status(payment, 'CANCELLED', notify=False)
        payment.refresh_from_db()
    return payment


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def sync_payment(request, pk=None):
    from .commerce import sync_commerce_payment
    from .commerce_views import _serialize_commerce
    from .models import CommercePayment

    external_id = request.data.get('external_id') or request.query_params.get('payment')
    payment = _user_payment(
        request,
        pk=pk,
        external_id=external_id,
    )
    if payment is not None:
        payment = _sync_owned_payment(payment, request.data.get('outcome') or '')
        return Response(SubscriptionPaymentSerializer(payment, context={'request': request}).data)

    commerce = None
    qs = CommercePayment.objects.filter(user=request.user)
    if pk:
        commerce = qs.filter(pk=pk).first()
    elif external_id:
        commerce = qs.filter(external_id=external_id).first()
    if commerce is not None:
        commerce = sync_commerce_payment(commerce, request.data.get('outcome') or '')
        return Response(_serialize_commerce(commerce))

    return Response({'detail': 'Payment not found.'}, status=status.HTTP_404_NOT_FOUND)


class SubscriptionPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SubscriptionPaymentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = PaymentPagePagination

    def get_queryset(self):
        return SubscriptionPayment.objects.filter(user=self.request.user).select_related(
            'subscription', 'proof'
        )

    @action(detail=True, methods=['post'], url_path='sync')
    def sync(self, request, pk=None):
        payment = self.get_object()
        payment = _sync_owned_payment(payment, request.data.get('outcome') or '')
        return Response(SubscriptionPaymentSerializer(payment, context={'request': request}).data)


@method_decorator(csrf_exempt, name='dispatch')
class IkhokhaWebhookView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        raw = request.body or b''
        sign = request.headers.get('ik-sign') or request.META.get('HTTP_IK_SIGN', '')
        app_id = request.headers.get('ik-appid') or request.META.get('HTTP_IK_APPID', '')
        creds = load_ikhokha_credentials()
        callback_url = (creds.callback_url if creds else '') or request.build_absolute_uri()
        if not verify_webhook_signature(callback_url, raw, sign, app_id):
            logger.warning('iKhokha webhook signature mismatch')
            return Response({'detail': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        try:
            payload = json.loads(raw.decode('utf-8') or '{}')
        except (ValueError, UnicodeDecodeError):
            return Response({'detail': 'Invalid payload'}, status=status.HTTP_400_BAD_REQUEST)

        paylink_id = str(payload.get('paylinkID') or payload.get('paylinkId') or '')
        external_id = str(payload.get('externalTransactionID') or '')
        webhook_status = str(payload.get('status') or '')

        from .models import CommercePayment
        from .commerce import apply_commerce_provider_status

        payment = None
        commerce = None
        if external_id:
            payment = SubscriptionPayment.objects.filter(external_id=external_id).first()
            if payment is None:
                commerce = CommercePayment.objects.filter(external_id=external_id).first()
        if payment is None and commerce is None and paylink_id:
            payment = SubscriptionPayment.objects.filter(paylink_id=paylink_id).first()
            if payment is None:
                commerce = CommercePayment.objects.filter(paylink_id=paylink_id).first()

        if payment is None and commerce is None:
            logger.warning('iKhokha webhook for unknown payment')
            return Response({'ok': True})

        if commerce is not None:
            if commerce.status == CommercePayment.STATUS_PAID:
                return Response({'ok': True})
            try:
                remote = get_payment_status(
                    paylink_id=commerce.paylink_id or paylink_id,
                    external_id=commerce.external_id,
                )
                provider_status = remote.get('status') or webhook_status
            except IkhokhaError:
                provider_status = webhook_status
            if paylink_id and not commerce.paylink_id:
                commerce.paylink_id = paylink_id
                commerce.save(update_fields=['paylink_id', 'updated_at'])
            apply_commerce_provider_status(commerce, provider_status)
            return Response({'ok': True})

        if payment.status == SubscriptionPayment.STATUS_PAID:
            return Response({'ok': True})

        try:
            remote = get_payment_status(
                paylink_id=payment.paylink_id or paylink_id,
                external_id=payment.external_id,
            )
            provider_status = remote.get('status') or webhook_status
        except IkhokhaError:
            provider_status = webhook_status

        if paylink_id and not payment.paylink_id:
            payment.paylink_id = paylink_id
            payment.save(update_fields=['paylink_id', 'updated_at'])
        apply_ikhokha_provider_status(payment, provider_status)
        return Response({'ok': True})

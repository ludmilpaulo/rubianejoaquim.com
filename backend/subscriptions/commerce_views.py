"""HTTP endpoints for course/mentorship iKhokha checkout."""
import logging

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .commerce import (
    commerce_checkout_options,
    create_commerce_session,
    sync_commerce_payment,
)
from .ikhokha import IkhokhaError
from .models import CommercePayment

logger = logging.getLogger(__name__)


def _serialize_commerce(payment: CommercePayment) -> dict:
    return {
        'id': payment.id,
        'external_id': payment.external_id,
        'product_type': payment.product_type,
        'product_id': payment.product_id,
        'enrollment_id': payment.enrollment_id,
        'mentorship_request_id': payment.mentorship_request_id,
        'amount': str(payment.amount),
        'currency': payment.currency,
        'plan_amount': str(payment.plan_amount),
        'plan_currency': payment.plan_currency,
        'status': payment.status,
        'paylink_url': payment.paylink_url,
        'paylink_id': payment.paylink_id,
        'activated_at': payment.activated_at.isoformat() if payment.activated_at else None,
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def commerce_checkout_options_view(request):
    product_type = (request.query_params.get('product_type') or '').strip().lower()
    product_id = request.query_params.get('product_id')
    platform = (request.query_params.get('platform') or 'web').lower()
    if product_type not in (CommercePayment.PRODUCT_COURSE, CommercePayment.PRODUCT_MENTORSHIP):
        return Response({'detail': 'product_type must be course or mentorship.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        product_id_int = int(product_id)
    except (TypeError, ValueError):
        return Response({'detail': 'product_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        payload = commerce_checkout_options(
            request.user,
            product_type=product_type,
            product_id=product_id_int,
            platform=platform,
        )
    except Exception as exc:
        logger.exception('commerce checkout options failed')
        return Response({'detail': str(exc) or 'Could not load checkout options.'}, status=status.HTTP_400_BAD_REQUEST)
    return Response(payload)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def commerce_create_session(request):
    product_type = (request.data.get('product_type') or '').strip().lower()
    product_id = request.data.get('product_id')
    try:
        product_id_int = int(product_id)
    except (TypeError, ValueError):
        return Response({'detail': 'product_id is required.'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        payment = create_commerce_session(
            request.user,
            product_type=product_type,
            product_id=product_id_int,
            objective=(request.data.get('objective') or '')[:2000],
            availability=(request.data.get('availability') or '')[:2000],
            contact=(request.data.get('contact') or '')[:200],
        )
    except IkhokhaError as exc:
        code = status.HTTP_400_BAD_REQUEST
        if 'not available' in str(exc).lower():
            code = status.HTTP_503_SERVICE_UNAVAILABLE
        if 'gateway' in str(exc).lower() or 'start card' in str(exc).lower():
            code = status.HTTP_502_BAD_GATEWAY
        return Response({'detail': str(exc)}, status=code)
    except ValueError as exc:
        return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(_serialize_commerce(payment), status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def commerce_sync_payment(request):
    external_id = request.data.get('external_id') or request.query_params.get('payment')
    pk = request.data.get('id')
    qs = CommercePayment.objects.filter(user=request.user)
    payment = None
    if pk:
        payment = qs.filter(pk=pk).first()
    elif external_id:
        payment = qs.filter(external_id=external_id).first()
    if payment is None:
        return Response({'detail': 'Payment not found.'}, status=status.HTTP_404_NOT_FOUND)
    payment = sync_commerce_payment(payment, request.data.get('outcome') or '')
    return Response(_serialize_commerce(payment))

"""iKhokha card checkout for courses and mentorship (non-Angola)."""
import logging
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .billing import charge_in_zar, is_angola_user, user_country
from .ikhokha import IkhokhaError, create_payment_link, get_payment_status, ikhokha_configured
from .models import CommercePayment
from .payments import new_external_id

logger = logging.getLogger(__name__)


def _frontend_base() -> str:
    return getattr(settings, 'FRONTEND_URL', 'https://www.rubianejoaquim.com').rstrip('/')


def _callback_pages(external_id: str):
    base = _frontend_base()
    return {
        'success': f'{base}/payments/ikhokha/success?payment={external_id}',
        'failure': f'{base}/payments/ikhokha/failure?payment={external_id}',
        'cancel': f'{base}/payments/ikhokha/cancel?payment={external_id}',
    }


def commerce_checkout_options(user, *, product_type: str, product_id: int, platform: str = 'web') -> dict:
    angola = is_angola_user(user)
    card_enabled = ikhokha_configured()
    preferred = (getattr(user, 'preferred_currency', None) or 'USD').upper()

    if product_type == CommercePayment.PRODUCT_COURSE:
        from courses.models import Course
        product = get_object_or_404(Course, id=product_id, is_active=True)
        plan_amount = Decimal(str(product.price or 0))
        plan_currency = (getattr(product, 'currency', None) or 'USD').upper()
        title = product.title
    elif product_type == CommercePayment.PRODUCT_MENTORSHIP:
        from mentorship.models import MentorshipPackage
        product = get_object_or_404(MentorshipPackage, id=product_id, is_active=True)
        plan_amount = Decimal(str(product.price or 0))
        plan_currency = (getattr(product, 'currency', None) or 'USD').upper()
        title = product.title
    else:
        raise ValueError('Invalid product type')

    if angola:
        methods = ['proof_of_payment']
        charge_amount = plan_amount
        charge_currency = plan_currency if plan_currency in ('AOA', 'KZ') else 'AOA'
        if charge_currency == 'KZ':
            charge_currency = 'AOA'
    else:
        methods = ['card'] if card_enabled else ['card']
        if platform == 'ios':
            methods.append('apple_iap')
        try:
            charge_amount = charge_in_zar(plan_amount, plan_currency)
        except ValueError:
            charge_amount = plan_amount
        charge_currency = 'ZAR'

    estimate = None
    from .billing import estimate_amount
    if not angola and charge_currency == 'ZAR':
        usd = estimate_amount(charge_amount, 'ZAR', 'USD')
        if usd is not None:
            estimate = {'amount': str(usd), 'currency': 'USD', 'is_estimate': True}
    elif preferred and preferred != charge_currency:
        converted = estimate_amount(charge_amount, charge_currency, preferred)
        if converted is not None:
            estimate = {'amount': str(converted), 'currency': preferred, 'is_estimate': True}

    return {
        'country': user_country(user),
        'product_type': product_type,
        'product_id': product_id,
        'title': title,
        'method': methods[0],
        'methods': methods,
        'ikhokha_enabled': card_enabled and not angola,
        'plan': {'amount': str(plan_amount), 'currency': plan_currency},
        'charge': {'amount': str(charge_amount), 'currency': charge_currency},
        'estimate': estimate,
        'proof_of_payment': None,  # clients use /instructors/payee/ for AO bank details
    }


def create_commerce_session(user, *, product_type: str, product_id: int, objective: str = '', availability: str = '', contact: str = ''):
    if is_angola_user(user):
        raise IkhokhaError('Angola payments use proof of payment, not card checkout.')
    if not ikhokha_configured():
        raise IkhokhaError('Card payments are not available yet.')

    enrollment_id = None
    mentorship_request_id = None

    if product_type == CommercePayment.PRODUCT_COURSE:
        from courses.models import Course, Enrollment
        course = get_object_or_404(Course, id=product_id, is_active=True)
        if course.is_free or course.price == 0:
            raise IkhokhaError('This course is free.')
        enrollment, _ = Enrollment.objects.get_or_create(
            user=user,
            course=course,
            defaults={'status': 'pending'},
        )
        if enrollment.status == 'active':
            raise IkhokhaError('You already have access to this course.')
        enrollment_id = enrollment.id
        plan_amount = Decimal(str(course.price))
        plan_currency = (course.currency or 'USD').upper()
        description = f'Course: {course.title}'[:200]
    elif product_type == CommercePayment.PRODUCT_MENTORSHIP:
        from mentorship.models import MentorshipPackage, MentorshipRequest
        package = get_object_or_404(MentorshipPackage, id=product_id, is_active=True)
        existing = MentorshipRequest.objects.filter(
            user=user, package=package, status__in=('pending', 'approved', 'scheduled')
        ).first()
        if existing and existing.status == 'approved':
            raise IkhokhaError('You already have an approved mentorship for this package.')
        if existing:
            request_obj = existing
        else:
            request_obj = MentorshipRequest.objects.create(
                user=user,
                package=package,
                objective=objective or 'Paid via card (iKhokha).',
                availability=availability or 'To be confirmed with the team.',
                contact=contact or (user.email or ''),
                status='pending',
            )
        mentorship_request_id = request_obj.id
        plan_amount = Decimal(str(package.price))
        plan_currency = (package.currency or 'USD').upper()
        description = f'Mentorship: {package.title}'[:200]
    else:
        raise IkhokhaError('Invalid product type')

    amount = charge_in_zar(plan_amount, plan_currency)
    external_id = new_external_id('CM')
    urls = _callback_pages(external_id)
    payment = CommercePayment.objects.create(
        user=user,
        product_type=product_type,
        product_id=product_id,
        enrollment_id=enrollment_id,
        mentorship_request_id=mentorship_request_id,
        country=user_country(user),
        amount=amount,
        currency='ZAR',
        plan_amount=plan_amount,
        plan_currency=plan_currency,
        status=CommercePayment.STATUS_PROCESSING,
        external_id=external_id,
    )
    try:
        link = create_payment_link(
            amount=amount,
            currency='ZAR',
            external_id=external_id,
            description=description,
            success_url=urls['success'],
            failure_url=urls['failure'],
            cancel_url=urls['cancel'],
            requester_url=_frontend_base(),
        )
    except IkhokhaError:
        payment.status = CommercePayment.STATUS_FAILED
        payment.failure_reason = 'Could not start card payment'
        payment.save(update_fields=['status', 'failure_reason', 'updated_at'])
        raise

    payment.paylink_id = link['paylink_id']
    payment.paylink_url = link['paylink_url']
    payment.save(update_fields=['paylink_id', 'paylink_url', 'updated_at'])
    return payment


@transaction.atomic
def fulfill_commerce_payment(payment: CommercePayment, *, provider_status: str = ''):
    payment = CommercePayment.objects.select_for_update().get(pk=payment.pk)
    if payment.status == CommercePayment.STATUS_PAID and payment.activated_at:
        return payment
    payment.status = CommercePayment.STATUS_PAID
    payment.provider_status = provider_status or payment.provider_status
    payment.activated_at = timezone.now()
    payment.save()

    if payment.product_type == CommercePayment.PRODUCT_COURSE and payment.enrollment_id:
        from courses.models import Enrollment
        from courses.commerce import activate_enrollment
        enrollment = Enrollment.objects.filter(pk=payment.enrollment_id).first()
        if enrollment and enrollment.status != 'active':
            activate_enrollment(
                enrollment,
                payment_method='card',
                external_reference=payment.external_id,
            )
    elif payment.product_type == CommercePayment.PRODUCT_MENTORSHIP and payment.mentorship_request_id:
        from mentorship.models import MentorshipRequest
        req = MentorshipRequest.objects.filter(pk=payment.mentorship_request_id).first()
        if req and req.status != 'approved':
            req.status = 'approved'
            req.save(update_fields=['status'])
    return payment


def mark_commerce_failed(payment: CommercePayment, *, status: str, reason: str = ''):
    payment = CommercePayment.objects.select_for_update().get(pk=payment.pk)
    if payment.status == CommercePayment.STATUS_PAID:
        return payment
    payment.status = status if status in (
        CommercePayment.STATUS_FAILED,
        CommercePayment.STATUS_CANCELLED,
    ) else CommercePayment.STATUS_FAILED
    payment.failure_reason = (reason or '')[:240]
    payment.save(update_fields=['status', 'failure_reason', 'updated_at'])
    return payment


def apply_commerce_provider_status(payment: CommercePayment, provider_status: str):
    status_u = (provider_status or '').upper()
    if status_u in ('PAID', 'SUCCESS', 'SUCCESSFUL', 'COMPLETED'):
        return fulfill_commerce_payment(payment, provider_status=status_u)
    if status_u in ('CANCELLED', 'CANCELED', 'CANCEL'):
        return mark_commerce_failed(payment, status=CommercePayment.STATUS_CANCELLED, reason='Payment cancelled')
    if status_u in ('FAILED', 'FAILURE', 'DECLINED', 'ERROR'):
        return mark_commerce_failed(payment, status=CommercePayment.STATUS_FAILED, reason='Payment could not be confirmed')
    return payment


def sync_commerce_payment(payment: CommercePayment, outcome: str = ''):
    if payment.status == CommercePayment.STATUS_PAID:
        return payment
    client_outcome = (outcome or '').lower()
    try:
        remote = get_payment_status(paylink_id=payment.paylink_id, external_id=payment.external_id)
    except IkhokhaError:
        if client_outcome == 'cancel' and payment.status == CommercePayment.STATUS_PROCESSING:
            apply_commerce_provider_status(payment, 'CANCELLED')
            payment.refresh_from_db()
        return payment
    payment.provider_status = remote.get('status') or payment.provider_status
    if remote.get('paylink_id') and not payment.paylink_id:
        payment.paylink_id = remote['paylink_id']
    payment.save(update_fields=['provider_status', 'paylink_id', 'updated_at'])
    apply_commerce_provider_status(payment, remote.get('status') or '')
    payment.refresh_from_db()
    if client_outcome == 'cancel' and payment.status == CommercePayment.STATUS_PROCESSING:
        apply_commerce_provider_status(payment, 'CANCELLED')
        payment.refresh_from_db()
    return payment

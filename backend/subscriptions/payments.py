"""Shared subscription payment fulfillment — backend is the source of truth."""
import logging
import uuid
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from .billing import is_angola_user, monthly_price_aoa, monthly_price_zar, user_country
from .models import (
    InvalidPaymentTransition,
    MobileAppSubscription,
    MobileAppSubscriptionPaymentProof,
    SubscriptionPayment,
)

logger = logging.getLogger(__name__)


def new_external_id(prefix='ZND') -> str:
    return f'{prefix}-{uuid.uuid4().hex[:20].upper()}'


def get_or_create_subscription(user) -> MobileAppSubscription:
    sub, created = MobileAppSubscription.objects.get_or_create(
        user=user,
        defaults={
            'status': 'expired',
            'trial_ends_at': timezone.now(),
            'plan_tier': 'premium',
        },
    )
    return sub


def extend_subscription(sub: MobileAppSubscription, days=30) -> MobileAppSubscription:
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


def send_payment_email(user, subject: str, body: str) -> bool:
    if not user.email:
        return False
    from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@rubianejoaquim.com')
    try:
        send_mail(subject, body, from_email, [user.email], fail_silently=False)
        return True
    except Exception:
        logger.exception('Failed to send payment email')
        return False


def notify_payment_paid(user, *, angola: bool):
    if angola:
        subject = 'Payment verified'
        body = (
            f'Olá {user.first_name or user.email},\n\n'
            'Your payment has been verified.\n'
            'Your Zenda subscription has been activated.\n\n'
            'Equipa Zenda\n'
        )
    else:
        subject = 'Payment successful'
        body = (
            f'Olá {user.first_name or user.email},\n\n'
            'Your Zenda subscription is now active.\n\n'
            'Equipa Zenda\n'
        )
    send_payment_email(user, subject, body)


def notify_payment_failed(user):
    send_payment_email(
        user,
        'Payment failed',
        (
            f'Olá {user.first_name or user.email},\n\n'
            "We couldn't confirm your payment. Please try again.\n\n"
            'Equipa Zenda\n'
        ),
    )


def notify_proof_rejected(user, reason: str = ''):
    extra = f'\n{reason}\n' if reason else '\n'
    send_payment_email(
        user,
        'Payment proof rejected',
        (
            f'Olá {user.first_name or user.email},\n\n'
            'Please review the reason and submit a new proof of payment.'
            f'{extra}\nEquipa Zenda\n'
        ),
    )


def create_proof_ledger(proof: MobileAppSubscriptionPaymentProof) -> SubscriptionPayment:
    sub = proof.subscription
    user = sub.user
    amount = proof.amount if proof.amount is not None else monthly_price_aoa()
    currency = proof.currency or 'AOA'
    existing = SubscriptionPayment.objects.filter(proof=proof).first()
    if existing:
        return existing
    return SubscriptionPayment.objects.create(
        user=user,
        subscription=sub,
        plan_tier=sub.plan_tier,
        country=user_country(user) or 'AO',
        amount=amount,
        currency=currency,
        plan_amount=monthly_price_aoa(),
        plan_currency='AOA',
        method=SubscriptionPayment.METHOD_PROOF,
        gateway=SubscriptionPayment.GATEWAY_NONE,
        status=SubscriptionPayment.STATUS_PENDING_VERIFICATION,
        external_id=new_external_id('POP'),
        proof=proof,
    )


@transaction.atomic
def fulfill_paid_payment(payment: SubscriptionPayment, *, provider_status: str = '', notify: bool = True):
    """Mark paid and activate subscription once. Safe to call repeatedly."""
    payment = SubscriptionPayment.objects.select_for_update().get(pk=payment.pk)
    if payment.status == SubscriptionPayment.STATUS_PAID and payment.activated_at:
        return payment
    if payment.status != SubscriptionPayment.STATUS_PAID:
        payment.transition(
            SubscriptionPayment.STATUS_PAID,
            save=False,
            provider_status=provider_status or payment.provider_status,
        )
    if not payment.activated_at:
        extend_subscription(payment.subscription, days=30)
        payment.activated_at = timezone.now()
        if notify:
            notify_payment_paid(
                payment.user,
                angola=payment.method == SubscriptionPayment.METHOD_PROOF,
            )
    payment.save()
    return payment


@transaction.atomic
def mark_payment_failed(payment: SubscriptionPayment, *, status: str, reason: str = '', notify: bool = True):
    payment = SubscriptionPayment.objects.select_for_update().get(pk=payment.pk)
    if payment.status == SubscriptionPayment.STATUS_PAID:
        return payment
    target = status if status in (
        SubscriptionPayment.STATUS_FAILED,
        SubscriptionPayment.STATUS_CANCELLED,
        SubscriptionPayment.STATUS_REJECTED,
    ) else SubscriptionPayment.STATUS_FAILED
    if payment.status != target:
        try:
            payment.transition(target, save=False, failure_reason=(reason or '')[:240])
        except InvalidPaymentTransition:
            return payment
    payment.save()
    if notify and target == SubscriptionPayment.STATUS_FAILED:
        notify_payment_failed(payment.user)
    if notify and target == SubscriptionPayment.STATUS_REJECTED:
        notify_proof_rejected(payment.user, reason)
    return payment


def record_iap_payment(user, sub: MobileAppSubscription, transaction_id: str | None) -> SubscriptionPayment:
    external_id = f'APPLE-{(transaction_id or uuid.uuid4().hex)[:40]}'
    existing = SubscriptionPayment.objects.filter(external_id=external_id).first()
    if existing:
        return fulfill_paid_payment(existing, provider_status='PAID', notify=False)
    payment = SubscriptionPayment.objects.create(
        user=user,
        subscription=sub,
        plan_tier=sub.plan_tier,
        country=user_country(user),
        amount=monthly_price_zar() if not is_angola_user(user) else monthly_price_aoa(),
        currency='ZAR' if not is_angola_user(user) else 'AOA',
        plan_amount=monthly_price_zar() if not is_angola_user(user) else monthly_price_aoa(),
        plan_currency='ZAR' if not is_angola_user(user) else 'AOA',
        method=SubscriptionPayment.METHOD_APPLE_IAP,
        gateway=SubscriptionPayment.GATEWAY_APPLE,
        status=SubscriptionPayment.STATUS_PROCESSING,
        external_id=external_id,
        provider_transaction_id=transaction_id or '',
        provider_status='PAID',
    )
    return fulfill_paid_payment(payment, provider_status='PAID')


def apply_ikhokha_provider_status(payment: SubscriptionPayment, provider_status: str, *, notify: bool = True):
    status = (provider_status or '').upper()
    if status in ('PAID', 'SUCCESS', 'SUCCESSFUL', 'COMPLETED'):
        return fulfill_paid_payment(payment, provider_status=status, notify=notify)
    if status in ('CANCELLED', 'CANCELED', 'CANCEL'):
        return mark_payment_failed(
            payment,
            status=SubscriptionPayment.STATUS_CANCELLED,
            reason='Payment cancelled',
            notify=False,
        )
    if status in ('FAILED', 'FAILURE', 'DECLINED', 'ERROR'):
        return mark_payment_failed(
            payment,
            status=SubscriptionPayment.STATUS_FAILED,
            reason='Payment could not be confirmed',
            notify=notify,
        )
    return payment

"""Catalog prices, Angola bank details, and country routing."""
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings

from .models import PaymentGatewayConfig, SubscriptionBillingSettings


def get_billing_settings() -> SubscriptionBillingSettings:
    obj, _ = SubscriptionBillingSettings.objects.get_or_create(
        pk=1,
        defaults={
            'monthly_price_aoa': Decimal(str(getattr(settings, 'SUBSCRIPTION_MONTHLY_PRICE_KZ', 10000))),
            'monthly_price_zar': Decimal(str(getattr(settings, 'SUBSCRIPTION_MONTHLY_PRICE_ZAR', '180'))),
            'iban': getattr(settings, 'SUBSCRIPTION_IBAN', ''),
            'payee_name': getattr(settings, 'SUBSCRIPTION_PAYEE_NAME', ''),
        },
    )
    return obj


def monthly_price_aoa() -> Decimal:
    return Decimal(get_billing_settings().monthly_price_aoa)


def monthly_price_zar() -> Decimal:
    return Decimal(get_billing_settings().monthly_price_zar)


def angola_bank_details():
    billing = get_billing_settings()
    return {
        'monthly_price_kz': float(billing.monthly_price_aoa),
        'currency': 'AOA',
        'iban': billing.iban or getattr(settings, 'SUBSCRIPTION_IBAN', ''),
        'payee_name': billing.payee_name or getattr(settings, 'SUBSCRIPTION_PAYEE_NAME', ''),
    }


def user_country(user) -> str:
    country = (getattr(user, 'country', None) or '').strip().upper()
    if country:
        return country[:2]
    if (getattr(user, 'preferred_currency', '') or '').upper() == 'AOA':
        return 'AO'
    return ''


def is_angola_user(user) -> bool:
    return user_country(user) == 'AO'


def amount_to_cents(amount: Decimal) -> int:
    quantized = Decimal(amount).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    return int(quantized * 100)


def estimate_amount(amount: Decimal, from_currency: str, to_currency: str):
    """Return converted amount or None. Marked as estimate by the caller."""
    from_currency = (from_currency or '').upper()
    to_currency = (to_currency or '').upper()
    if not to_currency or from_currency == to_currency:
        return None
    try:
        from finance.models import ExchangeRate
    except Exception:
        return None
    rate = ExchangeRate.objects.filter(
        base_currency=from_currency, target_currency=to_currency
    ).first()
    if rate:
        converted = (Decimal(amount) * Decimal(rate.rate)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        return converted
    usd_from = ExchangeRate.objects.filter(base_currency='USD', target_currency=from_currency).first()
    usd_to = ExchangeRate.objects.filter(base_currency='USD', target_currency=to_currency).first()
    if usd_from and usd_to and usd_from.rate:
        usd_amount = Decimal(amount) / Decimal(usd_from.rate)
        converted = (usd_amount * Decimal(usd_to.rate)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        return converted
    return None


def get_ikhokha_config_row():
    return PaymentGatewayConfig.objects.filter(provider=PaymentGatewayConfig.PROVIDER_IKHOKHA).first()

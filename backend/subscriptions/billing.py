"""Catalog prices, Angola bank details, country routing, and platform free access."""
from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.utils import timezone

from .models import PaymentGatewayConfig, SubscriptionBillingSettings
from .tiers import PLAN_TIERS, has_feature, tier_features

# Family and premium are peer plans; business unlocks the richest feature set.
_TIER_RANK = {
    'free': 0,
    'premium': 1,
    'family': 1,
    'business': 2,
}


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
    """ISO country for payment routing. Only explicit `user.country` counts as Angola."""
    country = (getattr(user, 'country', None) or '').strip().upper()
    return country[:2] if country else ''


def is_angola_user(user) -> bool:
    """Angola bank/proof only when country is explicitly AO — never infer from currency alone."""
    return user_country(user) == 'AO'


def charge_in_zar(amount, currency: str):
    """Convert catalog amount to ZAR for iKhokha. Raises ValueError if conversion fails."""
    from decimal import Decimal, ROUND_HALF_UP

    amount = Decimal(str(amount)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    currency = (currency or 'USD').upper()
    if currency in ('KZ', 'AKZ'):
        currency = 'AOA'
    if currency == 'ZAR':
        return amount
    converted = estimate_amount(amount, currency, 'ZAR')
    if converted is not None and converted > 0:
        return converted
    if currency == 'USD':
        # Emergency fallback when FX table is empty: 1 USD ≈ 18 ZAR (admin should keep rates fresh)
        return (amount * Decimal('18')).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
    raise ValueError(f'Cannot convert {currency} to ZAR for card checkout')


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


def complimentary_access_info() -> dict:
    """Platform-wide free access window set by admin (1–6 months)."""
    billing = get_billing_settings()
    until = billing.complimentary_access_until
    now = timezone.now()
    active = bool(until and until > now)
    tier = billing.complimentary_plan_tier or 'premium'
    if tier not in PLAN_TIERS:
        tier = 'premium'
    return {
        'active': active,
        'until': until.isoformat() if until else None,
        'until_dt': until if active else None,
        'plan_tier': tier if active else None,
        'features': tier_features(tier) if active else [],
        'set_at': billing.complimentary_set_at.isoformat() if billing.complimentary_set_at else None,
    }


def _add_months(dt, months: int):
    """Add calendar months without requiring python-dateutil."""
    month_index = dt.month - 1 + months
    year = dt.year + month_index // 12
    month = month_index % 12 + 1
    day = min(dt.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
    return dt.replace(year=year, month=month, day=day)


def set_complimentary_access(*, months: int, plan_tier: str = 'premium', admin=None) -> dict:
    """Enable free access for all users for 1–6 months from now."""
    months = int(months)
    if months < 1 or months > 6:
        raise ValueError('months must be between 1 and 6')
    if plan_tier not in PLAN_TIERS or plan_tier == 'free':
        plan_tier = 'premium'
    billing = get_billing_settings()
    now = timezone.now()
    billing.complimentary_access_until = _add_months(now, months)
    billing.complimentary_plan_tier = plan_tier
    billing.complimentary_set_at = now
    if admin is not None:
        billing.complimentary_set_by = admin
        billing.updated_by = admin
    billing.save()
    return complimentary_access_info()


def clear_complimentary_access(*, admin=None) -> dict:
    billing = get_billing_settings()
    billing.complimentary_access_until = None
    billing.complimentary_set_at = timezone.now()
    if admin is not None:
        billing.complimentary_set_by = admin
        billing.updated_by = admin
    billing.save(update_fields=[
        'complimentary_access_until',
        'complimentary_set_at',
        'complimentary_set_by',
        'updated_by',
        'updated_at',
    ])
    return complimentary_access_info()


def _better_tier(a: str | None, b: str | None) -> str:
    left = a if a in _TIER_RANK else 'free'
    right = b if b in _TIER_RANK else 'free'
    return left if _TIER_RANK[left] >= _TIER_RANK[right] else right


def resolve_user_access(user, subscription=None) -> dict:
    """
    Combine personal subscription access with the platform complimentary window.
    Returns has_access, effective_tier, features, complimentary flag.
    """
    from .tiers import effective_tier

    promo = complimentary_access_info()
    sub = subscription
    if sub is None and user is not None:
        try:
            sub = user.mobile_app_subscription
        except Exception:
            from .models import MobileAppSubscription
            sub = MobileAppSubscription.objects.filter(user_id=getattr(user, 'id', None)).first()

    personal_access = bool(sub and sub.has_access)
    personal_tier = effective_tier(sub) if sub else 'free'
    promo_active = bool(promo.get('active'))
    promo_tier = promo.get('plan_tier') or 'premium'

    has_access = personal_access or promo_active
    if personal_access and promo_active:
        tier = _better_tier(personal_tier, promo_tier)
    elif personal_access:
        tier = personal_tier
    elif promo_active:
        tier = promo_tier
    else:
        tier = 'free'

    return {
        'has_access': has_access,
        'effective_tier': tier,
        'plan_tier': (sub.plan_tier if sub else None) or tier,
        'features': tier_features(tier) if has_access else [],
        'complimentary': promo_active and not personal_access,
        'complimentary_active': promo_active,
        'complimentary_until': promo.get('until'),
        'subscription': sub,
    }

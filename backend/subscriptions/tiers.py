"""Zenda subscription tier capabilities."""

PLAN_TIERS = ('free', 'premium', 'business', 'family')

TIER_FEATURES: dict[str, set[str]] = {
    'free': {
        'dashboard',
        'expenses_limited',
        'goals_limited',
        'education_preview',
    },
    'premium': {
        'dashboard',
        'ai_copilot',
        'health_score',
        'health_history',
        'monthly_ai_report',
        'multi_currency',
        'unlimited_goals',
        'advanced_analytics',
        'education_full',
        'offline_mode',
    },
    'business': {
        'dashboard',
        'ai_copilot',
        'health_score',
        'health_history',
        'monthly_ai_report',
        'multi_currency',
        'unlimited_goals',
        'advanced_analytics',
        'education_full',
        'offline_mode',
        'business_finance',
        'receipt_scanner',
        'pdf_export',
    },
    'family': {
        'dashboard',
        'ai_copilot',
        'health_score',
        'health_history',
        'monthly_ai_report',
        'multi_currency',
        'unlimited_goals',
        'advanced_analytics',
        'education_full',
        'offline_mode',
        'shared_finance',
    },
}


def effective_tier(subscription) -> str:
    """Map subscription state to feature tier."""
    if subscription is None:
        return 'free'
    tier = getattr(subscription, 'plan_tier', None) or 'premium'
    if subscription.has_access:
        return tier
    if subscription.status in ('trial', 'active'):
        return tier
    return 'free'


def tier_features(tier: str) -> list[str]:
    return sorted(TIER_FEATURES.get(tier, TIER_FEATURES['free']))


def has_feature(tier: str, feature: str) -> bool:
    return feature in TIER_FEATURES.get(tier, TIER_FEATURES['free'])

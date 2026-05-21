export type PlanTier = 'free' | 'premium' | 'business' | 'family'

export type ZendaFeature =
  | 'ai_copilot'
  | 'health_history'
  | 'monthly_ai_report'
  | 'multi_currency'
  | 'advanced_analytics'
  | 'shared_finance'
  | 'receipt_scanner'
  | 'offline_mode'
  | 'business_finance'
  | 'unlimited_goals'

const TIER_FEATURES: Record<PlanTier, Set<ZendaFeature>> = {
  free: new Set(),
  premium: new Set([
    'ai_copilot',
    'health_history',
    'monthly_ai_report',
    'multi_currency',
    'advanced_analytics',
    'offline_mode',
    'unlimited_goals',
  ]),
  business: new Set([
    'ai_copilot',
    'health_history',
    'monthly_ai_report',
    'multi_currency',
    'advanced_analytics',
    'offline_mode',
    'unlimited_goals',
    'business_finance',
    'receipt_scanner',
  ]),
  family: new Set([
    'ai_copilot',
    'health_history',
    'monthly_ai_report',
    'multi_currency',
    'advanced_analytics',
    'offline_mode',
    'unlimited_goals',
    'shared_finance',
  ]),
}

export function hasFeature(tier: PlanTier | string | undefined, feature: ZendaFeature): boolean {
  const t = (tier || 'premium') as PlanTier
  if (t === 'premium' || t === 'business' || t === 'family') {
    return TIER_FEATURES[t]?.has(feature) ?? true
  }
  return TIER_FEATURES.free.has(feature)
}

export function resolveTier(
  hasPaidAccess: boolean,
  planTier?: string,
  features?: string[],
): PlanTier {
  if (features?.length) {
    if (features.includes('shared_finance')) return 'family'
    if (features.includes('receipt_scanner')) return 'business'
    return 'premium'
  }
  if (!hasPaidAccess) return 'free'
  if (planTier && planTier in TIER_FEATURES) return planTier as PlanTier
  return 'premium'
}

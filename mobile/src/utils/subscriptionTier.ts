export type PlanTier = 'free' | 'premium' | 'business' | 'family'

/** Keep in sync with backend/subscriptions/tiers.py. */
export type ZendaFeature =
  | 'ai_copilot'
  | 'health_score'
  | 'health_history'
  | 'monthly_ai_report'
  | 'multi_currency'
  | 'advanced_analytics'
  | 'shared_finance'
  | 'receipt_scanner'
  | 'offline_mode'
  | 'business_finance'
  | 'unlimited_goals'
  | 'education_full'
  | 'pdf_export'

const PREMIUM_FEATURES: ZendaFeature[] = [
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
]

const TIER_FEATURES: Record<PlanTier, Set<ZendaFeature>> = {
  free: new Set(),
  premium: new Set(PREMIUM_FEATURES),
  business: new Set([...PREMIUM_FEATURES, 'business_finance', 'receipt_scanner', 'pdf_export']),
  family: new Set(PREMIUM_FEATURES),
}

export function hasFeature(tier: PlanTier | string | undefined, feature: ZendaFeature): boolean {
  const key = tier && tier in TIER_FEATURES ? (tier as PlanTier) : 'free'
  return TIER_FEATURES[key].has(feature)
}

export function resolveTier(
  hasPaidAccess: boolean,
  planTier?: string,
): PlanTier {
  if (planTier && planTier in TIER_FEATURES) return planTier as PlanTier
  if (!hasPaidAccess) return 'free'
  return 'premium'
}

export function userHasFeature(
  features: string[] | undefined,
  planTier: string | undefined,
  feature: ZendaFeature,
  isStaff = false,
): boolean {
  if (isStaff) return true
  if (features && features.length > 0) return features.includes(feature)
  return hasFeature(planTier, feature)
}

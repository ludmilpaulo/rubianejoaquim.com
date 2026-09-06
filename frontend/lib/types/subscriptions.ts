export type SubscriptionStatus =
  | 'trial'
  | 'active'
  | 'paused'
  | 'expired'
  | 'cancelled'
  | 'payment_failed'

export type PlanTier = 'free' | 'premium' | 'business' | 'family'

export type ProofStatus = 'pending' | 'approved' | 'rejected' | 'info_requested'

export type PaymentStatus = 'paid' | 'pending' | 'failed' | 'info_requested' | 'none'

export interface SparkKpi {
  value: number
  change_pct: number | null
  sparkline: number[]
  currency?: string
}

export interface SubscriptionAnalytics {
  kpis: {
    total_users: SparkKpi
    active_subscriptions: SparkKpi
    monthly_revenue: SparkKpi
    expiring_soon: SparkKpi
  }
  revenue_series: Array<{ period: string; label: string; amount: number; count: number }>
  plan_performance: Array<{ plan: PlanTier; users: number; pct: number }>
  users_by_country: Array<{
    country: string
    users: number
    active: number
    trial: number
    pct: number
  }>
  proofs: Record<ProofStatus, number>
  alerts: {
    expiring_7_days: number
    failed_payments_today: number
    expired: number
  }
  pricing: {
    monthly_price: number
    currency: string
  }
}

export interface AdminSubscription {
  id: number
  user: number
  user_email: string
  user_name: string
  user_phone: string
  user_country?: string
  status: Exclude<SubscriptionStatus, 'payment_failed'>
  display_status: SubscriptionStatus
  plan_tier: PlanTier
  trial_ends_at: string | null
  subscription_ends_at: string | null
  paused_at: string | null
  has_access: boolean
  days_until_expiry: number | null
  amount: number
  currency: string
  payment_method: string
  payment_status: PaymentStatus
  transaction_id: string
  start_date: string
  renewal_date: string | null
  created_at: string
  updated_at: string
}

export interface AdminPaymentProof {
  id: number
  subscription: number
  user_email: string
  user_name: string
  user_phone: string
  file: string
  file_url: string | null
  notes: string
  status: ProofStatus
  amount: number
  currency: string
  payment_method: string
  payment_reference: string
  info_request_message: string
  transaction_id: string
  plan_tier: PlanTier
  created_at: string
  reviewed_at: string | null
  reviewed_by: number | null
  reviewed_by_email: string | null
  reviewed_by_name: string | null
}

export interface AdminAuditLog {
  id: number
  action: string
  admin: number | null
  admin_email: string | null
  admin_name: string | null
  subscription: number | null
  payment_proof: number | null
  customer_email: string
  result: string
  details: Record<string, unknown>
  ip_address: string | null
  created_at: string
}

export interface AdminSubscriptionDetail extends AdminSubscription {
  payment_proofs: AdminPaymentProof[]
  audit_logs: AdminAuditLog[]
  billing_cycle: string
  monthly_price: { amount: number; currency: string }
}

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface SubscriptionListParams {
  q?: string
  status?: string
  plan?: string
  payment_status?: string
  currency?: string
  date_from?: string
  date_to?: string
  date_field?: 'created' | 'renewal' | 'payment'
  page?: number
  page_size?: number
  expiring?: string
  failed_today?: string
}

export interface ProofListParams {
  q?: string
  status?: string
  page?: number
  page_size?: number
}

export interface AdminUserSearchResult {
  id: number
  email: string
  name: string
  phone: string
  has_subscription: boolean
}

export type LedgerPaymentStatus =
  | 'pending'
  | 'processing'
  | 'pending_verification'
  | 'info_requested'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'rejected'
  | 'refund_requested'
  | 'refunded'

export interface CheckoutOptions {
  country: string
  method: 'proof_of_payment' | 'card' | 'apple_iap'
  methods: Array<'proof_of_payment' | 'card' | 'apple_iap'>
  ikhokha_enabled: boolean
  plan: { amount: string; currency: string; tier?: string }
  charge: { amount: string; currency: string }
  estimate: { amount: string; currency: string; is_estimate: boolean } | null
  proof_of_payment: {
    monthly_price_kz: number
    currency: string
    iban: string
    payee_name: string
  } | null
}

export interface SubscriptionPaymentRecord {
  id: number
  external_id: string
  plan_tier: string
  country: string
  amount: string
  currency: string
  plan_amount: string
  plan_currency: string
  method: string
  method_label: string
  gateway: string
  gateway_label: string
  status: LedgerPaymentStatus
  transaction_id: string
  paylink_id: string
  provider_status: string
  failure_reason: string
  receipt_url: string | null
  created_at: string
  updated_at: string
  activated_at: string | null
  user?: number
  user_email?: string
  user_name?: string
  subscription_id?: number
}

export interface PaymentSummary {
  total: number
  pending: number
  paid: number
  failed: number
  refunded: number
  rejected: number
}

export interface GatewayConfigResponse {
  ikhokha: {
    provider: string
    environment: string
    is_active: boolean
    app_id_masked: string
    app_id_set: boolean
    app_secret_set: boolean
    webhook_secret_set: boolean
    api_base_url: string
    payment_url: string
    callback_url: string
    updated_at: string | null
  }
  billing: {
    monthly_price_aoa: string
    monthly_price_zar: string
    iban: string
    payee_name: string
  }
}

export function unwrapList<T>(data: Paginated<T> | T[] | unknown): { results: T[]; count: number } {
  if (Array.isArray(data)) {
    return { results: data, count: data.length }
  }
  if (data && typeof data === 'object' && 'results' in data) {
    const page = data as Paginated<T>
    return { results: page.results ?? [], count: page.count ?? 0 }
  }
  return { results: [], count: 0 }
}

import type { AxiosError } from 'axios'

/** Django/DRF error body shapes */
export interface ApiErrorBody {
  error?: string
  detail?: string
  message?: string
  non_field_errors?: string[]
  email?: string | string[]
  password?: string | string[]
  refresh_error?: string
  [key: string]: string | string[] | undefined
}

export type ApiError = AxiosError<ApiErrorBody>

export interface PaginatedResponse<T> {
  count?: number
  next?: string | null
  previous?: string | null
  results?: T[]
}

export type FinanceQueryParams = Record<string, string | number | boolean | undefined>

export interface CategoryPayload {
  name: string
  icon?: string
  color?: string
  is_personal?: boolean
  is_business?: boolean
}

export interface ExpensePayload {
  category?: number | null
  amount: string | number
  description?: string
  date: string
  currency?: string
  payment_method?: string
  is_recurring?: boolean
  recurrence?: string
  notes?: string
  receipt_url?: string
}

export type PlanItemKey =
  | 'rent'
  | 'transport'
  | 'food'
  | 'electricity'
  | 'internet'
  | 'school'
  | 'family'
  | 'debt'
  | 'savings'
  | 'entertainment'
  | 'other'

export type PlanBucket = 'needs' | 'wants' | 'savings' | 'debt'

export type PlanProgressStatus = 'ok' | 'warning' | 'at_limit' | 'exceeded'

export interface MonthlyPlanItem {
  id?: number
  key: PlanItemKey | string
  label?: string
  amount: string | number
  bucket: PlanBucket | string
  sort_order?: number
}

export interface MonthlyPlanProgress {
  salary: string
  spending_limit: string
  savings_target: string
  planned_expenses: string
  planned_needs: string
  planned_wants: string
  planned_savings: string
  actual_expenses: string
  actual_savings: string
  remaining: string
  percent_used: string
  status: PlanProgressStatus
  currency: string
  month: number
  year: number
}

export interface MonthlyPlan {
  id: number | null
  month: number
  year: number
  salary: string | number
  spending_limit: string | number
  savings_target: string | number
  currency: string
  notes?: string
  items: MonthlyPlanItem[]
  progress: MonthlyPlanProgress
  last_budget_alert_level?: number
  created_at?: string
  updated_at?: string
}

export interface MonthlyPlanDashboard extends MonthlyPlanProgress {
  has_plan: boolean
  items: MonthlyPlanItem[]
}

export interface BudgetAlert {
  id?: number
  level: number
  type: 'budget_warning' | 'budget_exceeded' | 'budget_exceeded_urgent' | string
  title: string
  message: string
  remaining?: string
  percent_used?: string
  over_by?: string
  currency?: string
}

export interface ExpenseCreateResponse {
  budget_alerts?: BudgetAlert[]
  [key: string]: unknown
}

export interface MonthlyPlanSavePayload {
  salary: string | number
  spending_limit: string | number
  savings_target: string | number
  currency?: string
  notes?: string
  items: MonthlyPlanItem[]
}

export interface ShareZendaResponse {
  referral_code: string
  download_url: string
  invite_url: string
  ios_store_url?: string
  android_store_url?: string
}

export interface ReferralTrackPayload {
  referral_code: string
  event_type: 'click' | 'install' | 'register'
  platform?: 'ios' | 'android' | 'web' | string
}

export interface IncomePayload {
  category?: number | null
  amount: string | number
  description?: string
  date: string
  source_type?: string
  currency?: string
  is_recurring?: boolean
  recurrence?: string
  notes?: string
}

export interface BudgetPayload {
  category?: number | null
  amount: string | number
  month?: number
  year?: number
  period_type?: 'daily' | 'monthly' | 'yearly' | 'custom'
  start_date?: string
  end_date?: string
  date?: string
  currency?: string
}

export interface GoalPayload {
  title: string
  description?: string
  target_amount: string | number
  current_amount?: string | number
  target_date: string
  status?: 'active' | 'completed' | 'cancelled'
  currency?: string
  reminder_enabled?: boolean
  reminder_time?: string | null
  reminder_frequency?: 'once' | 'daily' | 'weekly'
  reminder_offsets_minutes?: number[]
}

export interface DebtPayload {
  creditor: string
  total_amount: string | number
  paid_amount?: string | number
  interest_rate?: string | number
  due_date: string
  description?: string
  status?: 'active' | 'paid' | 'overdue' | 'cancelled'
  notes?: string
  currency?: string
}

export interface DebtPaymentPayload {
  amount: string | number
  payment_date?: string
  note?: string
  currency?: string
}

export interface GoalContributionPayload {
  amount: string | number
  note?: string
  currency?: string
}

export interface BusinessSalePayload {
  category?: number | null
  amount: string | number
  description?: string
  date: string
  payment_method?: string
  customer_name?: string
  invoice_number?: string
  currency?: string
}

export interface BusinessExpensePayload {
  category?: number | null
  amount: string | number
  description?: string
  date: string
  payment_method?: string
  supplier?: string
  invoice_number?: string
  is_tax_deductible?: boolean
  currency?: string
}

export interface SubscriptionPaymentProofPayload {
  file: { uri: string; name: string; type: string }
  notes?: string
}

export interface CopilotFxFact {
  original_amount?: string
  original_currency?: string
  converted_amount?: string
  target_currency?: string
  exchange_rate?: string
  source?: string
  provider_updated_at?: string | null
  stale?: boolean
  freshness?: string
  error?: string
}

export interface CopilotProposedAction {
  id: string
  type: string
  status: 'pending' | 'confirmed' | 'cancelled'
  summary?: string
  payload?: Record<string, string | number>
}

export interface CopilotFacts {
  intent?: string
  currency?: string
  income?: string
  expenses?: string
  balance?: string
  budget_remaining?: string | null
  debt_total?: string
  categories?: { name: string; amount: string; currency?: string }[]
  fx?: CopilotFxFact | null
  missing?: string[]
  health?: { score?: number; grade?: string }
}

export interface ChatMessageDto {
  id?: number
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at?: string
  facts?: CopilotFacts | null
  proposed_action?: CopilotProposedAction | null
}

export interface AIConversationResponse {
  conversation_id: number
  conversation_title?: string
  user_message?: ChatMessageDto
  assistant_message?: ChatMessageDto
  facts?: CopilotFacts
  proposed_action?: CopilotProposedAction | null
  error?: string
}

export interface LoginResponse {
  token: string
  user: import('./index').User
}

export interface SocialConfigResponse {
  google_client_id: string
  google_client_id_ios: string
  google_client_id_android: string
  facebook_app_id: string
  apple_bundle_id: string
  google_enabled: boolean
  facebook_enabled: boolean
  tiktok_enabled: boolean
  apple_enabled: boolean
}

export interface SocialAuthResult {
  status?: string
  token?: string
  user?: import('./index').User
  link_token?: string
  email?: string
  provider?: string
  message?: string
  created?: boolean
}

export interface SocialLoginMethods {
  email: boolean
  email_address: string | null
  email_verified: boolean
  google: boolean
  facebook: boolean
  tiktok: boolean
  apple: boolean
  providers: string[]
}

export interface TaskPayload {
  title: string
  description?: string
  due_date?: string | null
  due_time?: string | null
  priority?: string
  status?: string
  category?: number | string | null
  is_recurring?: boolean
  recurrence_pattern?: string | null
}

export interface TargetPayload {
  title: string
  description?: string
  target_type?: string
  target_value?: string | number | null
  current_value?: string | number
  unit?: string
  start_date: string
  target_date: string
  status?: string
  milestones?: unknown[]
}

export type UploadFilePayload = { uri: string; name: string; type: string }

export interface ExpenseCategorySummary {
  category_name?: string
  category__name?: string
  category_icon?: string
  total?: string | number
  amount?: string | number
  count?: number
}

export interface ExpenseSummary {
  total?: string | number
  total_expenses?: string | number
  count?: number
  by_category?: ExpenseCategorySummary[]
}

export interface BusinessMetrics {
  total_sales?: string | number
  total_expenses?: string | number
  profit?: string | number
  profit_margin?: string | number
}

export interface TargetStats {
  total?: number
  active?: number
  completed?: number
  paused?: number
}

export interface AnalyticsDebtPayoff {
  id?: number
  creditor?: string
  remaining?: string | number
  months_to_payoff?: number
  message?: string
}

export interface AnalyticsSavingsProjection {
  id?: number
  title?: string
  suggested_monthly?: string | number
  goal_title?: string
  projected_date?: string
  message?: string
}

export interface AnalyticsSpendingForecast {
  month?: number
  year?: number
  projected_expenses?: string | number
  category?: string
  forecast_amount?: string | number
  message?: string
}

export interface AnalyticsPayload {
  debt_payoff?: AnalyticsDebtPayoff[]
  savings_projection?: AnalyticsSavingsProjection[]
  spending_forecast?: AnalyticsSpendingForecast[]
}

export interface SharedGoalSummary {
  id: number
  title: string
  target_amount?: string
  current_amount?: string
  currency?: string
  progress_percentage?: number
  target_date?: string | null
}

export type FamilyRole = 'owner' | 'adult' | 'child' | 'viewer'
export type FamilyMemberStatus = 'active' | 'pending' | 'declined'
export type FamilyVisibility = 'private' | 'family' | 'selected'
export type FamilyEntryKind =
  | 'income'
  | 'expense'
  | 'debt'
  | 'payment'
  | 'contribution'
  | 'settlement'
  | 'bill'

export interface FamilyMember {
  id: number
  user: number
  user_email?: string
  display_name?: string
  role: FamilyRole
  status: FamilyMemberStatus
  joined_at?: string
}

export interface FamilyEntryShare {
  id: number
  user: number
  share_amount: string
  settled: boolean
}

export interface FamilyEntry {
  id: number
  space: number
  user: number
  kind: FamilyEntryKind
  title: string
  category?: string
  amount: string
  currency: string
  converted_amount?: string | null
  exchange_rate?: string | null
  exchange_rate_source?: string
  exchange_rate_timestamp?: string | null
  visibility: FamilyVisibility
  paid_by?: number | null
  paid_by_name?: string
  due_date?: string | null
  date: string
  notes?: string
  shares?: FamilyEntryShare[]
  created_at?: string
}

export interface FamilyActivity {
  id: number
  user?: number | null
  message: string
  created_at: string
}

export interface FamilySpace {
  id: number
  name: string
  owner: number
  invite_code: string
  invite_url: string
  currency: string
  description?: string
  require_approval: boolean
  invite_expires_at?: string | null
  members?: FamilyMember[]
  member_count?: number
  shared_goals?: SharedGoalSummary[]
  shared_budgets?: FamilyBudget[]
  created_at?: string
}

export interface FamilyBudget {
  id: number
  space: number
  name: string
  amount: string
  spent: string
  currency: string
  month: number
  year: number
  visibility?: FamilyVisibility
}

export interface FamilyPreview {
  id: number
  name: string
  currency: string
  member_count: number
  require_approval: boolean
}

export interface FamilyDashboard {
  currency: string
  income: string
  expenses: string
  balance: string
  savings: string
  debts: string
  budget_amount: string
  budget_spent: string
  budget_remaining?: string
  budget_pct: number
  goals_active: number
  goals?: SharedGoalSummary[]
  budgets?: FamilyBudget[]
  upcoming: FamilyEntry[]
  activity: FamilyActivity[]
  members: FamilyMember[]
  pending: FamilyMember[]
}

export interface FamilySettleSuggestion {
  from_user: number
  from_name?: string
  to_user: number
  to_name?: string
  amount: string
  currency: string
}

export interface PaidAccessResult {
  hasAccess: boolean
  hasExpiredSubscription: boolean
  planTier: 'free' | 'premium' | 'business' | 'family'
  features: string[]
}

export interface PublicZendaFeature {
  id: number
  icon?: string
  image_url?: string | null
  category: string
  title: string
  description: string
  is_premium?: boolean
}

export interface PublicZendaContent {
  id?: number
  headline?: string
  subheadline?: string
  what_is?: string
  who_it_helps?: string
  benefits?: string[]
  features?: PublicZendaFeature[]
  app_store_url?: string
  play_store_url?: string
  monthly_price_kz?: string | number
  screenshots?: { id: number; image_url: string | null; caption?: string }[]
}

export interface PublicSiteSettings {
  contact_email?: string
  whatsapp_number?: string
  phone?: string
  instagram_url?: string
  linkedin_url?: string
  youtube_url?: string
  tiktok_url?: string
  calendly_url?: string
  brand_name?: string
  brand_tagline?: string
  footer_description?: string
  contact_label?: string
  contact_title?: string
  contact_subtitle?: string
  play_store_label?: string
  app_store_label?: string
  what_is_label?: string
  who_label?: string
}

export interface PublicFAQ {
  id: number
  category: string
  question: string
  answer: string
  order: number
}

export function isApiError(error: unknown): error is ApiError {
  return typeof error === 'object' && error !== null && 'isAxiosError' in error
}

export function getApiErrorMessage(error: unknown, fallback = 'api.errors.generic'): string {
  const looksTechnical = (msg: string) => {
    const trimmed = msg.trim()
    if (!trimmed || trimmed === '<' || trimmed.startsWith('<')) return true
    return /network error|timeout|econnrefused|enotfound|status code|axios|request failed|<html|<!doctype|traceback|django|json parse|unexpected token/i.test(
      trimmed,
    )
  }

  if (!isApiError(error)) {
    if (error instanceof Error && error.message) {
      if (error.message.startsWith('api.')) return error.message
      if (looksTechnical(error.message)) return fallback
      if (error.message.length > 280) return fallback
      return error.message
    }
    return fallback
  }
  if (!error.response) return 'api.errors.network'
  if (error.response.status >= 500) return 'api.errors.server'
  const data = error.response.data as unknown
  if (!data) return fallback
  if (typeof data === 'string') {
    return looksTechnical(data) ? fallback : data.trim().slice(0, 280)
  }
  if (typeof data !== 'object') return fallback
  const record = data as ApiErrorBody
  let pick =
    (typeof record.detail === 'string' && record.detail) ||
    (typeof record.error === 'string' && record.error) ||
    (typeof record.message === 'string' && record.message) ||
    (record.non_field_errors?.[0] && String(record.non_field_errors[0])) ||
    (record.email && String(Array.isArray(record.email) ? record.email[0] : record.email)) ||
    (record.password && String(Array.isArray(record.password) ? record.password[0] : record.password)) ||
    ''
  if (!pick) {
    for (const [key, value] of Object.entries(record)) {
      if (key === 'refresh_error' || key === 'code') continue
      if (typeof value === 'string' && value.trim()) {
        pick = value.trim()
        break
      }
      if (Array.isArray(value) && value[0]) {
        pick = String(value[0])
        break
      }
    }
  }
  if (!pick || looksTechnical(pick) || pick.length > 280) return fallback
  return pick
}

export function unwrapList<T>(data: T[] | PaginatedResponse<T>): T[] {
  if (Array.isArray(data)) return data
  return data.results ?? []
}

/** Some endpoints wrap payload in `{ data: T }`. */
export function unwrapEnvelope<T>(payload: T | { data?: T }): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const wrapped = payload as { data?: T }
    if (wrapped.data !== undefined) return wrapped.data
  }
  return payload as T
}

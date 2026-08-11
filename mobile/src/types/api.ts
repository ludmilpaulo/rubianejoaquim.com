import type { AxiosError } from 'axios'

/** Django/DRF error body shapes */
export interface ApiErrorBody {
  error?: string
  detail?: string
  message?: string
  non_field_errors?: string[]
  email?: string | string[]
  password?: string | string[]
  username?: string | string[]
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
}

export interface DebtPayload {
  creditor: string
  total_amount: string | number
  paid_amount?: string | number
  due_date: string
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

export interface ChatMessageDto {
  id?: number
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at?: string
}

export interface AIConversationResponse {
  conversation_id: number
  conversation_title?: string
  user_message?: ChatMessageDto
  assistant_message?: ChatMessageDto
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
  progress_percentage?: number
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
  if (!isApiError(error)) {
    if (error instanceof Error && error.message) return error.message
    return fallback
  }
  const data = error.response?.data
  if (!data) return error.message || fallback
  if (typeof data.detail === 'string') return data.detail
  if (typeof data.error === 'string') return data.error
  if (typeof data.message === 'string') return data.message
  if (data.non_field_errors?.[0]) return String(data.non_field_errors[0])
  if (data.email?.[0]) return String(Array.isArray(data.email) ? data.email[0] : data.email)
  if (data.password?.[0]) return String(Array.isArray(data.password) ? data.password[0] : data.password)
  return fallback
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

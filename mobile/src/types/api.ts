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
}

export interface GoalPayload {
  title: string
  description?: string
  target_amount: string | number
  current_amount?: string | number
  target_date: string
  status?: 'active' | 'completed' | 'cancelled'
}

export interface DebtPayload {
  creditor: string
  total_amount: string | number
  paid_amount?: string | number
  due_date: string
  status?: 'active' | 'paid' | 'overdue' | 'cancelled'
  notes?: string
}

export interface DebtPaymentPayload {
  amount: string | number
  payment_date?: string
  note?: string
}

export interface GoalContributionPayload {
  amount: string | number
  note?: string
}

export interface BusinessSalePayload {
  category?: number | null
  amount: string | number
  description?: string
  date: string
  payment_method?: string
  customer_name?: string
  invoice_number?: string
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

export function isApiError(error: unknown): error is ApiError {
  return typeof error === 'object' && error !== null && 'isAxiosError' in error
}

export function getApiErrorMessage(error: unknown, fallback = 'Ocorreu um erro'): string {
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

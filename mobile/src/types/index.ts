// User Types
export interface NotificationPrefs {
  enabled?: boolean
  budget_warnings?: boolean
  budget_exceeded?: boolean
  debt_reminders?: boolean
  savings_reminders?: boolean
  monthly_summary?: boolean
  goal_reminders?: boolean
  subscription_reminders?: boolean
}

export interface User {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
  phone?: string
  referral_code?: string
  preferred_locale?: string
  preferred_currency?: string
  onboarding_completed?: boolean
  onboarding_goals?: string[]
  finance_level?: string
  dark_mode?: boolean
  notification_prefs?: NotificationPrefs
  is_staff: boolean
  is_superuser: boolean
  is_admin: boolean
  is_instructor?: boolean
  is_mentor?: boolean
  is_tutor?: boolean
}

export interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  hasPaidAccess: boolean
  /** True when trial/subscription expired but user has subscription record → Profile-only to pay & upload POP */
  hasExpiredSubscription: boolean
  /**
   * Prevents "AccessDenied" flicker:
   * - false: access not checked yet for current session/user
   * - true: access checked at least once (hasPaidAccess is reliable)
   */
  accessChecked: boolean
  planTier: 'free' | 'premium' | 'business' | 'family'
  features: string[]
}

// Enrollment & Mentorship Types
export interface Enrollment {
  id: number
  course: {
    id: number
    title: string
    slug: string
  }
  status: 'pending' | 'active' | 'cancelled'
  created_at: string
}

export interface MentorshipRequest {
  id: number
  package: {
    id: number
    title: string
  }
  status: 'pending' | 'approved' | 'scheduled' | 'completed' | 'cancelled'
  created_at: string
}

// Personal Finance Types
export interface Expense {
  id: number
  amount: number
  category: string
  description: string
  date: string
  currency?: string
  created_at: string
}

export interface Budget {
  id: number
  category: string
  amount: number
  period: 'weekly' | 'monthly' | 'yearly'
  spent: number
  date?: string
  currency?: string
  created_at: string
}

export interface Goal {
  id: number
  title: string
  target_amount: number
  current_amount: number
  deadline: string
  currency?: string
  created_at: string
}

// Business Finance Types
export interface Sale {
  id: number
  amount: number
  description: string
  date: string
  currency?: string
  created_at: string
}

export interface BusinessExpense {
  id: number
  amount: number
  category: string
  description: string
  date: string
  currency?: string
  invoice_number?: string
  created_at: string
}

export interface BusinessMetrics {
  total_sales: number
  total_expenses: number
  profit: number
  period: string
}

// Education Types
export interface Lesson {
  id: number
  title: string
  description: string
  duration: number
  is_completed: boolean
  course: {
    id: number
    title: string
  }
}

export interface Progress {
  level: number
  xp: number
  streak: number
  lessons_completed: number
  certificates: number
}

// Mobile app subscription
export interface MobileAppSubscription {
  id: number
  status: 'trial' | 'active' | 'expired' | 'cancelled'
  trial_ends_at: string | null
  subscription_ends_at: string | null
  has_access: boolean
  days_until_expiry: number | null
  created_at: string
  updated_at: string
}

export interface SubscriptionPaymentInfo {
  monthly_price_kz: number
  currency: string
  iban: string
  payee_name: string
}

export interface CheckoutOptions {
  country: string
  method: 'proof_of_payment' | 'card' | 'apple_iap'
  methods: Array<'proof_of_payment' | 'card' | 'apple_iap'>
  ikhokha_enabled: boolean
  plan: { amount: string; currency: string; tier?: string }
  charge: { amount: string; currency: string }
  estimate: { amount: string; currency: string; is_estimate: boolean } | null
  proof_of_payment: SubscriptionPaymentInfo | null
}

export interface SubscriptionPaymentRecord {
  id: number
  external_id: string
  amount: string
  currency: string
  plan_amount: string
  plan_currency: string
  method_label: string
  gateway_label: string
  status: string
  transaction_id: string
  receipt_url: string | null
  created_at: string
}

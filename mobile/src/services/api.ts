import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getApiBaseUrl } from '../config/api'
import { logger } from '../utils/logger'
import type {
  AIConversationResponse,
  BudgetPayload,
  BusinessExpensePayload,
  BusinessSalePayload,
  CategoryPayload,
  DebtPayload,
  ExpensePayload,
  FinanceQueryParams,
  GoalPayload,
  GoalContributionPayload,
  DebtPaymentPayload,
  IncomePayload,
  ApiErrorBody,
  LoginResponse,
  PublicFAQ,
  PublicSiteSettings,
  PublicZendaContent,
  TargetPayload,
  TaskPayload,
  UploadFilePayload,
} from '../types/api'
import { getApiErrorMessage, isApiError, unwrapList } from '../types/api'

const API_BASE_URL = getApiBaseUrl()
logger.info('API Base URL configured')

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000, // 30 second timeout (increased for production)
  // For production HTTPS, ensure SSL validation
  validateStatus: function (status) {
    return status >= 200 && status < 500; // Don't throw on 4xx errors
  },
})

// Request interceptor to add token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Token ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor: reject 4xx (validateStatus accepts them without throwing)
api.interceptors.response.use(
  (response) => {
    if (response.status >= 400) {
      const body = (response.data || {}) as ApiErrorBody
      const fieldError =
        (Array.isArray(body.email) ? body.email[0] : undefined) ||
        (Array.isArray(body.password) ? body.password[0] : undefined) ||
        (Array.isArray(body.non_field_errors) ? body.non_field_errors[0] : undefined)
      const message =
        (typeof body.detail === 'string' ? body.detail : undefined) ||
        (typeof body.error === 'string' ? body.error : undefined) ||
        (typeof body.message === 'string' ? body.message : undefined) ||
        fieldError ||
        `Request failed (${response.status})`
      return Promise.reject(new Error(message))
    }
    return response
  },
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      await AsyncStorage.removeItem('token')
      await AsyncStorage.removeItem('user')
    }
    return Promise.reject(error)
  }
)

// Test API connectivity
export const testApiConnection = async () => {
  try {
    logger.info('🧪 Testing API connection to:', API_BASE_URL)
    const response = await api.get('/auth/me/', { timeout: 10000 })
    logger.info('✅ API connection test successful:', response.status)
    return { success: true, status: response.status }
  } catch (error: unknown) {
    if (isApiError(error)) {
      logger.error('API connection test failed:', {
        code: error.code,
        message: error.message,
        status: error.response?.status,
      })
      return {
        success: false,
        error: error.message,
        code: error.code,
        status: error.response?.status,
      }
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: message }
  }
}

// App config (e.g. store version for update prompt)
export const configApi = {
  getAppVersion: async () => {
    const response = await api.get<{
      ios: string
      android: string
      ios_store_url?: string
      android_store_url?: string
    }>('/config/app-version/', { timeout: 8000 })
    return response.data
  },
}

// Public CMS content shared with the website. Django localizes by the lang query.
export const publicApi = {
  getZenda: async (locale: string) => {
    const response = await api.get<PublicZendaContent>('/public/zenda/', {
      params: { lang: locale },
      timeout: 10000,
    })
    return response.data || {}
  },

  getSiteSettings: async (locale: string) => {
    const response = await api.get<PublicSiteSettings>('/public/site-settings/', {
      params: { lang: locale },
      timeout: 10000,
    })
    return response.data || {}
  },

  getFaqs: async (locale: string, category?: string) => {
    const response = await api.get<PublicFAQ[] | { results?: PublicFAQ[] }>('/public/faqs/', {
      params: { lang: locale, category },
      timeout: 10000,
    })
    return unwrapList(response.data)
  },
}

// Auth API
export const authApi = {
  login: async (emailOrUsername: string, password: string) => {
    try {
      logger.info('Attempting login')

      const response = await api.post('/auth/login/', {
        email: emailOrUsername,
        password,
      })

      logger.info('Login response status:', response.status)
      
      if (response.status >= 200 && response.status < 300) {
        return response.data as LoginResponse
      } else {
        const errorData = (response.data || {}) as ApiErrorBody
        const errorMsg = errorData.email?.[0] ||
                        errorData.password?.[0] ||
                        errorData.non_field_errors?.[0] ||
                        errorData.error ||
                        `Erro ao fazer login (status: ${response.status})`
        throw new Error(errorMsg)
      }
    } catch (error: unknown) {
      if (isApiError(error)) {
        if (
          error.code === 'ECONNREFUSED' ||
          error.code === 'ENOTFOUND' ||
          error.code === 'ETIMEDOUT' ||
          error.message?.includes('Network Error') ||
          error.message?.includes('timeout')
        ) {
          throw new Error('api.errors.network')
        }
        throw new Error(getApiErrorMessage(error, 'api.errors.login.failed'))
      }
      throw new Error(getApiErrorMessage(error, 'api.errors.login.unknown'))
    }
  },
  
  register: async (data: {
    email: string
    username: string
    password: string
    password_confirm: string
    first_name: string
    last_name: string
    phone?: string
    preferred_currency?: string
    device_region?: string
  }) => {
    const response = await api.post('/auth/register/', data)
    return response.data
  },
  
  me: async () => {
    const response = await api.get('/auth/me/')
    return response.data
  },

  updateProfile: async (data: Record<string, unknown>) => {
    const response = await api.patch('/auth/profile/', data)
    return response.data
  },
  
  requestAccountDeletion: async () => {
    const response = await api.post('/auth/request-deletion/')
    return response.data
  },

  requestPasswordReset: async (email: string) => {
    const response = await api.post('/auth/forgot-password/', { email: email.trim().toLowerCase() })
    return response.data
  },

  confirmPasswordReset: async (uid: string, token: string, newPassword: string) => {
    const response = await api.post('/auth/password-reset-confirm/', {
      uid,
      token,
      new_password: newPassword,
    })
    return response.data
  },
}

// Access Verification API
export const accessApi = {
  // Paid access = course enrollment OR mentorship OR mobile app subscription
  // AccessDenied only shows when user has NO course enrollment AND NO subscription (and no mentorship)
  checkPaidAccess: async () => {
    try {
      const [enrollmentsRes, mentorshipRes, subscriptionRes] = await Promise.all([
        api.get('/course/enrollment/').catch(() => ({ data: { results: [] } })),
        api.get('/mentorship/request/').catch(() => ({ data: { results: [] } })),
        api.get('/subscriptions/mobile/me/').catch(() => ({ data: { has_access: false, subscription: null } })),
      ])
      
      const enrollments = enrollmentsRes.data?.results || enrollmentsRes.data || []
      const mentorshipRequests = mentorshipRes.data?.results || mentorshipRes.data || []
      
      // Subscription access: use backend's has_access only (it checks trial_ends_at and subscription_ends_at).
      // Do NOT fallback to status === 'trial'|'active' - that would grant access after expiry.
      const hasMobileSubscription = subscriptionRes.data?.has_access === true
      const subscription = subscriptionRes.data?.subscription
      
      const hasActiveEnrollment = Array.isArray(enrollments) && 
        enrollments.some((e: { status?: string }) => e.status === 'active')

      const hasApprovedMentorship = Array.isArray(mentorshipRequests) &&
        mentorshipRequests.some((m: { status?: string }) =>
          m.status === 'approved' || m.status === 'scheduled' || m.status === 'completed'
        )
      
      // User has access if they have ANY of: course enrollment, mentorship, or valid subscription
      const hasAccess = hasActiveEnrollment || hasApprovedMentorship || hasMobileSubscription
      
      // Expired subscription: no access but has subscription record → allow Profile-only to pay & upload POP
      const hasExpiredSubscription = !hasAccess && subscription != null && subscriptionRes.data?.has_access === false
      
      if (__DEV__) {
        logger.info('🔍 Access check:', {
          hasActiveEnrollment,
          hasApprovedMentorship,
          hasMobileSubscription,
          hasExpiredSubscription,
          subscriptionStatus: subscription?.status,
          hasAccess,
        })
      }
      
      const planTier = subscriptionRes.data?.effective_tier || subscription?.plan_tier || 'premium'
      const features: string[] = subscriptionRes.data?.features || []

      return { hasAccess, hasExpiredSubscription, planTier, features }
    } catch (error) {
      logger.error('Error checking paid access:', error)
      return { hasAccess: false, hasExpiredSubscription: false, planTier: 'free' as const, features: [] as string[] }
    }
  },
  
  getEnrollments: async () => {
    const response = await api.get('/course/enrollment/')
    return response.data.results || response.data
  },
  
  getMentorshipRequests: async () => {
    const response = await api.get('/mentorship/request/')
    return response.data.results || response.data
  },

  // Mobile app subscription (1 week free, then 10,000 Kz/month)
  getMobileSubscription: async () => {
    const response = await api.get('/subscriptions/mobile/me/')
    return response.data
  },

  getSubscriptionPaymentInfo: async () => {
    const response = await api.get('/subscriptions/mobile/payment-info/')
    return response.data
  },
  
  subscribeToMobileApp: async () => {
    const response = await api.post('/subscriptions/mobile/subscribe/')
    if (response.status < 200 || response.status >= 300) {
      const msg =
        response.data?.detail ||
        (typeof response.data?.error === 'string' ? response.data.error : null) ||
        response.data?.message ||
        `Erro ao ativar (${response.status})`
      throw new Error(msg || 'api.errors.subscription.trialFailed')
    }
    return response.data
  },
  
  uploadSubscriptionPaymentProof: async (subscriptionId: number, file: UploadFilePayload, notes?: string) => {
    const formData = new FormData()
    formData.append('file', file as unknown as Blob)
    if (notes) formData.append('notes', notes)
    const response = await api.post(`/subscriptions/mobile/${subscriptionId}/upload-proof/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
}

// Apple In-App Purchase verification
export const iapApi = {
  verifyApplePurchase: async (receiptData: string, productId: string, transactionId?: string) => {
    const response = await api.post('/subscriptions/iap/verify-apple/', {
      receipt_data: receiptData,
      product_id: productId,
      transaction_id: transactionId,
    })
    if (response.status >= 400) {
      const body = response.data as ApiErrorBody | undefined
      const detail = typeof body?.detail === 'string' ? body.detail : body?.error
      throw new Error(detail || 'Purchase verification failed')
    }
    return response.data
  },
}

// Personal Finance API
export const personalFinanceApi = {
  // Categories
  getCategories: async (isPersonal?: boolean) => {
    const params = isPersonal !== undefined ? { is_personal: isPersonal } : {}
    const response = await api.get('/finance/categories/', { params })
    return response.data
  },
  
  createCategory: async (data: CategoryPayload) => {
    const response = await api.post('/finance/categories/', data)
    return response.data
  },
  
  updateCategory: async (id: number, data: Partial<CategoryPayload>) => {
    const response = await api.patch(`/finance/categories/${id}/`, data)
    return response.data
  },
  
  deleteCategory: async (id: number) => {
    const response = await api.delete(`/finance/categories/${id}/`)
    return response.data
  },
  
  // Expenses
  getExpenses: async (month?: number, year?: number, category?: number, dateFrom?: string, dateTo?: string) => {
    const params: FinanceQueryParams = {}
    if (dateFrom && dateTo) {
      params.date_from = dateFrom
      params.date_to = dateTo
    } else {
      if (month) params.month = month
      if (year) params.year = year
    }
    if (category) params.category = category
    const response = await api.get('/finance/personal/expenses/', { params })
    return response.data
  },
  
  getExpense: async (id: number) => {
    const response = await api.get(`/finance/personal/expenses/${id}/`)
    return response.data
  },
  
  createExpense: async (data: ExpensePayload) => {
    const response = await api.post('/finance/personal/expenses/', data)
    return response.data
  },
  
  updateExpense: async (id: number, data: Partial<ExpensePayload>) => {
    const response = await api.patch(`/finance/personal/expenses/${id}/`, data)
    return response.data
  },
  
  deleteExpense: async (id: number) => {
    const response = await api.delete(`/finance/personal/expenses/${id}/`)
    return response.data
  },
  
  getExpensesSummary: async (params?: { period?: string; month?: number; year?: number; date_from?: string; date_to?: string }) => {
    const response = await api.get('/finance/personal/expenses/summary/', { params: params || {} })
    return response.data
  },
  
  // Budgets
  getBudgets: async (month?: number, year?: number, dateFrom?: string, dateTo?: string) => {
    const params: FinanceQueryParams = {}
    if (dateFrom && dateTo) {
      params.date_from = dateFrom
      params.date_to = dateTo
    } else {
      if (month) params.month = month
      if (year) params.year = year
    }
    const response = await api.get('/finance/personal/budgets/', { params })
    return response.data
  },
  
  getBudget: async (id: number) => {
    const response = await api.get(`/finance/personal/budgets/${id}/`)
    return response.data
  },
  
  createBudget: async (data: BudgetPayload) => {
    const response = await api.post('/finance/personal/budgets/', data)
    return response.data
  },
  
  updateBudget: async (id: number, data: Partial<BudgetPayload>) => {
    const response = await api.patch(`/finance/personal/budgets/${id}/`, data)
    return response.data
  },
  
  deleteBudget: async (id: number) => {
    const response = await api.delete(`/finance/personal/budgets/${id}/`)
    return response.data
  },

  getBudgetExpenses: async (budgetId: number) => {
    const response = await api.get(`/finance/personal/budgets/${budgetId}/expenses/`)
    return response.data
  },
  
  // Goals
  getGoals: async (status?: string) => {
    const params = status ? { status } : {}
    const response = await api.get('/finance/personal/goals/', { params })
    return response.data
  },
  
  getGoal: async (id: number) => {
    const response = await api.get(`/finance/personal/goals/${id}/`)
    return response.data
  },
  
  createGoal: async (data: GoalPayload) => {
    const response = await api.post('/finance/personal/goals/', data)
    return response.data
  },
  
  updateGoal: async (id: number, data: Partial<GoalPayload>) => {
    const response = await api.patch(`/finance/personal/goals/${id}/`, data)
    return response.data
  },
  
  addMoneyToGoal: async (id: number, amount: number, note?: string) => {
    const response = await api.post(`/finance/personal/goals/${id}/add-money/`, { amount, note })
    return response.data
  },

  payDebt: async (id: number, data: DebtPaymentPayload) => {
    const response = await api.post(`/finance/personal/debts/${id}/pay/`, data)
    return response.data
  },
  
  deleteGoal: async (id: number) => {
    const response = await api.delete(`/finance/personal/goals/${id}/`)
    return response.data
  },
  
  // Debts
  getDebts: async (status?: string) => {
    const params = status ? { status } : {}
    const response = await api.get('/finance/personal/debts/', { params })
    return response.data
  },
  
  getDebt: async (id: number) => {
    const response = await api.get(`/finance/personal/debts/${id}/`)
    return response.data
  },
  
  createDebt: async (data: DebtPayload) => {
    const response = await api.post('/finance/personal/debts/', data)
    return response.data
  },
  
  updateDebt: async (id: number, data: Partial<DebtPayload>) => {
    const response = await api.patch(`/finance/personal/debts/${id}/`, data)
    return response.data
  },
  
  deleteDebt: async (id: number) => {
    const response = await api.delete(`/finance/personal/debts/${id}/`)
    return response.data
  },

  getDashboard: async () => {
    const response = await api.get('/finance/dashboard/')
    return response.data
  },

  getHealthHistory: async (months = 6) => {
    const response = await api.get('/finance/dashboard/health-history/', { params: { months } })
    return response.data.history || []
  },

  getAnalytics: async () => {
    const response = await api.get('/finance/dashboard/analytics/')
    return response.data
  },

  getHealthScore: async (month?: number, year?: number) => {
    const response = await api.get('/finance/dashboard/health_score/', {
      params: { month, year },
    })
    return response.data
  },

  getIncome: async (month?: number, year?: number) => {
    const params: Record<string, number> = {}
    if (month) params.month = month
    if (year) params.year = year
    const response = await api.get('/finance/personal/income/', { params })
    return response.data
  },

  createIncome: async (data: IncomePayload) => {
    const response = await api.post('/finance/personal/income/', data)
    return response.data
  },

  updateIncome: async (id: number, data: Partial<IncomePayload>) => {
    const response = await api.patch(`/finance/personal/income/${id}/`, data)
    return response.data
  },

  deleteIncome: async (id: number) => {
    const response = await api.delete(`/finance/personal/income/${id}/`)
    return response.data
  },

  getIncomeSummary: async (params?: { period?: string; month?: number; year?: number }) => {
    const response = await api.get('/finance/personal/income/summary/', { params: params || {} })
    return response.data
  },

  getExchangeRates: async () => {
    const response = await api.get('/finance/exchange-rates/')
    return response.data
  },

  convertCurrency: async (amount: number, from: string, to: string) => {
    const response = await api.get('/finance/exchange-rates/convert/', {
      params: { amount, from, to },
    })
    return response.data
  },
}

// Business Finance API
export const businessFinanceApi = {
  // Categories
  getCategories: async (isBusiness?: boolean) => {
    const params = isBusiness !== undefined ? { is_business: isBusiness } : {}
    const response = await api.get('/finance/categories/', { params })
    return response.data
  },
  
  createCategory: async (data: CategoryPayload) => {
    const response = await api.post('/finance/categories/', data)
    return response.data
  },
  
  updateCategory: async (id: number, data: Partial<CategoryPayload>) => {
    const response = await api.patch(`/finance/categories/${id}/`, data)
    return response.data
  },
  
  deleteCategory: async (id: number) => {
    const response = await api.delete(`/finance/categories/${id}/`)
    return response.data
  },
  
  // Sales
  getSales: async (month?: number, year?: number, dateFrom?: string, dateTo?: string) => {
    const params: FinanceQueryParams = {}
    if (dateFrom && dateTo) {
      params.date_from = dateFrom
      params.date_to = dateTo
    } else {
      if (month) params.month = month
      if (year) params.year = year
    }
    const response = await api.get('/finance/business/sales/', { params })
    return response.data
  },
  
  getSale: async (id: number) => {
    const response = await api.get(`/finance/business/sales/${id}/`)
    return response.data
  },
  
  createSale: async (data: BusinessSalePayload) => {
    const response = await api.post('/finance/business/sales/', data)
    return response.data
  },
  
  updateSale: async (id: number, data: Partial<BusinessSalePayload>) => {
    const response = await api.patch(`/finance/business/sales/${id}/`, data)
    return response.data
  },
  
  deleteSale: async (id: number) => {
    const response = await api.delete(`/finance/business/sales/${id}/`)
    return response.data
  },
  
  getSalesSummary: async (params?: { period?: string; month?: number; year?: number; date_from?: string; date_to?: string }) => {
    const response = await api.get('/finance/business/sales/summary/', { params: params || {} })
    return response.data
  },
  
  // Expenses
  getExpenses: async (month?: number, year?: number, category?: number, dateFrom?: string, dateTo?: string) => {
    const params: FinanceQueryParams = {}
    if (dateFrom && dateTo) {
      params.date_from = dateFrom
      params.date_to = dateTo
    } else {
      if (month) params.month = month
      if (year) params.year = year
    }
    if (category) params.category = category
    const response = await api.get('/finance/business/expenses/', { params })
    return response.data
  },
  
  getExpense: async (id: number) => {
    const response = await api.get(`/finance/business/expenses/${id}/`)
    return response.data
  },
  
  createExpense: async (data: BusinessExpensePayload) => {
    const response = await api.post('/finance/business/expenses/', data)
    return response.data
  },
  
  updateExpense: async (id: number, data: Partial<BusinessExpensePayload>) => {
    const response = await api.patch(`/finance/business/expenses/${id}/`, data)
    return response.data
  },
  
  deleteExpense: async (id: number) => {
    const response = await api.delete(`/finance/business/expenses/${id}/`)
    return response.data
  },
  
  getExpensesSummary: async (params?: { period?: string; month?: number; year?: number; date_from?: string; date_to?: string }) => {
    const response = await api.get('/finance/business/expenses/summary/', { params: params || {} })
    return response.data
  },
  
  // Metrics
  getMetrics: async (params?: { period?: string; month?: number; year?: number; date_from?: string; date_to?: string }) => {
    const response = await api.get('/finance/business/metrics/overview/', { params: params || {} })
    return response.data
  },
}

// Courses API
export const coursesApi = {
  list: async () => {
    const response = await api.get('/course/course/')
    return response.data
  },
  
  get: async (id: number) => {
    const response = await api.get(`/course/course/${id}/`)
    return response.data
  },
  
  myEnrollments: async () => {
    const response = await api.get('/course/enrollment/')
    return response.data
  },

  enroll: async (courseId: number, referralCode?: string) => {
    const data: { course_id: number; referral_code?: string } = { course_id: courseId }
    if (referralCode) {
      data.referral_code = referralCode
    }
    const response = await api.post('/course/enrollment/', data)
    return response.data
  },

  /** file: { uri, name, type } from DocumentPicker (React Native) */
  uploadPaymentProof: async (
    enrollmentId: number,
    file: { uri: string; name: string; type: string },
    notes?: string
  ) => {
    const formData = new FormData()
    formData.append('file', file as unknown as Blob)
    if (notes) formData.append('notes', notes)
    const response = await api.post(
      `/course/enrollment/${enrollmentId}/upload-payment-proof/`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return response.data
  },
  
  getEnrollment: async (id: number) => {
    const response = await api.get(`/course/enrollment/${id}/`)
    return response.data
  },
  
  getEnrollmentProgress: async (id: number) => {
    const response = await api.get(`/course/enrollment/${id}/progress/`)
    return response.data
  },

  getQuizResults: async (enrollmentId: number) => {
    const response = await api.get(`/course/enrollment/${enrollmentId}/quiz-results/`)
    return response.data
  },

  getCertificateInfo: async (enrollmentId: number) => {
    const response = await api.get(`/course/enrollment/${enrollmentId}/certificate-info/`)
    return response.data
  },
}

// Lessons API
export const lessonsApi = {
  list: async (courseId?: number) => {
    const params = courseId ? { course: courseId } : {}
    const response = await api.get('/course/lesson/', { params })
    return response.data
  },
  
  get: async (id: number) => {
    const response = await api.get(`/course/lesson/${id}/`)
    return response.data
  },
  
  markCompleted: async (id: number) => {
    const response = await api.post(`/course/lesson/${id}/mark-completed/`)
    return response.data
  },
  
  getFreeLessons: async () => {
    const response = await api.get('/course/course/free-lesson/')
    return response.data
  },
}

// Lesson Quiz API
export const lessonQuizApi = {
  getByLesson: async (lessonId: number) => {
    const response = await api.get(`/course/lesson-quiz/by-lesson/${lessonId}/`)
    return response.data
  },
  
  submit: async (quizId: number, answers: Array<{ question_id: number; choice_id: number }>) => {
    const response = await api.post(`/course/lesson-quiz/${quizId}/submit/`, { answers })
    return response.data
  },
}

// AI Copilot API
export const aiCopilotApi = {
  getConversations: async () => {
    const response = await api.get('/ai-copilot/conversations/')
    return response.data
  },
  
  getConversation: async (id: number) => {
    const response = await api.get(`/ai-copilot/conversations/${id}/`)
    return response.data
  },
  
  createConversation: async (title?: string) => {
    const response = await api.post('/ai-copilot/conversations/', { title })
    return response.data
  },
  
  deleteConversation: async (id: number) => {
    const response = await api.delete(`/ai-copilot/conversations/${id}/`)
    return response.data
  },
  
  chat: async (message: string, conversationId?: number | null) => {
    try {
      const response = await api.post('/ai-copilot/conversations/chat/', {
        message,
        conversation_id: conversationId || null,
      })
      if (__DEV__) {
        logger.info('📤 AI Copilot chat request:', { message: message.substring(0, 50), conversationId })
        logger.info('✅ AI Copilot chat response:', response.data)
      }
      return response.data
    } catch (error: unknown) {
      if (__DEV__) {
        logger.error('❌ AI Copilot chat error:', getApiErrorMessage(error))
      }
      throw error
    }
  },

  getInsights: async () => {
    const response = await api.get('/ai-copilot/conversations/insights/')
    return response.data
  },

  getMonthlyReport: async () => {
    const response = await api.get('/ai-copilot/conversations/monthly-report/')
    return response.data
  },

  getSavingsPlan: async () => {
    const response = await api.get('/ai-copilot/conversations/savings-plan/')
    return response.data
  },

  getDebtStrategy: async () => {
    const response = await api.get('/ai-copilot/conversations/debt-strategy/')
    return response.data
  },
}

export const financeSpaceApi = {
  listSpaces: async () => {
    const response = await api.get('/finance-space/spaces/')
    return response.data.results || response.data
  },
  createSpace: async (name: string) => {
    const response = await api.post('/finance-space/spaces/', { name })
    return response.data
  },
  joinSpace: async (inviteCode: string) => {
    const response = await api.post('/finance-space/spaces/join/', { invite_code: inviteCode })
    return response.data
  },
  addContribution: async (goalId: number, amount: number, note?: string) => {
    const response = await api.post('/finance-space/contributions/', {
      goal: goalId,
      amount,
      note: note || '',
    })
    return response.data
  },
}

export const receiptApi = {
  list: async () => {
    const response = await api.get('/finance/receipts/')
    return response.data.results || response.data
  },
  upload: async (formData: FormData) => {
    const response = await api.post('/finance/receipts/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
  reprocess: async (id: number) => {
    const response = await api.post(`/finance/receipts/${id}/reprocess/`)
    return response.data
  },
}

// Referral & Points API
export const referralApi = {
  shareCourse: async (courseId: number, platform?: string) => {
    const response = await api.post('/course/referral-share/share-course/', {
      course_id: courseId,
      platform: platform || '',
    })
    return response.data
  },
  
  getReferralPoints: async () => {
    const response = await api.get('/course/referral-points/')
    return response.data
  },
  
  getPointsBalance: async () => {
    const response = await api.get('/course/user-points/balance/')
    return response.data
  },
  
  getPointsHistory: async () => {
    const response = await api.get('/course/user-points/')
    return response.data
  },
  
  redeemCourse: async (courseId: number, pointsToUse?: number) => {
    const data: { course_id: number; points_to_use?: number } = { course_id: courseId }
    if (pointsToUse !== undefined) {
      data.points_to_use = pointsToUse
    }
    const response = await api.post('/course/user-points/redeem-course/', data)
    return response.data
  },
  
  redeemSubscription: async (pointsToUse?: number) => {
    const data: { points_to_use?: number } = {}
    if (pointsToUse !== undefined) {
      data.points_to_use = pointsToUse
    }
    const response = await api.post('/course/user-points/redeem-subscription/', data)
    return response.data
  },
}

// Education API (deprecated - use coursesApi and lessonsApi)
export const educationApi = {
  getLessons: async () => {
    const response = await api.get('/course/lesson/')
    return response.data
  },
  
  getProgress: async () => {
    const response = await api.get('/course/progress/')
    return response.data
  },
}

// Tasks API
export const tasksApi = {
  // Categories
  getCategories: async () => {
    const response = await api.get('/tasks/categories/')
    return response.data
  },
  
  // Tasks
  getTasks: async (status?: string, priority?: string, category?: number, overdue?: boolean) => {
    const params: FinanceQueryParams = {}
    if (status) params.status = status
    if (priority) params.priority = priority
    if (category) params.category = category
    if (overdue) params.overdue = overdue
    const response = await api.get('/tasks/tasks/', { params })
    return response.data
  },
  
  getTask: async (id: number) => {
    const response = await api.get(`/tasks/tasks/${id}/`)
    return response.data
  },
  
  createTask: async (data: TaskPayload) => {
    const response = await api.post('/tasks/tasks/', data)
    return response.data
  },
  
  updateTask: async (id: number, data: Partial<TaskPayload>) => {
    const response = await api.patch(`/tasks/tasks/${id}/`, data)
    return response.data
  },
  
  deleteTask: async (id: number) => {
    const response = await api.delete(`/tasks/tasks/${id}/`)
    return response.data
  },
  
  completeTask: async (id: number) => {
    const response = await api.post(`/tasks/tasks/${id}/complete/`)
    return response.data
  },
  
  getTodayTasks: async () => {
    const response = await api.get('/tasks/tasks/today/')
    return response.data
  },
  
  getUpcomingTasks: async () => {
    const response = await api.get('/tasks/tasks/upcoming/')
    return response.data
  },
  
  getTaskStats: async (params?: { period?: string; month?: number; year?: number; date_from?: string; date_to?: string }) => {
    const response = await api.get('/tasks/tasks/stats/', { params: params || {} })
    return response.data
  },
  
  // Targets
  getTargets: async (status?: string, target_type?: string) => {
    const params: FinanceQueryParams = {}
    if (status) params.status = status
    if (target_type) params.target_type = target_type
    const response = await api.get('/tasks/targets/', { params })
    return response.data
  },

  getTargetStats: async (params?: { period?: string; month?: number; year?: number; date_from?: string; date_to?: string }) => {
    const response = await api.get('/tasks/targets/stats/', { params: params || {} })
    return response.data
  },
  
  getTarget: async (id: number) => {
    const response = await api.get(`/tasks/targets/${id}/`)
    return response.data
  },
  
  createTarget: async (data: TargetPayload) => {
    const response = await api.post('/tasks/targets/', data)
    return response.data
  },
  
  updateTarget: async (id: number, data: Partial<TargetPayload>) => {
    const response = await api.patch(`/tasks/targets/${id}/`, data)
    return response.data
  },
  
  deleteTarget: async (id: number) => {
    const response = await api.delete(`/tasks/targets/${id}/`)
    return response.data
  },
  
  updateTargetProgress: async (id: number, current_value: number) => {
    const response = await api.post(`/tasks/targets/${id}/update_progress/`, { current_value })
    return response.data
  },
  
  // Notifications
  getNotifications: async (is_read?: boolean, type?: string) => {
    const params: FinanceQueryParams = {}
    if (is_read !== undefined) params.is_read = is_read
    if (type) params.type = type
    const response = await api.get('/tasks/notifications/', { params })
    return response.data
  },
  
  getNotification: async (id: number) => {
    const response = await api.get(`/tasks/notifications/${id}/`)
    return response.data
  },
  
  markNotificationRead: async (id: number) => {
    const response = await api.post(`/tasks/notifications/${id}/mark_read/`)
    return response.data
  },
  
  markAllNotificationsRead: async () => {
    const response = await api.post('/tasks/notifications/mark_all_read/')
    return response.data
  },
  
  getUnreadCount: async () => {
    const response = await api.get('/tasks/notifications/unread_count/')
    return response.data
  },
}

export default api

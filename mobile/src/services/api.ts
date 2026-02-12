import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

// API Base URL Configuration
// Use production API by default
// To use local dev server, set EXPO_PUBLIC_API_URL env var or uncomment DEV_IP line below
const DEV_IP = '192.168.1.139' // Local dev server IP (only used if EXPO_PUBLIC_API_URL not set and __DEV__ is true)

const getApiBaseUrl = () => {
  // Check for environment variable override first
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL
  }
  
  // Use production API by default
  // Uncomment the line below to use local dev server in development
  // if (__DEV__) {
  //   return `http://${DEV_IP}:8000/api`
  // }
  
  return 'https://ludmilpaulo.pythonanywhere.com/api'
}

const API_BASE_URL = getApiBaseUrl()
if (__DEV__) {
  console.log('API Base URL:', API_BASE_URL)
}

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

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
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
    console.log('🧪 Testing API connection to:', API_BASE_URL)
    const response = await api.get('/auth/me/', { timeout: 10000 })
    console.log('✅ API connection test successful:', response.status)
    return { success: true, status: response.status }
  } catch (error: any) {
    console.error('❌ API connection test failed:', {
      code: error.code,
      message: error.message,
      status: error.response?.status,
      url: error.config?.url,
      baseURL: error.config?.baseURL,
    })
    return { 
      success: false, 
      error: error.message,
      code: error.code,
      status: error.response?.status 
    }
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

// Auth API
export const authApi = {
  login: async (emailOrUsername: string, password: string) => {
    try {
      console.log('🔐 Attempting login to:', API_BASE_URL + '/auth/login/')
      console.log('📧 Email/Username:', emailOrUsername)
      
      const response = await api.post('/auth/login/', {
        email: emailOrUsername,
        password,
      })
      
      console.log('✅ Login response status:', response.status)
      console.log('✅ Login response data:', response.data)
      
      if (response.status >= 200 && response.status < 300) {
        return response.data
      } else {
        // Handle non-2xx responses
        const errorData = response.data || {}
        const errorMsg = errorData.email?.[0] || 
                        errorData.password?.[0] ||
                        errorData.non_field_errors?.[0] ||
                        errorData.error ||
                        `Erro ao fazer login (status: ${response.status})`
        throw new Error(errorMsg)
      }
    } catch (error: any) {
      // Better error handling
      console.error('❌ Login error details:', {
        code: error.code,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        headers: error.config?.headers,
      })
      
      // Network/connection errors
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
        const errorMsg = `Não foi possível conectar ao servidor.\n\n` +
          `URL: ${error.config?.baseURL || API_BASE_URL}\n` +
          `Erro: ${error.message}\n\n` +
          `Verifique a sua ligação à internet.`
        throw new Error(errorMsg)
      }
      
      if (error.message?.includes('Network Error') || error.message?.includes('timeout')) {
        const errorMsg = `Erro de rede ou timeout.\n\n` +
          `URL: ${error.config?.baseURL || API_BASE_URL}\n` +
          `Verifique a sua ligação à internet.`
        throw new Error(errorMsg)
      }
      
      // SSL/Certificate errors
      if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' || error.message?.includes('certificate')) {
        const errorMsg = `Erro de certificado SSL.\n\n` +
          `Contacte o suporte técnico.`
        throw new Error(errorMsg)
      }
      
      // Backend validation errors
      if (error.response?.data) {
        const errorMsg = error.response.data.email?.[0] || 
                        error.response.data.password?.[0] ||
                        error.response.data.non_field_errors?.[0] ||
                        error.response.data.error ||
                        `Erro ao fazer login (${error.response.status})`
        throw new Error(errorMsg)
      }
      
      // Generic error
      throw new Error(error.message || 'Erro desconhecido ao fazer login')
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
  }) => {
    const response = await api.post('/auth/register/', data)
    return response.data
  },
  
  me: async () => {
    const response = await api.get('/auth/me/')
    return response.data
  },
  
  requestAccountDeletion: async () => {
    const response = await api.post('/auth/request-deletion/')
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
        enrollments.some((e: any) => e.status === 'active')
      
      const hasApprovedMentorship = Array.isArray(mentorshipRequests) && 
        mentorshipRequests.some((m: any) => 
          m.status === 'approved' || m.status === 'scheduled' || m.status === 'completed'
        )
      
      // User has access if they have ANY of: course enrollment, mentorship, or valid subscription
      const hasAccess = hasActiveEnrollment || hasApprovedMentorship || hasMobileSubscription
      
      // Expired subscription: no access but has subscription record → allow Profile-only to pay & upload POP
      const hasExpiredSubscription = !hasAccess && subscription != null && subscriptionRes.data?.has_access === false
      
      if (__DEV__) {
        console.log('🔍 Access check:', {
          hasActiveEnrollment,
          hasApprovedMentorship,
          hasMobileSubscription,
          hasExpiredSubscription,
          subscriptionStatus: subscription?.status,
          hasAccess,
        })
      }
      
      return { hasAccess, hasExpiredSubscription }
    } catch (error) {
      console.error('Error checking paid access:', error)
      return { hasAccess: false, hasExpiredSubscription: false }
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
      const err: any = new Error(msg || 'Não foi possível ativar a semana grátis.')
      err.response = response
      throw err
    }
    return response.data
  },
  
  uploadSubscriptionPaymentProof: async (subscriptionId: number, file: any, notes?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (notes) formData.append('notes', notes)
    const response = await api.post(`/subscriptions/mobile/${subscriptionId}/upload-proof/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
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
  
  createCategory: async (data: any) => {
    const response = await api.post('/finance/categories/', data)
    return response.data
  },
  
  updateCategory: async (id: number, data: any) => {
    const response = await api.patch(`/finance/categories/${id}/`, data)
    return response.data
  },
  
  deleteCategory: async (id: number) => {
    const response = await api.delete(`/finance/categories/${id}/`)
    return response.data
  },
  
  // Expenses
  getExpenses: async (month?: number, year?: number, category?: number, dateFrom?: string, dateTo?: string) => {
    const params: any = {}
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
  
  createExpense: async (data: any) => {
    const response = await api.post('/finance/personal/expenses/', data)
    return response.data
  },
  
  updateExpense: async (id: number, data: any) => {
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
    const params: any = {}
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
  
  createBudget: async (data: any) => {
    const response = await api.post('/finance/personal/budgets/', data)
    return response.data
  },
  
  updateBudget: async (id: number, data: any) => {
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
  
  createGoal: async (data: any) => {
    const response = await api.post('/finance/personal/goals/', data)
    return response.data
  },
  
  updateGoal: async (id: number, data: any) => {
    const response = await api.patch(`/finance/personal/goals/${id}/`, data)
    return response.data
  },
  
  addMoneyToGoal: async (id: number, amount: number) => {
    const response = await api.post(`/finance/personal/goals/${id}/add-money/`, { amount })
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
  
  createDebt: async (data: any) => {
    const response = await api.post('/finance/personal/debts/', data)
    return response.data
  },
  
  updateDebt: async (id: number, data: any) => {
    const response = await api.patch(`/finance/personal/debts/${id}/`, data)
    return response.data
  },
  
  deleteDebt: async (id: number) => {
    const response = await api.delete(`/finance/personal/debts/${id}/`)
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
  
  createCategory: async (data: any) => {
    const response = await api.post('/finance/categories/', data)
    return response.data
  },
  
  updateCategory: async (id: number, data: any) => {
    const response = await api.patch(`/finance/categories/${id}/`, data)
    return response.data
  },
  
  deleteCategory: async (id: number) => {
    const response = await api.delete(`/finance/categories/${id}/`)
    return response.data
  },
  
  // Sales
  getSales: async (month?: number, year?: number, dateFrom?: string, dateTo?: string) => {
    const params: any = {}
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
  
  createSale: async (data: any) => {
    const response = await api.post('/finance/business/sales/', data)
    return response.data
  },
  
  updateSale: async (id: number, data: any) => {
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
    const params: any = {}
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
  
  createExpense: async (data: any) => {
    const response = await api.post('/finance/business/expenses/', data)
    return response.data
  },
  
  updateExpense: async (id: number, data: any) => {
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

  enroll: async (courseId: number) => {
    const response = await api.post('/course/enrollment/', { course_id: courseId })
    return response.data
  },

  /** file: { uri, name, type } from DocumentPicker (React Native) */
  uploadPaymentProof: async (
    enrollmentId: number,
    file: { uri: string; name: string; type: string },
    notes?: string
  ) => {
    const formData = new FormData()
    formData.append('file', file as any)
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
        console.log('📤 AI Copilot chat request:', { message: message.substring(0, 50), conversationId })
        console.log('✅ AI Copilot chat response:', response.data)
      }
      return response.data
    } catch (error: any) {
      if (__DEV__) {
        console.error('❌ AI Copilot chat error:', {
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
        })
      }
      throw error
    }
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
  
  redeemCourse: async (courseId: number) => {
    const response = await api.post('/course/user-points/redeem-course/', {
      course_id: courseId,
    })
    return response.data
  },
  
  redeemSubscription: async () => {
    const response = await api.post('/course/user-points/redeem-subscription/')
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
    const params: any = {}
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
  
  createTask: async (data: any) => {
    const response = await api.post('/tasks/tasks/', data)
    return response.data
  },
  
  updateTask: async (id: number, data: any) => {
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
    const params: any = {}
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
  
  createTarget: async (data: any) => {
    const response = await api.post('/tasks/targets/', data)
    return response.data
  },
  
  updateTarget: async (id: number, data: any) => {
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
    const params: any = {}
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

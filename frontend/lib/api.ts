import axios from 'axios'
import Cookies from 'js-cookie'
import { getApiBaseUrl } from './types/api'
import { logger } from './logger'
import type { ProofListParams, SubscriptionListParams } from './types/subscriptions'

const API_URL = getApiBaseUrl()

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
})

// Helper function to get full URL from relative path (for images/files)
export const getFullUrl = (relativePath: string): string => {
  if (!relativePath) return ''
  if (relativePath.startsWith('http')) return relativePath
  
  // Remove /api from base URL to get backend root
  const backendBase = API_URL.replace('/api', '')
  return `${backendBase}${relativePath}`
}

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  // Only add token if we're in the browser (not SSR)
  if (typeof window !== 'undefined') {
    const token = Cookies.get('token')
    if (token) {
      config.headers.Authorization = `Token ${token}`
    }
  }
  return config
}, (error) => {
  return Promise.reject(error)
})

// Interceptor para lidar com erros 401 (não autorizado) e erros de rede
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors
    if (!error.response) {
      logger.error('Network Error:', {
        message: error.message,
        code: error.code,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
      })
      // Don't redirect on network errors, let the component handle it
      return Promise.reject(error)
    }

    if (error.response?.status === 401) {
      const requestUrl = String(error.config?.url || '')
      // Public invite preview must not wipe the session or bounce off /family/join.
      if (requestUrl.includes('/finance-space/spaces/preview/')) {
        return Promise.reject(error)
      }
      if (typeof window !== 'undefined') {
        Cookies.remove('token')
        if (!window.location.pathname.includes('/login')) {
          const next = `${window.location.pathname}${window.location.search}`
          const login =
            next.startsWith('/family')
              ? `/login?next=${encodeURIComponent(next)}`
              : '/login'
          window.location.href = login
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api

// Auth
export const authApi = {
  register: (data: { email: string; username: string; password: string; password_confirm: string; first_name?: string; last_name?: string; phone?: string; referral_code?: string }) =>
    api.post('/auth/register/', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login/', data),
  logout: () => api.post('/auth/logout/'),
  me: () => api.get('/auth/me/'),
  updateProfile: (data: { first_name?: string; last_name?: string; phone?: string; address?: string; email?: string }) =>
    api.put('/auth/profile/', data),
  requestAccountDeletion: () => api.post('/auth/request-deletion/'),
  requestPasswordReset: (email: string) =>
    api.post('/auth/forgot-password/', { email }),
  confirmPasswordReset: (uid: string, token: string, newPassword: string) =>
    api.post('/auth/password-reset-confirm/', { uid, token, new_password: newPassword }),
  sendAppUpdateNotification: (appVersion: string) =>
    api.post('/auth/send-app-update-notification/', { app_version: appVersion }),
  socialConfig: () =>
    api.get<{
      google_client_id: string
      google_client_id_ios: string
      google_client_id_android: string
      facebook_app_id: string
      google_enabled: boolean
      facebook_enabled: boolean
      tiktok_enabled: boolean
    }>('/auth/social/config/'),
  socialGoogle: (idToken: string) =>
    api.post('/auth/social/google/', { id_token: idToken }),
  socialFacebook: (accessToken: string) =>
    api.post('/auth/social/facebook/', { access_token: accessToken }),
  socialExchange: (exchangeCode: string, provider?: string) =>
    api.post('/auth/social/exchange/', {
      exchange_code: exchangeCode,
      ...(provider ? { provider } : {}),
    }),
  socialTikTokLinkStart: (redirect?: string) =>
    api.post<{ authorize_url: string }>('/auth/social/tiktok/link-start/', {
      redirect: redirect || '/area-do-aluno',
    }),
  socialLinkConfirm: (linkToken: string, password: string) =>
    api.post('/auth/social/link-confirm/', { link_token: linkToken, password }),
  loginMethods: () => api.get('/auth/social/methods/'),
  unlinkSocial: (provider: string) =>
    api.delete<{ status: string; methods: {
      email: boolean
      email_address: string | null
      email_verified: boolean
      google: boolean
      facebook: boolean
      tiktok: boolean
      providers: string[]
    } }>(`/auth/social/${provider}/unlink/`),
}

// Courses
export const coursesApi = {
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get('/course/course/', { params }),
  get: (id: number) => api.get(`/course/course/${id}/`),
  marketplace: () => api.get('/course/course/marketplace/'),
  categories: () => api.get('/course/categories/'),
  freeLessons: () => api.get('/course/course/free-lesson/'),
  enroll: (courseId: number) => api.post('/course/enrollment/', { course_id: courseId }),
  myEnrollments: () => api.get('/course/enrollment/'),
  myLearning: () => api.get('/course/my-learning/'),
  reviews: (courseId: number) => api.get('/course/reviews/', { params: { course: courseId } }),
  createReview: (data: { course: number; rating: number; body: string }) =>
    api.post('/course/reviews/', data),
  issueCertificate: (enrollmentId: number) =>
    api.post('/course/certificates/issue/', { enrollment_id: enrollmentId }),
  verifyCertificate: (code: string) => api.get(`/course/certificates/verify/${code}/`),
  myCertificates: () => api.get('/course/certificates/'),
  uploadPaymentProof: (enrollmentId: number, file: File, notes?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (notes) formData.append('notes', notes)
    return api.post(`/course/enrollment/${enrollmentId}/upload-payment-proof/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getQuizResults: (enrollmentId: number) => api.get(`/course/enrollment/${enrollmentId}/quiz-results/`),
  retakeCourse: (enrollmentId: number) => api.post(`/course/enrollment/${enrollmentId}/retake-course/`),
  getCertificateInfo: (enrollmentId: number) => api.get(`/course/enrollment/${enrollmentId}/certificate-info/`),
}

// Lessons
export const lessonsApi = {
  get: (id: number) => api.get(`/course/lesson/${id}/`),
  list: (courseId?: number) => {
    const params = courseId ? { course: courseId } : {}
    return api.get('/course/lesson/', { params })
  },
  markCompleted: (id: number) => api.post(`/course/lesson/${id}/mark-completed/`),
}

// Lesson Quizzes (for students)
export const lessonQuizzesApi = {
  getByLesson: (lessonId: number) => api.get(`/course/lesson-quiz/by-lesson/${lessonId}/`),
  get: (id: number) => api.get(`/course/lesson-quiz/${id}/`),
  submit: (id: number, answers: Array<{ question_id: number; choice_id: number }>) =>
    api.post(`/course/lesson-quiz/${id}/submit/`, { answers }),
}

// Mentorship
export const mentorshipApi = {
  packages: (mentorId?: number) =>
    api.get('/mentorship/package/', { params: mentorId ? { mentor: mentorId } : undefined }),
  createRequest: (data: { package_id: number; objective: string; availability: string; contact: string }) =>
    api.post('/mentorship/request/', data),
  myRequests: () => api.get('/mentorship/request/'),
  sessions: () => api.get('/mentorship/sessions/'),
  bookSession: (data: {
    mentor: number
    package?: number
    starts_at: string
    duration_minutes: number
  }) => api.post('/mentorship/sessions/', data),
  publicAvailability: (mentorId: number) =>
    api.get('/mentorship/public-availability/', { params: { mentor: mentorId } }),
  uploadPaymentProof: (requestId: number, file: File, notes?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (notes) formData.append('notes', notes)
    return api.post(`/mentorship/request/${requestId}/upload-payment-proof/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export const instructorsApi = {
  apply: (data: FormData | Record<string, unknown>) => api.post('/instructors/applications/', data),
  myApplication: () => api.get('/instructors/applications/mine/'),
  publicList: () => api.get('/instructors/public/'),
  publicGet: (slug: string) => api.get(`/instructors/public/${slug}/`),
  publicCourses: (slug: string) => api.get(`/instructors/public/${slug}/courses/`),
  me: () => api.get('/instructors/me/'),
  dashboard: () => api.get('/instructors/me/dashboard/'),
  students: () => api.get('/instructors/me/students/'),
  analytics: () => api.get('/instructors/me/analytics/'),
  earnings: () => api.get('/instructors/me/earnings/'),
  transactions: () => api.get('/instructors/me/transactions/'),
  courses: {
    list: () => api.get('/instructors/my-courses/'),
    get: (id: number) => api.get(`/instructors/my-courses/${id}/`),
    create: (data: Record<string, unknown>) => api.post('/instructors/my-courses/', data),
    update: (id: number, data: Record<string, unknown>) => api.patch(`/instructors/my-courses/${id}/`, data),
    submit: (id: number) => api.post(`/instructors/my-courses/${id}/submit/`),
  },
  modules: {
    list: (courseId: number) => api.get('/instructors/my-modules/', { params: { course: courseId } }),
    create: (data: Record<string, unknown>) => api.post('/instructors/my-modules/', data),
    update: (id: number, data: Record<string, unknown>) => api.patch(`/instructors/my-modules/${id}/`, data),
    delete: (id: number) => api.delete(`/instructors/my-modules/${id}/`),
    reorder: (id: number, order: number[]) => api.post(`/instructors/my-modules/${id}/reorder_lessons/`, { order }),
  },
  lessons: {
    list: (courseId: number) => api.get('/instructors/my-lessons/', { params: { course: courseId } }),
    create: (data: Record<string, unknown>) => api.post('/instructors/my-lessons/', data),
    update: (id: number, data: Record<string, unknown>) => api.patch(`/instructors/my-lessons/${id}/`, data),
    delete: (id: number) => api.delete(`/instructors/my-lessons/${id}/`),
  },
  payoutMethods: {
    list: () => api.get('/instructors/my-payout-methods/'),
    create: (data: Record<string, unknown>) => api.post('/instructors/my-payout-methods/', data),
  },
  payouts: {
    list: () => api.get('/instructors/my-payouts/'),
    request: (amount: string, currency?: string) =>
      api.post('/instructors/my-payouts/', { amount, currency }),
  },
  saved: {
    list: () => api.get('/instructors/saved/'),
    add: (kind: string, objectId: number) => api.post('/instructors/saved/', { kind, object_id: objectId }),
    remove: (id: number) => api.delete(`/instructors/saved/${id}/`),
  },
  mentors: () => api.get('/instructors/mentors/'),
  tutors: () => api.get('/instructors/tutors/'),
  bookTutor: (data: { tutor: number; starts_at: string; duration_minutes: number }) =>
    api.post('/instructors/tutor/bookings/', data),
  payee: () => api.get('/instructors/payee/'),
}

export const educationAdminApi = {
  overview: () => api.get('/instructors/admin/overview/'),
  applications: () => api.get('/instructors/admin/applications/'),
  approveApplication: (id: number, notes?: string) =>
    api.post(`/instructors/admin/applications/${id}/approve/`, { admin_notes: notes || '' }),
  rejectApplication: (id: number, notes?: string) =>
    api.post(`/instructors/admin/applications/${id}/reject/`, { admin_notes: notes || '' }),
  requestInfo: (id: number, notes?: string) =>
    api.post(`/instructors/admin/applications/${id}/request-info/`, { admin_notes: notes || '' }),
  instructors: () => api.get('/instructors/admin/instructors/'),
  payouts: () => api.get('/instructors/admin/payouts/'),
  markPayoutPaid: (id: number) => api.post(`/instructors/admin/payouts/${id}/paid/`),
  rejectPayout: (id: number, notes?: string) =>
    api.post(`/instructors/admin/payouts/${id}/reject/`, { notes: notes || '' }),
  payments: () => api.get('/instructors/admin/payments/'),
  billing: () => api.get('/instructors/admin/billing/'),
  updateBilling: (data: Record<string, unknown>) => api.patch('/instructors/admin/billing/', data),
  translations: () => api.get('/instructors/admin/translations/'),
  approveCourse: (id: number) => api.post(`/course/admin/courses/${id}/approve/`),
  rejectCourse: (id: number, reason: string) =>
    api.post(`/course/admin/courses/${id}/reject/`, { reason }),
  unpublishCourse: (id: number) => api.post(`/course/admin/courses/${id}/unpublish/`),
  featureCourse: (id: number, flag: string, value: boolean) =>
    api.post(`/course/admin/courses/${id}/feature/`, { flag, value }),
}

// Progress
export const progressApi = {
  list: () => api.get('/course/progress/'),
}

// Admin APIs
export const adminApi = {
  // Stats
  stats: () => api.get('/course/admin/stats/'),
  
  // Courses
  courses: {
    list: () => api.get('/course/admin/courses/'),
    get: (id: number) => api.get(`/course/admin/courses/${id}/`),
    create: (data: any) => api.post('/course/admin/courses/', data),
    update: (id: number, data: any) => api.patch(`/course/admin/courses/${id}/`, data),
    delete: (id: number) => api.delete(`/course/admin/courses/${id}/`),
  },
  
  // Lessons
  lessons: {
    list: (courseId?: number) => {
      const params = courseId ? { course: courseId } : {}
      return api.get('/course/admin/lessons/', { params })
    },
    get: (id: number) => api.get(`/course/admin/lessons/${id}/`),
    create: (data: any) => api.post('/course/admin/lessons/', data),
    update: (id: number, data: any) => api.patch(`/course/admin/lessons/${id}/`, data),
    delete: (id: number) => api.delete(`/course/admin/lessons/${id}/`),
  },
  lessonAttachments: {
    list: (lessonId?: number) => {
      const params = lessonId ? { lesson: lessonId } : {}
      return api.get('/course/admin/lesson-attachments/', { params })
    },
    get: (id: number) => api.get(`/course/admin/lesson-attachments/${id}/`),
    create: (data: FormData) => api.post('/course/admin/lesson-attachments/', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
    update: (id: number, data: FormData | any) => {
      if (data instanceof FormData) {
        return api.patch(`/course/admin/lesson-attachments/${id}/`, data, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }
      return api.patch(`/course/admin/lesson-attachments/${id}/`, data)
    },
    delete: (id: number) => api.delete(`/course/admin/lesson-attachments/${id}/`),
  },
  questions: {
    list: () => api.get('/course/admin/questions/'),
    get: (id: number) => api.get(`/course/admin/questions/${id}/`),
    create: (data: any) => api.post('/course/admin/questions/', data),
    update: (id: number, data: any) => api.patch(`/course/admin/questions/${id}/`, data),
    delete: (id: number) => api.delete(`/course/admin/questions/${id}/`),
  },
  choices: {
    list: (questionId?: number) => api.get('/course/admin/choices/', { params: { question: questionId } }),
    get: (id: number) => api.get(`/course/admin/choices/${id}/`),
    create: (data: any) => api.post('/course/admin/choices/', data),
    update: (id: number, data: any) => api.patch(`/course/admin/choices/${id}/`, data),
    delete: (id: number) => api.delete(`/course/admin/choices/${id}/`),
  },
  lessonQuizzes: {
    list: (lessonId?: number) => api.get('/course/admin/lesson-quizzes/', { params: { lesson: lessonId } }),
    get: (id: number) => api.get(`/course/admin/lesson-quizzes/${id}/`),
    create: (data: any) => api.post('/course/admin/lesson-quizzes/', data),
    update: (id: number, data: any) => api.patch(`/course/admin/lesson-quizzes/${id}/`, data),
    delete: (id: number) => api.delete(`/course/admin/lesson-quizzes/${id}/`),
    addQuestion: (id: number, data: { question_id: number; points?: number; order?: number }) =>
      api.post(`/course/admin/lesson-quizzes/${id}/add-question/`, data),
    removeQuestion: (id: number, questionId: number) =>
      api.delete(`/course/admin/lesson-quizzes/${id}/remove-question/${questionId}/`),
  },
  finalExams: {
    list: (courseId?: number) => api.get('/course/admin/final-exams/', { params: { course: courseId } }),
    get: (id: number) => api.get(`/course/admin/final-exams/${id}/`),
    create: (data: any) => api.post('/course/admin/final-exams/', data),
    update: (id: number, data: any) => api.patch(`/course/admin/final-exams/${id}/`, data),
    delete: (id: number) => api.delete(`/course/admin/final-exams/${id}/`),
    addQuestion: (id: number, data: { question_id: number; points?: number; order?: number }) =>
      api.post(`/course/admin/final-exams/${id}/add-question/`, data),
    removeQuestion: (id: number, questionId: number) =>
      api.delete(`/course/admin/final-exams/${id}/remove-question/${questionId}/`),
  },
  
  // Enrollments
  enrollments: {
    list: (status?: string) => {
      const params = status ? { status } : {}
      return api.get('/course/admin/enrollments/', { params })
    },
    get: (id: number) => api.get(`/course/admin/enrollments/${id}/`),
    approve: (id: number) => api.post(`/course/admin/enrollments/${id}/approve/`),
    cancel: (id: number) => api.post(`/course/admin/enrollments/${id}/cancel/`),
  },
  
  // Payment Proofs
  paymentProofs: {
    list: (status?: string) => {
      const params = status ? { status } : {}
      return api.get('/course/admin/payment-proofs/', { params })
    },
    get: (id: number) => api.get(`/course/admin/payment-proofs/${id}/`),
    approve: (id: number) => api.post(`/course/admin/payment-proofs/${id}/approve/`),
    reject: (id: number) => api.post(`/course/admin/payment-proofs/${id}/reject/`),
  },
  
  // Users
  users: {
    list: () => api.get('/course/admin/users/'),
    get: (id: number) => api.get(`/course/admin/users/${id}/`),
    toggleStaff: (id: number) => api.post(`/course/admin/users/${id}/toggle-staff/`),
  },

  // User Points (admin)
  userPoints: {
    list: (params?: { user_id?: number; transaction_type?: string }) =>
      api.get('/course/admin/user-points/', { params }),
    userBalance: (userId: number) =>
      api.get('/course/admin/user-points/user-balance/', { params: { user_id: userId } }),
    adjustBalance: (data: { user_id: number; points: number; description?: string }) =>
      api.post('/course/admin/user-points/adjust-balance/', data),
  },

  // Mobile app subscriptions (admin)
  subscriptions: {
    list: (statusOrParams?: string | SubscriptionListParams) => {
      const params =
        typeof statusOrParams === 'string' ? { status: statusOrParams } : statusOrParams
      return api.get('/subscriptions/admin/subscriptions/', { params })
    },
    get: (id: number) => api.get(`/subscriptions/admin/subscriptions/${id}/`),
    analytics: (range?: string) =>
      api.get('/subscriptions/admin/subscriptions/analytics/', { params: { range } }),
    searchUsers: (q: string) =>
      api.get('/subscriptions/admin/subscriptions/search-users/', { params: { q } }),
    create: (data: { user_id: number; plan_tier: string; start_trial?: boolean }) =>
      api.post('/subscriptions/admin/subscriptions/create-subscription/', data),
    export: (params: SubscriptionListParams & { export_format: 'csv' | 'xlsx' | 'pdf' }) =>
      api.get('/subscriptions/admin/subscriptions/export/', {
        params,
        responseType: 'blob',
        timeout: 60000,
      }),
    deactivate: (id: number) => api.post(`/subscriptions/admin/subscriptions/${id}/deactivate/`),
    pause: (id: number) => api.post(`/subscriptions/admin/subscriptions/${id}/pause/`),
    resume: (id: number) => api.post(`/subscriptions/admin/subscriptions/${id}/resume/`),
    extend30Days: (id: number, days?: number) =>
      api.post(`/subscriptions/admin/subscriptions/${id}/extend-30-days/`, days ? { days } : {}),
    changePlan: (id: number, plan_tier: string) =>
      api.post(`/subscriptions/admin/subscriptions/${id}/change-plan/`, { plan_tier }),
    refund: (id: number, note?: string) =>
      api.post(`/subscriptions/admin/subscriptions/${id}/refund/`, { note }),
    sendReminder: (id: number, data?: { channels?: string[]; days?: number }) =>
      api.post(`/subscriptions/admin/subscriptions/${id}/send-reminder/`, data ?? {}),
    paymentProofs: {
      list: (statusOrParams?: string | ProofListParams) => {
        const params =
          typeof statusOrParams === 'string' ? { status: statusOrParams } : statusOrParams
        return api.get('/subscriptions/admin/payment-proofs/', { params })
      },
      get: (id: number) => api.get(`/subscriptions/admin/payment-proofs/${id}/`),
      approve: (id: number) => api.post(`/subscriptions/admin/payment-proofs/${id}/approve/`),
      reject: (id: number) => api.post(`/subscriptions/admin/payment-proofs/${id}/reject/`),
      requestInfo: (id: number, message: string) =>
        api.post(`/subscriptions/admin/payment-proofs/${id}/request-info/`, { message }),
    },
    payments: {
      list: (params?: Record<string, string | number | undefined>) =>
        api.get('/subscriptions/admin/payments/', { params }),
      summary: () => api.get('/subscriptions/admin/payments/summary/'),
    },
    gatewayConfig: {
      get: () => api.get('/subscriptions/admin/gateway-config/'),
      update: (data: Record<string, unknown>) =>
        api.patch('/subscriptions/admin/gateway-config/update/', data),
      testConnection: () => api.post('/subscriptions/admin/gateway-config/test-connection/'),
    },
  },

  // Mentorship Admin
  mentorship: {
    packages: {
      list: () => api.get('/mentorship/admin/packages/'),
      get: (id: number) => api.get(`/mentorship/admin/packages/${id}/`),
      create: (data: any) => api.post('/mentorship/admin/packages/', data),
      update: (id: number, data: any) => api.put(`/mentorship/admin/packages/${id}/`, data),
      delete: (id: number) => api.delete(`/mentorship/admin/packages/${id}/`),
    },
    requests: {
      list: (status?: string) => {
        const params = status ? { status } : {}
        return api.get('/mentorship/admin/requests/', { params })
      },
      get: (id: number) => api.get(`/mentorship/admin/requests/${id}/`),
      approve: (id: number) => api.post(`/mentorship/admin/requests/${id}/approve/`),
      cancel: (id: number) => api.post(`/mentorship/admin/requests/${id}/cancel/`),
      updateStatus: (id: number, status: string, notes?: string) => 
        api.post(`/mentorship/admin/requests/${id}/update-status/`, { status, notes }),
    },
    paymentProofs: {
      list: (status?: string) => {
        const params = status ? { status } : {}
        return api.get('/mentorship/admin/payment-proofs/', { params })
      },
      get: (id: number) => api.get(`/mentorship/admin/payment-proofs/${id}/`),
      approve: (id: number) => api.post(`/mentorship/admin/payment-proofs/${id}/approve/`),
      reject: (id: number) => api.post(`/mentorship/admin/payment-proofs/${id}/reject/`),
    },
  },

  portfolio: {
    projects: {
      list: () => api.get('/portfolio/admin/projects/'),
      create: (data: Record<string, unknown>) => api.post('/portfolio/admin/projects/', data),
      update: (id: number, data: Record<string, unknown>) =>
        api.patch(`/portfolio/admin/projects/${id}/`, data),
      delete: (id: number) => api.delete(`/portfolio/admin/projects/${id}/`),
    },
    services: {
      list: () => api.get('/portfolio/admin/services/'),
      create: (data: Record<string, unknown>) => api.post('/portfolio/admin/services/', data),
      update: (id: number, data: Record<string, unknown>) =>
        api.patch(`/portfolio/admin/services/${id}/`, data),
      delete: (id: number) => api.delete(`/portfolio/admin/services/${id}/`),
    },
    testimonials: {
      list: () => api.get('/portfolio/admin/testimonials/'),
      update: (id: number, data: Record<string, unknown>) =>
        api.patch(`/portfolio/admin/testimonials/${id}/`, data),
    },
    showreel: {
      list: () => api.get('/portfolio/admin/showreel/'),
    },
    caseStudies: {
      list: () => api.get('/portfolio/admin/case-studies/'),
    },
    zenda: {
      list: () => api.get('/portfolio/admin/zenda/'),
      update: (id: number, data: Record<string, unknown>) =>
        api.patch(`/portfolio/admin/zenda/${id}/`, data),
    },
    zendaFeatures: {
      list: () => api.get('/portfolio/admin/zenda-features/'),
    },
    homeSections: {
      list: () => api.get('/portfolio/admin/home-sections/'),
      update: (id: number, data: Record<string, unknown>) =>
        api.patch(`/portfolio/admin/home-sections/${id}/`, data),
    },
    navigation: {
      list: () => api.get('/portfolio/admin/navigation/'),
      update: (id: number, data: Record<string, unknown>) =>
        api.patch(`/portfolio/admin/navigation/${id}/`, data),
    },
    faqs: {
      list: () => api.get('/portfolio/admin/faqs/'),
    },
    resources: {
      list: () => api.get('/portfolio/admin/resources/'),
    },
    statistics: {
      list: () => api.get('/portfolio/admin/statistics/'),
    },
    pageSeo: {
      list: () => api.get('/portfolio/admin/page-seo/'),
      update: (id: number, data: Record<string, unknown>) =>
        api.patch(`/portfolio/admin/page-seo/${id}/`, data),
    },
    settings: {
      get: () => api.get('/portfolio/admin/settings/1/'),
      update: (data: Record<string, unknown>) => api.patch('/portfolio/admin/settings/1/', data),
    },
    contactMessages: {
      list: () => api.get('/portfolio/admin/contact-messages/'),
      update: (id: number, data: Record<string, unknown>) =>
        api.patch(`/portfolio/admin/contact-messages/${id}/`, data),
    },
    newsletter: {
      list: () => api.get('/portfolio/admin/newsletter/'),
    },
  },
}

export type FxFreshness = 'live' | 'cached' | 'stale' | 'unavailable'

export interface FxRateRow {
  id?: number
  base_currency: string
  target_currency: string
  rate: string | number
  source?: string
  provider_updated_at?: string | null
  updated_at?: string
}

export interface FxListResponse {
  results: FxRateRow[]
  count: number
  base?: string
  source?: string
  updated_at?: string | null
  provider_updated_at?: string | null
  fetched_at?: string | null
  last_successful_update?: string | null
  freshness?: FxFreshness
  stale?: boolean
  market_closed?: boolean
  refresh_error?: string
}

export interface FxConvertResponse {
  original_amount: string
  original_currency: string
  converted_amount: string
  converted_currency: string
  amount: string
  converted: string
  from: string
  to: string
  rate: string
  exchange_rate: string
  rate_timestamp?: string | null
  rate_line?: string
  updated_at?: string | null
  provider_updated_at?: string | null
  fetched_at?: string | null
  last_successful_update?: string | null
  source?: string
  stale?: boolean
  freshness?: FxFreshness
  market_closed?: boolean
  refresh_error?: string
  error?: string
}

/** Public FX endpoints — rates are cached on the Django backend; no provider keys on the client. */
export const financeApi = {
  getExchangeRates: async (refresh = false) => {
    const { data } = await api.get<FxListResponse>('/finance/exchange-rates/', {
      params: refresh ? { refresh: '1' } : undefined,
    })
    return data
  },
  convertCurrency: async (amount: number, from: string, to: string, refresh = false) => {
    const params = { amount, from, to, ...(refresh ? { refresh: '1' } : {}) }
    console.log('[Zenda FX] convert request', { url: '/finance/exchange-rates/convert/', params })
    try {
      const { data } = await api.get<FxConvertResponse>('/finance/exchange-rates/convert/', {
        params,
      })
      console.log('[Zenda FX] convert response', data)
      return data
    } catch (err) {
      console.warn('[Zenda FX] convert error', err)
      throw err
    }
  },
}

export const financeSpaceApi = {
  previewSpace: async (inviteCode: string) => {
    const { data } = await api.get<{
      id: number
      name: string
      currency: string
      member_count: number
      require_approval: boolean
    }>('/finance-space/spaces/preview/', { params: { invite_code: inviteCode } })
    return data
  },
  joinSpace: async (inviteCode: string) => {
    const { data } = await api.post('/finance-space/spaces/join/', { invite_code: inviteCode })
    return data
  },
  listSpaces: async () => {
    const { data } = await api.get<FamilySpaceSummary[] | { results: FamilySpaceSummary[] }>(
      '/finance-space/spaces/',
    )
    return Array.isArray(data) ? data : data.results || []
  },
  getDashboard: async (spaceId: number) => {
    const { data } = await api.get<FamilyDashboard>(`/finance-space/spaces/${spaceId}/dashboard/`)
    return data
  },
  createSpace: async (payload: { name: string; currency: string; description?: string; require_approval?: boolean }) => {
    const { data } = await api.post<FamilySpaceSummary>('/finance-space/spaces/', payload)
    return data
  },
  createEntry: async (payload: {
    space: number
    kind: string
    title: string
    amount: string
    currency: string
    date: string
    category?: string
  }) => {
    const { data } = await api.post('/finance-space/entries/', payload)
    return data
  },
  createBudget: async (payload: {
    space: number
    name: string
    amount: string
    currency: string
    month?: number
    year?: number
  }) => {
    const { data } = await api.post('/finance-space/shared-budgets/', payload)
    return data
  },
  createGoal: async (payload: {
    space: number
    title: string
    target_amount: string
    currency: string
  }) => {
    const { data } = await api.post('/finance-space/shared-goals/', payload)
    return data
  },
}

export type FamilySpaceSummary = {
  id: number
  name: string
  currency: string
  invite_code: string
  member_count?: number
}

export type FamilyDashboard = {
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
  goals?: { id: number; title: string; target_amount?: string; current_amount?: string; currency?: string; progress_percentage?: number }[]
  budgets?: { id: number; name: string; amount: string; spent: string; currency: string }[]
  upcoming: { id: number; title: string; amount: string; currency: string; due_date?: string | null; date: string }[]
  activity: { id: number; message: string }[]
  members: { id: number; display_name?: string; user_email?: string; role: string }[]
}

export type CopilotLocale = 'pt' | 'en' | 'fr' | 'es'

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
  fx?: CopilotFxFact | null
  missing?: string[]
  health?: { score?: number; grade?: string }
}

export interface CopilotMessage {
  id?: number
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at?: string
  facts?: CopilotFacts | null
  proposed_action?: CopilotProposedAction | null
}

export interface CopilotChatResponse {
  conversation_id: number
  conversation_title?: string
  user_message?: CopilotMessage
  assistant_message?: CopilotMessage
  facts?: CopilotFacts
  proposed_action?: CopilotProposedAction | null
}

export interface CopilotConversationListItem {
  id: number
  title: string
  last_message_preview?: string | null
}

export interface CopilotInsights {
  health_score?: number
  grade?: string
  monthly_report?: string
  suggested_prompts?: string[]
}

function unwrapResults<T>(data: T[] | { results?: T[] }): T[] {
  if (Array.isArray(data)) return data
  return data.results ?? []
}

/** AI Copilot — keys stay on the Django backend; the browser never talks to the AI provider. */
export const aiCopilotApi = {
  listConversations: async () => {
    const { data } = await api.get<CopilotConversationListItem[] | { results?: CopilotConversationListItem[] }>(
      '/ai-copilot/conversations/',
    )
    return unwrapResults(data)
  },
  getConversation: async (id: number) => {
    const { data } = await api.get<{ messages?: CopilotMessage[] }>(`/ai-copilot/conversations/${id}/`)
    return data
  },
  chat: async (message: string, conversationId?: number | null, locale?: CopilotLocale) => {
    const { data } = await api.post<CopilotChatResponse>(
      '/ai-copilot/conversations/chat/',
      { message, conversation_id: conversationId || null, locale },
      { timeout: 45000 },
    )
    return data
  },
  confirmAction: async (
    conversationId: number,
    actionId: string,
    confirm: boolean,
    locale?: CopilotLocale,
  ) => {
    const { data } = await api.post<{
      status: string
      result?: { ok?: boolean; type?: string; id?: number }
      assistant_message?: CopilotMessage
      proposed_action?: CopilotProposedAction
    }>(
      '/ai-copilot/conversations/confirm-action/',
      { conversation_id: conversationId, action_id: actionId, confirm, locale },
      { timeout: 20000 },
    )
    return data
  },
  getInsights: async (locale?: CopilotLocale) => {
    const { data } = await api.get<CopilotInsights>('/ai-copilot/conversations/insights/', {
      params: locale ? { locale } : undefined,
    })
    return data
  },
}

export const subscriptionApi = {
  checkoutOptions: (platform = 'web') =>
    api.get('/subscriptions/checkout-options/', { params: { platform } }),
  createSession: () => api.post('/subscriptions/payments/create-session/', {}),
  sync: (payload: { id?: number; external_id?: string; outcome?: string }) => {
    if (payload.id) {
      return api.post(`/subscriptions/payments/${payload.id}/sync/`, {
        outcome: payload.outcome,
      })
    }
    return api.post('/subscriptions/payments/sync/', {
      external_id: payload.external_id,
      outcome: payload.outcome,
    })
  },
  history: (params?: { page?: number }) => api.get('/subscriptions/payments/', { params }),
  paymentInfo: () => api.get('/subscriptions/mobile/payment-info/'),
  me: () => api.get('/subscriptions/mobile/me/'),
  subscribe: () => api.post('/subscriptions/mobile/subscribe/'),
  uploadProof: (subscriptionId: number, file: File, notes?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (notes) formData.append('notes', notes)
    return api.post(`/subscriptions/mobile/${subscriptionId}/upload-proof/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

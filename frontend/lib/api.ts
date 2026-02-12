import axios from 'axios'
import Cookies from 'js-cookie'

// Use production API by default, override with NEXT_PUBLIC_API_URL env var
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  'https://ludmilpaulo.pythonanywhere.com/api'

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
      console.error('Network Error:', {
        message: error.message,
        code: error.code,
        config: {
          url: error.config?.url,
          baseURL: error.config?.baseURL,
          method: error.config?.method,
        }
      })
      // Don't redirect on network errors, let the component handle it
      return Promise.reject(error)
    }

    if (error.response?.status === 401) {
      // Token inválido ou expirado - limpar autenticação
      if (typeof window !== 'undefined') {
        Cookies.remove('token')
        // Redirecionar para login apenas se estiver no cliente
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login'
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
  me: () => api.get('/auth/me/'),
  updateProfile: (data: { first_name?: string; last_name?: string; phone?: string; address?: string; email?: string }) =>
    api.put('/auth/profile/', data),
  requestAccountDeletion: () => api.post('/auth/request-deletion/'),
}

// Courses
export const coursesApi = {
  list: () => api.get('/course/course/'),
  get: (id: number) => api.get(`/course/course/${id}/`),
  freeLessons: () => api.get('/course/course/free-lesson/'),
  enroll: (courseId: number) => api.post('/course/enrollment/', { course_id: courseId }),
  myEnrollments: () => api.get('/course/enrollment/'),
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
  packages: () => api.get('/mentorship/package/'),
  createRequest: (data: { package_id: number; objective: string; availability: string; contact: string }) =>
    api.post('/mentorship/request/', data),
  myRequests: () => api.get('/mentorship/request/'),
  uploadPaymentProof: (requestId: number, file: File, notes?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (notes) formData.append('notes', notes)
    return api.post(`/mentorship/request/${requestId}/upload-payment-proof/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
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
    list: (status?: string) => {
      const params = status ? { status } : {}
      return api.get('/subscriptions/admin/subscriptions/', { params })
    },
    get: (id: number) => api.get(`/subscriptions/admin/subscriptions/${id}/`),
    deactivate: (id: number) => api.post(`/subscriptions/admin/subscriptions/${id}/deactivate/`),
    extend30Days: (id: number) => api.post(`/subscriptions/admin/subscriptions/${id}/extend-30-days/`),
    paymentProofs: {
      list: (status?: string) => {
        const params = status ? { status } : {}
        return api.get('/subscriptions/admin/payment-proofs/', { params })
      },
      get: (id: number) => api.get(`/subscriptions/admin/payment-proofs/${id}/`),
      approve: (id: number) => api.post(`/subscriptions/admin/payment-proofs/${id}/approve/`),
      reject: (id: number) => api.post(`/subscriptions/admin/payment-proofs/${id}/reject/`),
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
}

import axios from 'axios'
import Cookies from 'js-cookie'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  const token = Cookies.get('token')
  if (token) {
    config.headers.Authorization = `Token ${token}`
  }
  return config
})

export default api

// Auth
export const authApi = {
  register: (data: { email: string; username: string; password: string; password_confirm: string; first_name?: string; last_name?: string; phone?: string }) =>
    api.post('/auth/register/', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login/', data),
  me: () => api.get('/auth/me/'),
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
}

// Lessons
export const lessonsApi = {
  get: (id: number) => api.get(`/course/lesson/${id}/`),
  markCompleted: (id: number) => api.post(`/course/lesson/${id}/mark-completed/`),
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

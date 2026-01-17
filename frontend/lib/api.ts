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

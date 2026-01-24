import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

// API Base URL Configuration
// For iOS Simulator: use localhost
// For Android Emulator: use 10.0.2.2
// For physical devices: use your computer's IP address (192.168.1.139)
// Update the IP below if your computer's IP changes
const DEV_IP = '192.168.1.139' // Update this if your IP changes

const getApiBaseUrl = () => {
  if (__DEV__) {
    if (Platform.OS === 'ios') {
      // Try to detect simulator (not perfect, but works in most cases)
      // iOS Simulator can use localhost
      // Physical iOS devices need the network IP
      // For now, default to network IP (works for both, but slower on simulator)
      return `http://${DEV_IP}:8000/api`
    } else if (Platform.OS === 'android') {
      // Android Emulator uses 10.0.2.2 to access host machine's localhost
      // Physical Android devices use the network IP
      // Try network IP first (works for physical devices)
      // If you're on emulator and it doesn't work, manually change to: http://10.0.2.2:8000/api
      return `http://${DEV_IP}:8000/api`
    }
    return `http://${DEV_IP}:8000/api`
  }
  return 'https://rubianejoaquim.com/api'
}

const API_BASE_URL = getApiBaseUrl()

console.log('API Base URL:', API_BASE_URL) // Debug log

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 second timeout (increased for mobile)
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

// Auth API
export const authApi = {
  login: async (emailOrUsername: string, password: string) => {
    try {
      const response = await api.post('/auth/login/', {
        email: emailOrUsername,
        password,
      })
      return response.data
    } catch (error: any) {
      // Better error handling
      console.error('Login error details:', {
        code: error.code,
        message: error.message,
        response: error.response?.data,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
      })
      
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error') || error.message?.includes('timeout')) {
        const errorMsg = `Não foi possível conectar ao servidor.\n\n` +
          `URL tentada: ${error.config?.baseURL || API_BASE_URL}\n` +
          `Verifique:\n` +
          `1. O backend está rodando? (python manage.py runserver 0.0.0.0:8000)\n` +
          `2. O IP está correto? (192.168.1.139)\n` +
          `3. Está na mesma rede WiFi?\n` +
          `4. Firewall está bloqueando?`
        throw new Error(errorMsg)
      }
      if (error.response?.data) {
        const errorMsg = error.response.data.email?.[0] || 
                        error.response.data.password?.[0] ||
                        error.response.data.non_field_errors?.[0] ||
                        error.response.data.error ||
                        'Credenciais inválidas'
        throw new Error(errorMsg)
      }
      throw error
    }
  },
  
  register: async (data: {
    email: string
    username: string
    password: string
    first_name: string
    last_name: string
  }) => {
    const response = await api.post('/auth/register/', data)
    return response.data
  },
  
  me: async () => {
    const response = await api.get('/auth/me/')
    return response.data
  },
}

// Access Verification API
export const accessApi = {
  checkPaidAccess: async () => {
    try {
      const [enrollmentsRes, mentorshipRes] = await Promise.all([
        api.get('/course/enrollment/'),
        api.get('/mentorship/request/'),
      ])
      
      const enrollments = enrollmentsRes.data.results || enrollmentsRes.data || []
      const mentorshipRequests = mentorshipRes.data.results || mentorshipRes.data || []
      
      // Check if user has at least one active enrollment or approved mentorship
      const hasActiveEnrollment = Array.isArray(enrollments) && 
        enrollments.some((e: any) => e.status === 'active')
      
      const hasApprovedMentorship = Array.isArray(mentorshipRequests) && 
        mentorshipRequests.some((m: any) => 
          m.status === 'approved' || m.status === 'scheduled' || m.status === 'completed'
        )
      
      return hasActiveEnrollment || hasApprovedMentorship
    } catch (error) {
      console.error('Error checking paid access:', error)
      return false
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
}

// Personal Finance API (to be implemented in backend)
export const personalFinanceApi = {
  getExpenses: async () => {
    const response = await api.get('/finance/personal/expenses/')
    return response.data
  },
  
  createExpense: async (data: any) => {
    const response = await api.post('/finance/personal/expenses/', data)
    return response.data
  },
  
  getBudgets: async () => {
    const response = await api.get('/finance/personal/budgets/')
    return response.data
  },
  
  getGoals: async () => {
    const response = await api.get('/finance/personal/goals/')
    return response.data
  },
}

// Business Finance API (to be implemented in backend)
export const businessFinanceApi = {
  getSales: async () => {
    const response = await api.get('/finance/business/sales/')
    return response.data
  },
  
  getExpenses: async () => {
    const response = await api.get('/finance/business/expenses/')
    return response.data
  },
  
  getMetrics: async () => {
    const response = await api.get('/finance/business/metrics/')
    return response.data
  },
}

// Education API
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

export default api

import { create } from 'zustand'
import Cookies from 'js-cookie'
import { authApi } from './api'

interface User {
  id: number
  email: string
  username: string
  first_name?: string
  last_name?: string
  phone?: string
  address?: string
  referral_code?: string
  is_staff?: boolean
  is_superuser?: boolean
  is_admin?: boolean
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: { email: string; username: string; password: string; password_confirm: string; first_name?: string; last_name?: string; phone?: string }) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,

  login: async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password })
      const { user, token } = response.data
      Cookies.set('token', token, { expires: 30 })
      set({ user, token })
    } catch (error: any) {
      // Extract specific error message from response
      let errorMessage = 'Erro ao fazer login'
      
      if (error.response?.data) {
        // Check for specific error fields (user doesn't exist vs wrong password)
        if (error.response.data.email) {
          errorMessage = Array.isArray(error.response.data.email) 
            ? error.response.data.email[0] 
            : error.response.data.email
        } else if (error.response.data.password) {
          errorMessage = Array.isArray(error.response.data.password) 
            ? error.response.data.password[0] 
            : error.response.data.password
        } else if (error.response.data.non_field_errors) {
          errorMessage = Array.isArray(error.response.data.non_field_errors) 
            ? error.response.data.non_field_errors[0] 
            : error.response.data.non_field_errors
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error
        }
      } else if (error.message) {
        errorMessage = error.message
      }
      
      throw new Error(errorMessage)
    }
  },

  register: async (data) => {
    try {
      const response = await authApi.register(data)
      const { user, token } = response.data
      Cookies.set('token', token, { expires: 30 })
      set({ user, token })
    } catch (error: any) {
      throw new Error(error.response?.data?.error || 'Erro ao registar')
    }
  },

  logout: () => {
    Cookies.remove('token')
    set({ user: null, token: null })
  },

  checkAuth: async () => {
    const token = Cookies.get('token')
    if (!token) {
      set({ isLoading: false })
      return
    }

    try {
      const response = await authApi.me()
      set({ user: response.data, token, isLoading: false })
    } catch (error) {
      Cookies.remove('token')
      set({ user: null, token: null, isLoading: false })
    }
  },
}))

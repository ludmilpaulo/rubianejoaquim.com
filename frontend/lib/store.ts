import { create } from 'zustand'
import Cookies from 'js-cookie'
import { authApi } from './api'

function authCookieOptions() {
  return {
    expires: 30,
    sameSite: 'lax' as const,
    secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
  }
}

interface User {
  id: number
  email: string
  username: string
  first_name?: string
  last_name?: string
  phone?: string
  address?: string
  referral_code?: string
  email_verified?: boolean
  profile_image_url?: string
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
  applySession: (user: User, token: string) => void
  logout: () => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,

  applySession: (user, token) => {
    Cookies.set('token', token, authCookieOptions())
    set({ user, token })
  },

  login: async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password })
      const { user, token } = response.data
      Cookies.set('token', token, authCookieOptions())
      set({ user, token })
    } catch (error: unknown) {
      let errorMessage = 'Erro ao fazer login'
      const err = error as { response?: { data?: Record<string, unknown> }; message?: string }

      if (err.response?.data) {
        const data = err.response.data
        if (data.email) {
          errorMessage = Array.isArray(data.email) ? String(data.email[0]) : String(data.email)
        } else if (data.password) {
          errorMessage = Array.isArray(data.password) ? String(data.password[0]) : String(data.password)
        } else if (data.non_field_errors) {
          errorMessage = Array.isArray(data.non_field_errors)
            ? String(data.non_field_errors[0])
            : String(data.non_field_errors)
        } else if (data.error) {
          errorMessage = String(data.error)
        }
      } else if (err.message) {
        errorMessage = err.message
      }

      throw new Error(errorMessage)
    }
  },

  register: async (data) => {
    try {
      const response = await authApi.register(data)
      const { user, token } = response.data
      Cookies.set('token', token, authCookieOptions())
      set({ user, token })
    } catch (error: unknown) {
      let errorMessage = 'Erro ao registar'
      const err = error as { response?: { data?: Record<string, unknown> }; message?: string }

      if (err.response?.data) {
        const errors = err.response.data
        const fieldErrors: string[] = []

        for (const key of ['email', 'username', 'password', 'password_confirm', 'phone'] as const) {
          if (errors[key]) {
            const msgs = Array.isArray(errors[key]) ? errors[key] as string[] : [String(errors[key])]
            const label =
              key === 'email' ? 'Email'
              : key === 'username' ? 'Username'
              : key === 'password' ? 'Palavra-passe'
              : key === 'password_confirm' ? 'Confirmação'
              : 'Telefone'
            fieldErrors.push(`${label}: ${msgs.join(', ')}`)
          }
        }
        if (errors.non_field_errors) {
          const nonFieldErrors = Array.isArray(errors.non_field_errors)
            ? errors.non_field_errors as string[]
            : [String(errors.non_field_errors)]
          fieldErrors.push(...nonFieldErrors)
        }

        if (fieldErrors.length > 0) {
          errorMessage = fieldErrors.join('\n')
        } else if (errors.error) {
          errorMessage = String(errors.error)
        } else if (typeof errors === 'string') {
          errorMessage = errors
        }
      } else if (err.message) {
        errorMessage = err.message
      }

      throw new Error(errorMessage)
    }
  },

  logout: () => {
    const token = get().token || Cookies.get('token')
    if (token) {
      void authApi.logout().catch(() => {
        // Best-effort server revoke; always clear local session
      })
    }
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
    } catch {
      Cookies.remove('token')
      set({ user: null, token: null, isLoading: false })
    }
  },
}))

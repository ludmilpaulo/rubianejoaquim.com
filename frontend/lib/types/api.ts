import type { AxiosError } from 'axios'

export interface ApiErrorBody {
  error?: string
  detail?: string
  message?: string
  non_field_errors?: string[]
  email?: string | string[]
  password?: string | string[]
  [key: string]: string | string[] | undefined
}

export type ApiError = AxiosError<ApiErrorBody>

export function isApiError(error: unknown): error is ApiError {
  return typeof error === 'object' && error !== null && 'isAxiosError' in error
}

export function getApiErrorMessage(error: unknown, fallback = 'Ocorreu um erro'): string {
  if (!isApiError(error)) {
    if (error instanceof Error && error.message) return error.message
    return fallback
  }
  const data = error.response?.data
  if (!data) return error.message || fallback
  if (typeof data.detail === 'string') return data.detail
  if (typeof data.error === 'string') return data.error
  if (typeof data.message === 'string') return data.message
  if (data.non_field_errors?.[0]) return String(data.non_field_errors[0])
  return fallback
}

/** Production default when hosting omits NEXT_PUBLIC_API_URL at build time. */
export const PRODUCTION_API_DEFAULT = 'https://ludmilpaulo.pythonanywhere.com/api'

export function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (process.env.NODE_ENV === 'development') {
    return 'http://127.0.0.1:8000/api'
  }
  return PRODUCTION_API_DEFAULT
}

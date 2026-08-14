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

function looksTechnical(msg: string): boolean {
  const trimmed = msg.trim()
  if (!trimmed || trimmed === '<' || trimmed.startsWith('<')) return true
  return /network error|timeout|econnrefused|enotfound|status code|axios|request failed|<html|<!doctype|traceback|django|json parse|unexpected token/i.test(
    trimmed,
  )
}

export function getApiErrorMessage(error: unknown, fallback = 'Ocorreu um erro'): string {
  if (!isApiError(error)) {
    if (error instanceof Error && error.message) {
      if (looksTechnical(error.message)) return fallback
      return error.message
    }
    return fallback
  }
  const data = error.response?.data as unknown
  if (!data) {
    const msg = error.message || fallback
    return looksTechnical(msg) ? fallback : msg
  }
  if (typeof data === 'string') {
    return looksTechnical(data) ? fallback : data.trim().slice(0, 280)
  }
  if (typeof data !== 'object') return fallback
  const record = data as ApiErrorBody
  const pick =
    (typeof record.detail === 'string' && record.detail) ||
    (typeof record.error === 'string' && record.error) ||
    (typeof record.message === 'string' && record.message) ||
    (record.non_field_errors?.[0] && String(record.non_field_errors[0])) ||
    ''
  if (!pick || looksTechnical(pick)) return fallback
  return pick
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

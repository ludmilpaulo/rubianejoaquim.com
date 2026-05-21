'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  getMessages,
  getStoredLocale,
  getDeviceLocale,
  setStoredLocale,
  t as translate,
  resolveText,
  tWith,
  type Locale,
  type Messages,
  LOCALES,
  isLocale,
} from '../i18n'
import { authApi } from '../services/api'

interface I18nContextValue {
  locale: Locale
  messages: Messages
  t: (key: string) => string
  tw: (key: string, vars?: Record<string, string | number>) => string
  resolve: (text: string) => string
  setLocale: (locale: Locale) => Promise<void>
  locales: readonly Locale[]
}

const I18nContext = createContext<I18nContextValue | null>(null)

/**
 * Priority: saved app choice → device language.
 * Profile preferred_locale is applied only when the user picks a language in Settings
 * (which writes to storage + API).
 */
async function resolveInitialLocale(): Promise<Locale> {
  return getStoredLocale()
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getDeviceLocale())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    resolveInitialLocale().then((resolved) => {
      setLocaleState(resolved)
      setReady(true)
    })
  }, [])

  const setLocale = useCallback(async (next: Locale) => {
    await setStoredLocale(next)
    setLocaleState(next)
    try {
      await authApi.updateProfile({ preferred_locale: next })
    } catch {
      // keep local preference
    }
  }, [])

  const messages = useMemo(() => getMessages(locale), [locale])
  const translateFn = useCallback((key: string) => translate(messages, key), [messages])
  const translateWithFn = useCallback(
    (key: string, vars?: Record<string, string | number>) => tWith(messages, key, vars),
    [messages],
  )
  const resolveFn = useCallback((text: string) => resolveText(messages, text), [messages])

  const value = useMemo(
    () => ({
      locale,
      messages,
      t: translateFn,
      tw: translateWithFn,
      resolve: resolveFn,
      setLocale,
      locales: LOCALES,
    }),
    [locale, messages, translateFn, translateWithFn, resolveFn, setLocale],
  )

  if (!ready) {
    return null
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

/** Apply locale from user profile after login (explicit server preference). */
export async function applyLocaleFromUser(preferred?: string | null) {
  if (preferred && isLocale(preferred)) {
    await setStoredLocale(preferred)
    return preferred
  }
  return null
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}

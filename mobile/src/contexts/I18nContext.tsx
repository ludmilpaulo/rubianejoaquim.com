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
  getLocaleMode,
  setStoredLocale,
  setUseDeviceLocale,
  t as translate,
  resolveText,
  tWith,
  DEVICE_LOCALE_MODE,
  type Locale,
  type LocalePreference,
  type Messages,
  LOCALES,
  isLocale,
} from '../i18n'
import { authApi } from '../services/api'

interface I18nContextValue {
  locale: Locale
  /** 'device' when following system language; otherwise a fixed Locale. */
  localeMode: LocalePreference
  messages: Messages
  t: (key: string) => string
  tw: (key: string, vars?: Record<string, string | number>) => string
  resolve: (text: string) => string
  setLocale: (locale: Locale) => Promise<void>
  useDeviceLanguage: () => Promise<void>
  locales: readonly Locale[]
}

const I18nContext = createContext<I18nContextValue | null>(null)

/**
 * Priority: manual app choice → device language.
 * Profile preferred_locale is applied on login when user has an explicit preference
 * (see applyLocaleFromUser). Use-device mode stores preferred_locale as empty/device on API.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getDeviceLocale())
  const [localeMode, setLocaleMode] = useState<LocalePreference>(DEVICE_LOCALE_MODE)

  useEffect(() => {
    Promise.all([getStoredLocale(), getLocaleMode()])
      .then(([resolved, mode]) => {
        setLocaleState(resolved)
        setLocaleMode(mode)
      })
      .catch(() => {
        // Keep device locale defaults if storage fails.
      })
  }, [])

  const setLocale = useCallback(async (next: Locale) => {
    await setStoredLocale(next)
    setLocaleState(next)
    setLocaleMode(next)
    try {
      await authApi.updateProfile({ preferred_locale: next })
    } catch {
      // keep local preference
    }
  }, [])

  const useDeviceLanguage = useCallback(async () => {
    const next = await setUseDeviceLocale()
    setLocaleState(next)
    setLocaleMode(DEVICE_LOCALE_MODE)
    try {
      // Empty string signals "follow device" on profile for new sessions
      await authApi.updateProfile({ preferred_locale: '' })
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
      localeMode,
      messages,
      t: translateFn,
      tw: translateWithFn,
      resolve: resolveFn,
      setLocale,
      useDeviceLanguage,
      locales: LOCALES,
    }),
    [
      locale,
      localeMode,
      messages,
      translateFn,
      translateWithFn,
      resolveFn,
      setLocale,
      useDeviceLanguage,
    ],
  )

  // Always provide context. Initial locale is device default; storage may refine it.
  // Returning null here previously caused a permanent blank screen if AsyncStorage hung.
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

/**
 * Apply locale from user profile after login.
 * Only applies when the server has an explicit locale (not blank / device).
 * Returns the locale that was applied, or null if device mode should remain.
 */
export async function applyLocaleFromUser(preferred?: string | null): Promise<Locale | null> {
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

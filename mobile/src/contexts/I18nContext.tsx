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
  type Locale,
  type Messages,
  LOCALES,
} from '../i18n'
import { authApi } from '../services/api'

interface I18nContextValue {
  locale: Locale
  messages: Messages
  t: (key: string) => string
  setLocale: (locale: Locale) => Promise<void>
  locales: readonly Locale[]
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('pt')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const me = await authApi.me()
        const fromProfile = me?.preferred_locale as Locale | undefined
        if (fromProfile && LOCALES.includes(fromProfile)) {
          await setStoredLocale(fromProfile)
          setLocaleState(fromProfile)
        } else {
          const stored = await getStoredLocale()
          setLocaleState(stored)
        }
      } catch {
        const stored = await getStoredLocale()
        setLocaleState(stored ?? getDeviceLocale())
      }
      setReady(true)
    }
    init()
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

  const value = useMemo(
    () => ({
      locale,
      messages,
      t: translateFn,
      setLocale,
      locales: LOCALES,
    }),
    [locale, messages, translateFn, setLocale],
  )

  if (!ready) {
    return null
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}

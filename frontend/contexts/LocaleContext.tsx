'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import Cookies from 'js-cookie'
import {
  defaultLocale,
  LOCALE_COOKIE,
  type Locale,
  isLocale,
} from '@/lib/i18n/config'
import { getMessages, translate, type Messages } from '@/lib/i18n'

interface LocaleContextValue {
  locale: Locale
  messages: Messages
  t: (key: string) => string
  setLocale: (locale: Locale) => void
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

function readInitialLocale(): Locale {
  if (typeof window === 'undefined') return defaultLocale
  const cookie = Cookies.get(LOCALE_COOKIE)
  if (cookie && isLocale(cookie)) return cookie
  const browser = navigator.language?.split('-')[0]
  if (browser && isLocale(browser)) return browser
  return defaultLocale
}

export function LocaleProvider({
  children,
  initialLocale,
}: {
  children: ReactNode
  initialLocale?: Locale
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? defaultLocale)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setLocaleState(readInitialLocale())
    setMounted(true)
  }, [])

  const setLocale = useCallback((next: Locale) => {
    Cookies.set(LOCALE_COOKIE, next, { expires: 365, sameSite: 'lax' })
    setLocaleState(next)
    document.documentElement.lang = next === 'pt' ? 'pt-PT' : next
    window.location.reload()
  }, [])

  const messages = useMemo(() => getMessages(locale), [locale])

  const t = useCallback(
    (key: string) => translate(messages, key),
    [messages],
  )

  const value = useMemo(
    () => ({ locale: mounted ? locale : initialLocale ?? defaultLocale, messages, t, setLocale }),
    [locale, messages, t, setLocale, mounted, initialLocale],
  )

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  )
}

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}

export function useTranslations() {
  return useLocale().t
}

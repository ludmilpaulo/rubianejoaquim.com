import AsyncStorage from '@react-native-async-storage/async-storage'
import pt from './locales/pt'
import en from './locales/en'
import fr from './locales/fr'
import es from './locales/es'

export const LOCALES = ['pt', 'en', 'fr', 'es'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'pt'
const STORAGE_KEY = 'ZENDA_LOCALE'

const catalogs = { pt, en, fr, es }

export type Messages = (typeof catalogs)[Locale]

export function isLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale)
}

/** Detect device language via Intl (no extra native module). */
export function getDeviceLocale(): Locale {
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale || 'pt-PT'
    const code = tag.split('-')[0].toLowerCase()
    if (isLocale(code)) return code
  } catch {
    // ignore
  }
  return DEFAULT_LOCALE
}

export async function getStoredLocale(): Promise<Locale> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY)
  if (stored && isLocale(stored)) return stored
  return getDeviceLocale()
}

export async function setStoredLocale(locale: Locale): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, locale)
}

export function getMessages(locale: Locale): Messages {
  return catalogs[locale] ?? catalogs.pt
}

export function t(messages: Messages, key: string): string {
  const parts = key.split('.')
  let current: unknown = messages
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part]
    } else {
      return key
    }
  }
  return typeof current === 'string' ? current : key
}

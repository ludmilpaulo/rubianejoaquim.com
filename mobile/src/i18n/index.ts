import AsyncStorage from '@react-native-async-storage/async-storage'
import pt from './locales/pt'
import en from './locales/en'
import fr from './locales/fr'
import es from './locales/es'
import { commonScreens } from './commonScreens'

export const LOCALES = ['pt', 'en', 'fr', 'es'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'pt'
const STORAGE_KEY = 'ZENDA_LOCALE'

function mergeCatalog<T extends Record<string, unknown>>(base: T, extra: Record<string, unknown>): T {
  const out = { ...base } as Record<string, unknown>
  for (const key of Object.keys(extra)) {
    const baseVal = out[key]
    const extraVal = extra[key]
    if (
      baseVal &&
      extraVal &&
      typeof baseVal === 'object' &&
      typeof extraVal === 'object' &&
      !Array.isArray(baseVal) &&
      !Array.isArray(extraVal)
    ) {
      out[key] = { ...(baseVal as object), ...(extraVal as object) }
    } else {
      out[key] = extraVal
    }
  }
  return out as T
}

const catalogs = {
  pt: mergeCatalog(pt, commonScreens.pt),
  en: mergeCatalog(en, commonScreens.en),
  fr: mergeCatalog(fr, commonScreens.fr),
  es: mergeCatalog(es, commonScreens.es),
}

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

/** Translate API/redux error payloads that use i18n keys (e.g. api.errors.network). */
export function resolveText(messages: Messages, text: string): string {
  if (text.includes('.') && !/\s/.test(text)) {
    const translated = t(messages, text)
    if (translated !== text) return translated
  }
  return text
}

export function translateForLocale(locale: Locale, key: string): string {
  return t(getMessages(locale), key)
}

export function interpolate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    vars[name] !== undefined ? String(vars[name]) : `{{${name}}}`,
  )
}

export function tWith(
  messages: Messages,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const raw = t(messages, key)
  return vars ? interpolate(raw, vars) : raw
}

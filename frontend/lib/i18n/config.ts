export const locales = ['pt', 'en', 'fr', 'es'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'pt'
export const LOCALE_COOKIE = 'NEXT_LOCALE'

export const localeLabels: Record<Locale, string> = {
  pt: 'PT',
  en: 'EN',
  fr: 'FR',
  es: 'ES',
}

export const localeHtmlLang: Record<Locale, string> = {
  pt: 'pt-PT',
  en: 'en',
  fr: 'fr',
  es: 'es',
}

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale)
}

export function detectLocaleFromAcceptLanguage(header: string | null): Locale {
  if (!header) return defaultLocale
  const parts = header.split(',').map((p) => p.split(';')[0].trim().toLowerCase())
  for (const part of parts) {
    const code = part.split('-')[0]
    if (isLocale(code)) return code
  }
  return defaultLocale
}

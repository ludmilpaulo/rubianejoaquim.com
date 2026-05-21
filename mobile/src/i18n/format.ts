import type { Locale } from './index'

export const LOCALE_BCP47: Record<Locale, string> = {
  pt: 'pt-PT',
  en: 'en-US',
  fr: 'fr-FR',
  es: 'es-ES',
}

export function getBcp47(locale: Locale): string {
  return LOCALE_BCP47[locale] ?? LOCALE_BCP47.pt
}

export function formatDate(
  locale: Locale,
  date: Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  return date.toLocaleDateString(getBcp47(locale), options)
}

export function formatTime(
  locale: Locale,
  date: Date,
  options?: Intl.DateTimeFormatOptions,
): string {
  return date.toLocaleTimeString(getBcp47(locale), options)
}

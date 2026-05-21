import type { Locale } from './config'
import pt from './messages/pt.json'
import en from './messages/en.json'
import fr from './messages/fr.json'
import es from './messages/es.json'

export type Messages = typeof pt

const catalogs: Record<Locale, Messages> = { pt, en, fr, es }

export function getMessages(locale: Locale): Messages {
  return catalogs[locale] ?? catalogs.pt
}

type NestedKeyOf<T, Prefix extends string = ''> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? NestedKeyOf<T[K], `${Prefix}${K}.`>
        : `${Prefix}${K}`
    }[keyof T & string]
  : never

export type TranslationKey = NestedKeyOf<Messages>

export function translate(messages: Messages, key: string): string {
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

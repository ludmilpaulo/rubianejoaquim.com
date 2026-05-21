export const CMS_LOCALES = ['pt', 'en', 'fr', 'es'] as const
export type CmsLocale = (typeof CMS_LOCALES)[number]

export type LocaleBlock = {
  title?: string
  subtitle?: string
  body?: string
  badge?: string
  cta_label?: string
  roles?: string[]
  trust_items?: string[]
  ctas?: { key: string; label: string; url: string; variant?: string }[]
  cards?: { title: string; description: string; href: string; cta: string }[]
  category_labels?: Record<string, string>
  extra_data?: Record<string, unknown>
  description?: string
  short_description?: string
  features?: string[]
  cta_text?: string
  cta_link?: string
  keywords?: string
  og_title?: string
  og_description?: string
  brand_name?: string
  brand_tagline?: string
  footer_description?: string
  footer_rights?: string
  contact_title?: string
  contact_subtitle?: string
  play_store_label?: string
  app_store_label?: string
  contact_form?: Record<string, string>
}

export type TranslationsMap = Partial<Record<CmsLocale, LocaleBlock>>

export function blockFromTranslations(
  translations: TranslationsMap | undefined,
  locale: CmsLocale,
): LocaleBlock {
  return translations?.[locale] ?? translations?.pt ?? {}
}

export function mergeTranslations(
  existing: TranslationsMap | undefined,
  locale: CmsLocale,
  patch: LocaleBlock,
): TranslationsMap {
  return {
    ...(existing || {}),
    [locale]: {
      ...(existing?.[locale] || {}),
      ...patch,
    },
  }
}

export function linesToArray(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function arrayToLines(arr?: string[]): string {
  return (arr || []).join('\n')
}

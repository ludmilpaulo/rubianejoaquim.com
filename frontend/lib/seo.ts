import { defaultLocale, isLocale, type Locale } from './i18n/config'
import type { PageSEO } from './public-types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api'

export async function fetchPageSeo(pageKey: string, locale?: string): Promise<PageSEO | null> {
  const lang = locale && isLocale(locale) ? locale : defaultLocale
  try {
    const res = await fetch(`${API_BASE}/public/page-seo/${pageKey}/?lang=${lang}`, {
      next: { revalidate: 120 },
    })
    if (!res.ok) return null
    return (await res.json()) as PageSEO
  } catch {
    return null
  }
}

export function seoToMetadata(seo: PageSEO | null, fallback: { title: string; description: string }) {
  const title = seo?.title || seo?.og_title || fallback.title || undefined
  const description = seo?.description || seo?.og_description || fallback.description || undefined
  return {
    title: title || undefined,
    description: description || undefined,
    openGraph: {
      title: seo?.og_title || title,
      description: seo?.og_description || description,
      images: seo?.og_image_url ? [{ url: seo.og_image_url }] : undefined,
    },
  }
}

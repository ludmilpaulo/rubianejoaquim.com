import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import ZendaLanding from '@/components/zenda/ZendaLanding'
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from '@/lib/i18n/config'
import { fetchPageSeo, seoToMetadata } from '@/lib/seo'

async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const value = cookieStore.get(LOCALE_COOKIE)?.value
  if (value && isLocale(value)) return value
  return defaultLocale
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale()
  const seo = await fetchPageSeo('zenda', locale)
  return seoToMetadata(seo, {
    title: 'Zenda App | Finance & Education',
    description: 'Zenda — personal and business finance by Rubiane Joaquim.',
  })
}

export default function ZendaPage() {
  return <ZendaLanding />
}

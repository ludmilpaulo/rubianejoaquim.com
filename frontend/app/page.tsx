import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import HomePage from '@/components/portfolio/HomePage'
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
  const seo = await fetchPageSeo('home', locale)
  return seoToMetadata(seo, {
    title: 'Rubiane Joaquim | Creative Video Producer & Zenda',
    description: 'Creative video production, marketing storytelling, and Zenda.',
  })
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rubianejoaquim.com'

const personSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Rubiane Joaquim',
  jobTitle: 'Creative Video Content Producer',
  url: SITE_URL,
  image: `${SITE_URL}/images/Rubiane.jpeg`,
}

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <HomePage />
    </>
  )
}

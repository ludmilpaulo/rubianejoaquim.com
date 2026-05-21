import type { Metadata } from 'next'
import ZendaLanding from '@/components/zenda/ZendaLanding'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rubianejoaquim.com'

export const metadata: Metadata = {
  title: 'Zenda — Premium Financial Education & Money Management App',
  description:
    'Zenda by Rubiane Joaquim: personal & business finance, AI copilot, courses, multi-currency, health score. iOS & Android. PT, EN, FR, ES.',
  openGraph: {
    title: 'Zenda App | Rubiane Joaquim',
    description: 'Premium fintech + learning platform — budgets, goals, AI coach, global FX.',
    url: '/zenda',
    images: [{ url: '/images/zenda-app.png', width: 1200, height: 630, alt: 'Zenda App' }],
    locale: 'pt_PT',
    alternateLocale: ['en_US', 'fr_FR', 'es_ES'],
  },
  alternates: {
    canonical: '/zenda',
    languages: { pt: '/zenda', en: '/zenda', fr: '/zenda', es: '/zenda' },
  },
}

const appSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Zenda',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Android, iOS',
  offers: { '@type': 'Offer', price: '10000', priceCurrency: 'AOA' },
  author: { '@type': 'Person', name: 'Rubiane Joaquim', url: SITE_URL },
}

export default function ZendaPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
      />
      <ZendaLanding />
    </>
  )
}

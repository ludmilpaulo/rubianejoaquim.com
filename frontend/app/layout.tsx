import type { Metadata, Viewport } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import { cookies } from 'next/headers'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import WhatsAppButton from '@/components/WhatsAppButton'
import { LocaleProvider } from '@/contexts/LocaleContext'
import { SiteDataProvider } from '@/contexts/SiteDataContext'
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from '@/lib/i18n/config'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rubianejoaquim.com'

export const viewport: Viewport = {
    themeColor: '#3534C9',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  title: {
    default:
      'Rubiane Joaquim | Creative Video Producer, Marketing Storyteller & Zenda',
    template: '%s | Rubiane Joaquim',
  },
  description:
    'Rubiane Joaquim — creative video content producer, marketing campaign storyteller, interview producer, scriptwriter, CapCut/Canva editor, and founder of Zenda. Multilingual portfolio for international clients.',
  keywords: [
    'Rubiane Joaquim',
    'creative video producer',
    'marketing campaign video',
    'interview production',
    'scriptwriter',
    'roteirista',
    'CapCut editor',
    'Canva designer',
    'brand storytelling',
    'Zenda app',
    'video content producer',
    'social media reels',
  ],
  authors: [{ name: 'Rubiane Joaquim', url: SITE_URL }],
  creator: 'Rubiane Joaquim',
  publisher: 'Rubiane Joaquim',
  applicationName: 'Rubiane Joaquim',
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
    languages: { pt: '/', en: '/', fr: '/', es: '/' },
  },
  openGraph: {
    type: 'website',
    locale: 'pt_PT',
    alternateLocale: ['en_US', 'fr_FR', 'es_ES'],
    url: '/',
    siteName: 'Rubiane Joaquim',
    title: 'Rubiane Joaquim | Creative Video & Marketing Storytelling',
    description:
      'Professional video production, interviews, scripts, social content, and Zenda — portfolio for global brands.',
    images: [
      {
        url: '/zenda_logo.svg',
        width: 1024,
        height: 1024,
        alt: 'Zenda — app de finanças e educação de Rubiane Joaquim',
        type: 'image/svg+xml',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rubiane Joaquim | Creative Video Producer',
    description: 'Campaign videos, interviews, reels, scripts & Zenda.',
    images: ['/zenda_logo.svg'],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: '/zenda_logo.svg',
    apple: '/zenda_logo.svg',
  },
}

async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const value = cookieStore.get(LOCALE_COOKIE)?.value
  if (value && isLocale(value)) return value
  return defaultLocale
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const initialLocale = await getServerLocale()
  const htmlLang = initialLocale === 'pt' ? 'pt-PT' : initialLocale

  return (
    <html lang={htmlLang} className={`${playfair.variable} ${dmSans.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'Person',
                  '@id': `${SITE_URL}/#person`,
                  name: 'Rubiane Joaquim',
                  jobTitle: 'Creative Video Content Producer',
                  image: `${SITE_URL}/zenda_logo.svg`,
                  url: SITE_URL,
                  sameAs: [],
                },
                {
                  '@type': 'WebSite',
                  '@id': `${SITE_URL}/#website`,
                  url: SITE_URL,
                  name: 'Rubiane Joaquim',
                  inLanguage: ['pt', 'en', 'fr', 'es'],
                  publisher: { '@id': `${SITE_URL}/#person` },
                },
              ],
            }),
          }}
        />
      </head>
      <body className={`${dmSans.className} antialiased bg-slate-950 text-slate-100`} suppressHydrationWarning>
        <LocaleProvider initialLocale={initialLocale}>
          <SiteDataProvider>
          <Navbar />
          <main
            className="min-h-screen w-full min-w-0 overflow-x-hidden"
            style={{
              paddingTop: 'env(safe-area-inset-top, 0px)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            {children}
          </main>
          <Footer />
          <WhatsAppButton />
          </SiteDataProvider>
        </LocaleProvider>
      </body>
    </html>
  )
}

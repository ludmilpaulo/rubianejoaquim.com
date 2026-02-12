import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import WhatsAppButton from '@/components/WhatsAppButton'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rubianejoaquim.com'

export const viewport: Viewport = {
  themeColor: '#4f46e5',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  title: {
    default: 'Rubiane Joaquim | Educação Financeira — Cursos e Mentoria para Todos os Países de Língua Portuguesa',
    template: '%s | Rubiane Joaquim Educação Financeira'
  },
  description: 'Rubiane Joaquim — especialista em educação financeira. Cursos online e mentoria personalizada para todos os países e pessoas de língua portuguesa. Poupar, investir e liberdade financeira. Literacia financeira e gestão de dinheiro para Portugal, Brasil, Angola, Moçambique e lusófonos.',
  keywords: [
    'Rubiane Joaquim',
    'educação financeira',
    'curso educação financeira língua portuguesa',
    'mentoria financeira pessoal',
    'literacia financeira',
    'como poupar dinheiro',
    'investir para iniciantes',
    'gestão de dinheiro',
    'liberdade financeira',
    'cursos finanças pessoais online',
    'mentoria investimentos',
    'poupança e investimento',
    'finanças pessoais',
    'formação financeira Portugal Brasil Angola',
    'educação financeira para famílias',
    'orçamento familiar',
    'cursos língua portuguesa',
    'educação financeira lusófonos',
  ],
  authors: [{ name: 'Rubiane Joaquim', url: SITE_URL }],
  creator: 'Rubiane Joaquim',
  publisher: 'Rubiane Joaquim',
  applicationName: 'Rubiane Joaquim Educação Financeira',
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(SITE_URL),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_PT',
    url: '/',
    siteName: 'Rubiane Joaquim Educação Financeira',
    title: 'Rubiane Joaquim | Educação Financeira — Cursos e Mentoria para Todos os Países de Língua Portuguesa',
    description: 'Cursos e mentoria em educação financeira para todos os países e pessoas de língua portuguesa. Com Rubiane Joaquim — poupar, investir e liberdade financeira. Portugal, Brasil, Angola, Moçambique e lusófonos.',
    images: [
      {
        url: '/images/Rubiane.jpeg',
        width: 1200,
        height: 630,
        alt: 'Rubiane Joaquim — Especialista em Educação Financeira. Cursos e mentoria para todos os países de língua portuguesa.',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rubiane Joaquim | Educação Financeira — Cursos e Mentoria para Língua Portuguesa',
    description: 'Cursos e mentoria em educação financeira para todos os países e pessoas de língua portuguesa. Poupar, investir, liberdade financeira.',
    images: ['/images/Rubiane.jpeg'],
    creator: '@rubianejoaquim',
    site: '@rubianejoaquim',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // google: 'your-google-search-console-code',
    // yandex: 'your-yandex-verification-code',
  },
  category: 'education',
  icons: {
    icon: '/images/Rubiane.jpeg',
    apple: '/images/Rubiane.jpeg',
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-title': 'Rubiane Joaquim Educação Financeira',
    'apple-mobile-web-app-status-bar-style': 'default',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-PT" className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'EducationalOrganization',
                  '@id': `${SITE_URL}/#organization`,
                  name: 'Rubiane Joaquim Educação Financeira',
                  description: 'Cursos online e mentoria em educação financeira para todos os países e pessoas de língua portuguesa. Formação em literacia financeira, poupança, investimentos e liberdade financeira. Portugal, Brasil, Angola, Moçambique e lusófonos.',
                  url: SITE_URL,
                  image: `${SITE_URL}/images/Rubiane.jpeg`,
                  logo: { '@type': 'ImageObject', url: `${SITE_URL}/images/Rubiane.jpeg` },
                  sameAs: [],
                  contactPoint: {
                    '@type': 'ContactPoint',
                    contactType: 'Customer Service',
                    email: 'contacto@rubianejoaquim.com',
                    telephone: '+244 944 905246',
                    url: 'https://wa.me/244944905246',
                    availableLanguage: 'Portuguese',
                    areaServed: ['PT', 'BR', 'AO', 'MZ', 'CV', 'ST', 'GW', 'TL'],
                  },
                },
                {
                  '@type': 'Person',
                  '@id': `${SITE_URL}/#person`,
                  name: 'Rubiane Joaquim',
                  jobTitle: 'Especialista em Educação Financeira',
                  image: `${SITE_URL}/images/Rubiane.jpeg`,
                  worksFor: { '@id': `${SITE_URL}/#organization` },
                },
                {
                  '@type': 'WebSite',
                  '@id': `${SITE_URL}/#website`,
                  url: SITE_URL,
                  name: 'Rubiane Joaquim Educação Financeira',
                  description: 'Cursos e mentoria em educação financeira para todos os países e pessoas de língua portuguesa. Formação profissional para poupar e investir.',
                  publisher: { '@id': `${SITE_URL}/#organization` },
                  inLanguage: 'pt',
                  potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/cursos?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
                },
              ],
            }),
          }}
        />
      </head>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
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
      </body>
    </html>
  )
}

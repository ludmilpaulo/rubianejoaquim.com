import type { Metadata } from 'next'
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

export const metadata: Metadata = {
  title: {
    default: 'Rubiane Joaquim | Educação Financeira — Cursos e Mentoria em Portugal',
    template: '%s | Rubiane Joaquim Educação Financeira'
  },
  description: 'Rubiane Joaquim, especialista em educação financeira. Cursos online e mentoria personalizada para poupar, investir e alcançar liberdade financeira. Formação em literacia financeira em Portugal.',
  keywords: [
    'Rubiane Joaquim',
    'educação financeira',
    'curso educação financeira Portugal',
    'mentoria financeira pessoal',
    'literacia financeira',
    'como poupar dinheiro',
    'investir para iniciantes',
    'gestão de dinheiro',
    'liberdade financeira',
    'cursos financeiros online',
    'mentoria investimentos',
    'poupança e investimento',
    'finanças pessoais Portugal',
  ],
  authors: [{ name: 'Rubiane Joaquim', url: process.env.NEXT_PUBLIC_SITE_URL || 'https://rubianejoaquim.com' }],
  creator: 'Rubiane Joaquim',
  publisher: 'Rubiane Joaquim',
  applicationName: 'Rubiane Joaquim Educação Financeira',
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://rubianejoaquim.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'pt_PT',
    url: '/',
    siteName: 'Rubiane Joaquim Educação Financeira',
    title: 'Rubiane Joaquim | Educação Financeira — Cursos e Mentoria em Portugal',
    description: 'Cursos online e mentoria em educação financeira com Rubiane Joaquim. Aprenda a poupar, investir e alcançar a sua liberdade financeira. Formação profissional em Portugal.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Rubiane Joaquim — Educação Financeira, Cursos e Mentoria em Portugal',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rubiane Joaquim | Educação Financeira — Cursos e Mentoria em Portugal',
    description: 'Cursos online e mentoria em educação financeira. Poupar, investir e liberdade financeira. Formação com Rubiane Joaquim em Portugal.',
    images: ['/og-image.jpg'],
    creator: '@rubianejoaquim',
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
                  '@id': `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rubianejoaquim.com'}/#organization`,
                  name: 'Rubiane Joaquim Educação Financeira',
                  description: 'Cursos online e mentoria em educação financeira. Formação em literacia financeira, poupança, investimentos e liberdade financeira em Portugal.',
                  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://rubianejoaquim.com',
                  logo: { '@type': 'ImageObject', url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rubianejoaquim.com'}/logo.png` },
                  sameAs: [],
                  contactPoint: {
                    '@type': 'ContactPoint',
                    contactType: 'Customer Service',
                    email: 'contacto@rubianejoaquim.com',
                    telephone: '+244 944 905246',
                    url: 'https://wa.me/244944905246',
                    availableLanguage: 'Portuguese',
                    areaServed: ['PT', 'AO'],
                  },
                },
                {
                  '@type': 'Person',
                  '@id': `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rubianejoaquim.com'}/#person`,
                  name: 'Rubiane Joaquim',
                  jobTitle: 'Especialista em Educação Financeira',
                  worksFor: { '@id': `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rubianejoaquim.com'}/#organization` },
                },
                {
                  '@type': 'WebSite',
                  '@id': `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rubianejoaquim.com'}/#website`,
                  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://rubianejoaquim.com',
                  name: 'Rubiane Joaquim Educação Financeira',
                  description: 'Cursos e mentoria em educação financeira em Portugal. Rubiane Joaquim.',
                  publisher: { '@id': `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rubianejoaquim.com'}/#organization` },
                  inLanguage: 'pt-PT',
                  potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rubianejoaquim.com'}/cursos?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
                },
              ],
            }),
          }}
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        <Navbar />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
        <WhatsAppButton />
      </body>
    </html>
  )
}

import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'Erica Educação Financeira | Cursos e Mentoria em Educação Financeira',
    template: '%s | Erica Educação Financeira'
  },
  description: 'Transforme a sua relação com o dinheiro através de cursos práticos e mentoria personalizada em educação financeira. Aprenda a gerir, investir e alcançar a sua liberdade financeira.',
  keywords: ['educação financeira', 'cursos financeiros', 'mentoria financeira', 'gestão de dinheiro', 'investimentos', 'liberdade financeira', 'Portugal'],
  authors: [{ name: 'Erica Educação Financeira' }],
  creator: 'Erica Educação Financeira',
  publisher: 'Erica Educação Financeira',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'pt_PT',
    url: '/',
    siteName: 'Erica Educação Financeira',
    title: 'Erica Educação Financeira | Cursos e Mentoria em Educação Financeira',
    description: 'Transforme a sua relação com o dinheiro através de cursos práticos e mentoria personalizada em educação financeira.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Erica Educação Financeira',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Erica Educação Financeira | Cursos e Mentoria em Educação Financeira',
    description: 'Transforme a sua relação com o dinheiro através de cursos práticos e mentoria personalizada em educação financeira.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    // google: 'your-google-verification-code',
    // yandex: 'your-yandex-verification-code',
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
              '@type': 'EducationalOrganization',
              name: 'Erica Educação Financeira',
              description: 'Cursos e mentoria em educação financeira',
              url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
              logo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/logo.png`,
              sameAs: [
                // Add social media links here
              ],
              contactPoint: {
                '@type': 'ContactPoint',
                contactType: 'Customer Service',
                email: 'contacto@ericaeducacao.com',
              },
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
      </body>
    </html>
  )
}

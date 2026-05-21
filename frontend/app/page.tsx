import type { Metadata } from 'next'
import HomePage from '@/components/portfolio/HomePage'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rubianejoaquim.com'

export const metadata: Metadata = {
  title: 'Creative Video Content Producer & Marketing Storyteller | Rubiane Joaquim',
  description:
    'Rubiane Joaquim — creative video producer, campaign storyteller, interview producer, scriptwriter, and creator of Zenda. Portfolio, services, and contact for international clients.',
  openGraph: {
    title: 'Rubiane Joaquim | Creative Video & Marketing Storytelling',
    description:
      'Professional video production, interviews, scripts, CapCut/Canva content, and Zenda app — multilingual portfolio for global brands.',
    url: '/',
    siteName: 'Rubiane Joaquim',
    images: [
      {
        url: '/images/Rubiane.jpeg',
        width: 1200,
        height: 630,
        alt: 'Rubiane Joaquim — Creative Video Content Producer',
      },
    ],
    locale: 'pt_PT',
    alternateLocale: ['en_US', 'fr_FR', 'es_ES'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rubiane Joaquim | Creative Video Producer',
    description: 'Campaign videos, interviews, reels, scripts & Zenda — work with Rubiane.',
    images: ['/images/Rubiane.jpeg'],
  },
  alternates: {
    canonical: '/',
    languages: {
      pt: '/',
      en: '/',
      fr: '/',
      es: '/',
    },
  },
}

const personSchema = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Rubiane Joaquim',
  jobTitle: 'Creative Video Content Producer',
  url: SITE_URL,
  image: `${SITE_URL}/images/Rubiane.jpeg`,
  knowsAbout: [
    'Video Production',
    'Marketing Campaigns',
    'Interview Production',
    'Scriptwriting',
    'Brand Storytelling',
  ],
  creator: { '@type': 'SoftwareApplication', name: 'Zenda' },
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

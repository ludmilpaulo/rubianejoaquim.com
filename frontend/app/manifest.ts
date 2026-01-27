import type { MetadataRoute } from 'next'

const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rubianejoaquim.com'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Rubiane Joaquim Educação Financeira',
    short_name: 'Rubiane Joaquim',
    description: 'Cursos e mentoria em educação financeira para todos os países e pessoas de língua portuguesa. Poupar, investir e liberdade financeira.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#4f46e5',
    lang: 'pt-PT',
    orientation: 'portrait-primary',
    scope: '/',
    icons: [
      {
        src: '/images/Rubiane.jpeg',
        sizes: '192x192',
        type: 'image/jpeg',
        purpose: 'any',
      },
      {
        src: '/images/Rubiane.jpeg',
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'any',
      },
    ],
    categories: ['education', 'finance'],
    prefer_related_applications: false,
  }
}

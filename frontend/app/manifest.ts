import type { MetadataRoute } from 'next'

const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rubianejoaquim.com'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Rubiane Joaquim Educação Financeira',
    short_name: 'Rubiane Joaquim',
    description: 'Cursos e mentoria em educação financeira para todos os países e pessoas de língua portuguesa. Poupar, investir e liberdade financeira.',
    start_url: '/',
    display: 'standalone',
    theme_color: '#3534C9',
    background_color: '#F7F7FA',
    lang: 'pt-PT',
    orientation: 'portrait-primary',
    scope: '/',
    icons: [
      {
        src: '/zenda_logo.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/zenda_logo.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    categories: ['education', 'finance'],
    prefer_related_applications: false,
  }
}

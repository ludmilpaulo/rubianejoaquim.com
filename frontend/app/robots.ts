import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.rubianejoaquim.com'
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/', '/admin/', '/area-do-aluno/'] },
      { userAgent: 'Googlebot', allow: '/', disallow: ['/api/', '/admin/', '/area-do-aluno/'] },
      { userAgent: 'Bingbot', allow: '/', disallow: ['/api/', '/admin/', '/area-do-aluno/'] },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}

import type { PortfolioService } from '@/lib/portfolio-types'

const iconMap: Record<string, string> = {
  video: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
  script: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  interview: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z',
  capcut: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z',
  canva: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14',
  reels: 'M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4',
  story: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13',
  strategy: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10',
}

export default function ServiceCard({
  service,
  featured = false,
}: {
  service: PortfolioService
  featured?: boolean
}) {
  const path = iconMap[service.icon] ?? iconMap.video

  return (
    <article
      className={`group relative h-full p-6 sm:p-8 rounded-2xl premium-card hover:border-amber-400/25 transition-all duration-500 hover-lift ${
        featured ? 'lg:p-10' : ''
      }`}
    >
      <div
        className={`rounded-xl bg-gradient-to-br from-zenda-growth/20 to-zenda-primary/10 flex items-center justify-center mb-5 group-hover:scale-105 transition-transform ${
          featured ? 'w-14 h-14' : 'w-12 h-12'
        }`}
      >
        <svg className={`${featured ? 'w-7 h-7' : 'w-6 h-6'} text-amber-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={path} />
        </svg>
      </div>
      <h3 className={`font-semibold text-white mb-2 ${featured ? 'text-2xl' : 'text-xl'}`}>{service.title}</h3>
      <p className={`text-slate-400 leading-relaxed ${featured ? 'text-base' : 'text-sm'}`}>{service.description}</p>
      {featured && (
        <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-amber-400 shadow-lg shadow-amber-400/50" aria-hidden />
      )}
    </article>
  )
}

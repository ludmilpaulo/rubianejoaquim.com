'use client'

import Link from 'next/link'
import type { HomeSection, SiteSettings } from '@/lib/public-types'
import Reveal from './Reveal'

const WHATSAPP_BASE = 'https://wa.me/'

function btnClass(variant?: string) {
  if (variant === 'whatsapp') return 'btn-whatsapp w-full sm:w-auto min-w-[200px]'
  if (variant === 'secondary') return 'btn-secondary w-full sm:w-auto min-w-[200px]'
  return 'btn-primary w-full sm:w-auto min-w-[200px]'
}

export default function FinalContactCta({
  section,
  settings,
}: {
  section?: HomeSection
  settings: SiteSettings | Record<string, never>
}) {
  if (!section?.title) return null

  const whatsapp = 'whatsapp_number' in settings ? settings.whatsapp_number : ''
  const ctas = section.ctas ?? []

  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-600/25 via-slate-950 to-indigo-900/40" />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <Reveal>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight text-balance">
            {section.title}
          </h2>
          {section.subtitle && (
            <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">{section.subtitle}</p>
          )}
          <div className="mt-12 flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4">
            {ctas.map((cta) => {
              const href =
                cta.key === 'whatsapp' && whatsapp
                  ? `${WHATSAPP_BASE}${whatsapp}`
                  : cta.url
              const external = href.startsWith('http')
              if (external) {
                return (
                  <a key={cta.key} href={href} target="_blank" rel="noopener noreferrer" className={btnClass(cta.variant)}>
                    {cta.label}
                  </a>
                )
              }
              return (
                <Link key={cta.key} href={href} className={btnClass(cta.variant)}>
                  {cta.label}
                </Link>
              )
            })}
          </div>
        </Reveal>
      </div>
    </section>
  )
}

'use client'

import Link from 'next/link'
import type { HomeSection, ShowreelVideo, SiteSettings, HomepageStatistic } from '@/lib/public-types'
import { getYoutubeThumbnail } from '@/lib/youtube'
import RubianeImage from '@/components/RubianeImage'

interface HeroSectionProps {
  section?: HomeSection
  showreel?: ShowreelVideo | null
  settings?: SiteSettings | Record<string, never>
  statistics?: HomepageStatistic[]
}

export default function HeroSection({ section, showreel, settings, statistics }: HeroSectionProps) {
  if (!section) return null

  const roles = section.roles ?? []
  const ctas = section.ctas ?? []
  const trustItems = section.trust_items ?? []
  const brandName = settings?.brand_name || settings?.brand_tagline || ''
  const tagline = settings?.brand_tagline || section.subtitle || ''
  const thumbUrl = showreel ? getYoutubeThumbnail(showreel.youtube_url) : ''

  const btnClass = (variant?: string) => {
    if (variant === 'primary') return 'btn-primary text-center'
    if (variant === 'whatsapp') return 'btn-whatsapp text-center'
    if (variant === 'outline') return 'btn-outline-gold text-center'
    return 'btn-secondary text-center'
  }

  return (
    <section className="relative min-h-[100svh] flex items-center overflow-hidden cinematic-hero hero-mesh">
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.04] pointer-events-none invert" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute inset-0 film-grain opacity-20 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 w-full">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-6 animate-fade-in">
            {section.badge && (
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-400/25 bg-amber-400/10 text-amber-200 text-xs sm:text-sm font-medium mb-6 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                {section.badge}
              </span>
            )}
            <h1 className="font-display text-[2.35rem] sm:text-5xl md:text-6xl xl:text-[4.25rem] font-bold text-white leading-[1.02] tracking-tight text-balance">
              {section.title}
              {section.subtitle && (
                <span className="block text-gradient-gold mt-2 md:mt-3">{section.subtitle}</span>
              )}
            </h1>
            {section.body && (
              <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-xl leading-relaxed">{section.body}</p>
            )}
            {roles.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-2">
                {roles.map((role) => (
                  <span
                    key={role}
                    className="text-xs sm:text-sm px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300"
                  >
                    {role}
                  </span>
                ))}
              </div>
            )}
            {ctas.length > 0 && (
              <div className="mt-10 grid grid-cols-2 sm:flex sm:flex-wrap gap-3">
                {ctas.map((cta) => {
                  const href = cta.url
                  const className = `${btnClass(cta.variant)} col-span-2 sm:col-span-1`
                  if (href.startsWith('http')) {
                    return (
                      <a key={cta.key} href={href} className={className} target="_blank" rel="noopener noreferrer">
                        {cta.label}
                      </a>
                    )
                  }
                  if (href.startsWith('#')) {
                    return (
                      <a key={cta.key} href={href} className={className}>
                        {cta.label}
                      </a>
                    )
                  }
                  return (
                    <Link key={cta.key} href={href} className={className}>
                      {cta.label}
                    </Link>
                  )
                })}
              </div>
            )}
            {trustItems.length > 0 && (
              <ul className="mt-10 grid sm:grid-cols-3 gap-4 text-sm">
                {trustItems.map((text) => (
                  <li
                    key={text}
                    className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/5 text-slate-400"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" aria-hidden />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            )}
            {statistics && statistics.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-6">
                {statistics.map((s) => (
                  <div key={s.id}>
                    <div className="text-2xl font-display font-bold text-amber-400">{s.value}</div>
                    <div className="text-xs text-slate-500">{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-6 space-y-5 animate-slide-up">
            <div className="relative aspect-[4/5] max-w-sm mx-auto lg:ml-auto rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-2xl premium-glow animate-float">
              <RubianeImage />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
              {(brandName || tagline) && (
                <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl bg-black/50 backdrop-blur-md border border-white/10">
                  {brandName && (
                    <p className="text-amber-300 text-xs font-bold uppercase tracking-wider">{brandName}</p>
                  )}
                  {tagline && <p className="text-white text-sm font-medium mt-0.5">{tagline}</p>}
                </div>
              )}
            </div>
            {showreel && thumbUrl && (
              <a
                href="#showreel"
                className="block group relative max-w-sm mx-auto lg:ml-auto rounded-2xl overflow-hidden ring-1 ring-white/10 aspect-video bg-black shadow-2xl hover:ring-amber-400/40 transition-all"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbUrl}
                  alt={showreel.title}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/25 transition-colors">
                  <span className="w-16 h-16 rounded-full bg-amber-400 flex items-center justify-center text-slate-950 text-2xl shadow-lg group-hover:scale-110 transition-transform">
                    ▶
                  </span>
                </div>
                {showreel.title && (
                  <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                    <p className="text-white font-semibold text-sm">{showreel.title}</p>
                  </div>
                )}
              </a>
            )}
          </div>
        </div>
        {roles.length > 0 && (
          <div className="mt-16 overflow-hidden border-y border-white/5 py-4">
            <div className="flex marquee-track w-max gap-12 text-slate-500 text-sm uppercase tracking-[0.25em] font-medium">
              {[...roles, ...roles].map((role, i) => (
                <span key={`${role}-${i}`} className="whitespace-nowrap">
                  {role} ·
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

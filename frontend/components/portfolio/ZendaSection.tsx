'use client'

import Link from 'next/link'
import type { HomeSection, ZendaContent } from '@/lib/public-types'
import SectionIntro from './SectionIntro'
import Reveal from './Reveal'

function hasZendaData(zenda: ZendaContent | Record<string, never>): zenda is ZendaContent {
  return 'headline' in zenda && Boolean(zenda.headline)
}

export default function ZendaSection({
  zenda,
  intro,
}: {
  zenda: ZendaContent | Record<string, never>
  intro?: HomeSection
}) {
  if (!hasZendaData(zenda)) return null

  const features = zenda.features ?? []
  const benefits = zenda.benefits?.length ? zenda.benefits : features.map((f) => f.title).filter(Boolean)
  const screenshots = zenda.screenshots ?? []
  const exploreLabel = intro?.cta_label || 'Zenda'
  const badge = intro?.badge || 'Zenda App'

  return (
    <section id="zenda" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_40%,rgba(99,102,241,0.25),transparent_50%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <SectionIntro
              section={{
                ...intro,
                title: intro?.title || zenda.headline,
                subtitle: intro?.subtitle || zenda.subheadline,
              }}
              align="left"
            />
            <span className="inline-flex self-start md:self-auto px-4 py-2 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-sm font-medium">
              {badge}
            </span>
          </div>
        </Reveal>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start -mt-8">
          <Reveal>
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl premium-card">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">Zenda</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">{zenda.what_is}</p>
                </div>
                <div className="p-5 rounded-2xl premium-card">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">—</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">{zenda.who_it_helps}</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                {benefits.slice(0, 6).map((benefit) => (
                  <div
                    key={benefit}
                    className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.04] border border-white/5"
                  >
                    <span className="text-emerald-400 mt-0.5">✓</span>
                    <span className="text-slate-300 text-sm leading-snug">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/zenda" className="btn-primary">
                  {exploreLabel}
                </Link>
                {zenda.play_store_url && (
                  <a href={zenda.play_store_url} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                    Play Store
                  </a>
                )}
                {zenda.app_store_url && (
                  <a href={zenda.app_store_url} target="_blank" rel="noopener noreferrer" className="btn-outline-gold">
                    App Store
                  </a>
                )}
              </div>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {screenshots.length > 0 ? (
                screenshots.slice(0, 4).map((shot, i) => (
                  <div
                    key={shot.id}
                    className={`rounded-2xl overflow-hidden ring-1 ring-white/10 aspect-[9/16] bg-slate-800 ${
                      i === 0 ? 'col-span-2 sm:col-span-1' : ''
                    }`}
                  >
                    {shot.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={shot.image_url} alt={shot.caption || 'Zenda'} className="w-full h-full object-cover" loading="lazy" />
                    )}
                  </div>
                ))
              ) : (
                features.slice(0, 4).map((f) => (
                  <div
                    key={f.id}
                    className="rounded-2xl bg-gradient-to-br from-indigo-800/60 to-slate-900 aspect-[9/16] ring-1 ring-white/10 flex flex-col items-center justify-center p-4 text-center"
                  >
                    <span className="text-3xl">{f.icon || '◆'}</span>
                    <p className="text-xs text-slate-400 mt-2">{f.title}</p>
                  </div>
                ))
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

'use client'

import Link from 'next/link'
import type { HomeSection, SiteSettings, ZendaContent } from '@/lib/public-types'
import { ZENDA_APP_STORE_URL, ZENDA_PLAY_STORE_URL } from '@/lib/zenda-stores'
import SectionIntro from './SectionIntro'
import Reveal from './Reveal'
import ZendaLogo from '@/components/zenda/ZendaLogo'

function hasZendaData(zenda: ZendaContent | Record<string, never>): zenda is ZendaContent {
  return 'headline' in zenda && Boolean(zenda.headline)
}

export default function ZendaSection({
  zenda,
  intro,
  settings,
}: {
  zenda: ZendaContent | Record<string, never>
  intro?: HomeSection
  settings?: SiteSettings | Record<string, never>
}) {
  if (!hasZendaData(zenda)) return null

  const features = zenda.features ?? []
  const benefits = zenda.benefits?.length ? zenda.benefits : features.map((f) => f.title).filter(Boolean)
  const screenshots = zenda.screenshots ?? []
  const exploreLabel = intro?.cta_label || zenda.headline
  const badge = intro?.badge || ''
  const whatLabel = settings?.what_is_label || ''
  const whoLabel = settings?.who_label || ''
  const playUrl = zenda.play_store_url || ZENDA_PLAY_STORE_URL
  const appUrl = zenda.app_store_url || ZENDA_APP_STORE_URL
  const playLabel = settings?.play_store_label || 'Download for Android'
  const appLabel = settings?.app_store_label || 'Download for iPhone'

  return (
    <section id="zenda" className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-zenda-dark via-zenda-deep to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_40%,rgba(53,52,201,0.35),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(77,184,61,0.15),transparent_40%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div className="flex items-start gap-4 min-w-0">
              <ZendaLogo size="md" className="shrink-0" />
              <SectionIntro
                section={{
                  ...intro,
                  title: intro?.title || zenda.headline,
                  subtitle: intro?.subtitle || zenda.subheadline,
                }}
                align="left"
              />
            </div>
            {badge && (
              <span className="inline-flex self-start md:self-auto px-4 py-2 rounded-full bg-zenda-primary/20 border border-zenda-light/30 text-zenda-container text-sm font-medium">
                {badge}
              </span>
            )}
          </div>
        </Reveal>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start -mt-8">
          <Reveal>
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                {zenda.what_is && (
                  <div className="p-5 rounded-2xl premium-card">
                    {whatLabel && (
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zenda-growth mb-2">
                        {whatLabel}
                      </h3>
                    )}
                    <p className="text-slate-300 text-sm leading-relaxed">{zenda.what_is}</p>
                  </div>
                )}
                {zenda.who_it_helps && (
                  <div className="p-5 rounded-2xl premium-card">
                    {whoLabel && (
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zenda-growth mb-2">
                        {whoLabel}
                      </h3>
                    )}
                    <p className="text-slate-300 text-sm leading-relaxed">{zenda.who_it_helps}</p>
                  </div>
                )}
              </div>

              {benefits.length > 0 && (
                <div className="grid sm:grid-cols-2 gap-3">
                  {benefits.slice(0, 6).map((benefit) => (
                    <div
                      key={benefit}
                      className="flex items-start gap-3 p-4 rounded-xl bg-white/[0.04] border border-white/5"
                    >
                      <span className="text-zenda-growth mt-0.5 shrink-0">✓</span>
                      <span className="text-slate-300 text-sm leading-snug">{benefit}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                {exploreLabel && (
                  <Link href="/zenda" className="btn-zenda">
                    {exploreLabel}
                  </Link>
                )}
                <a
                  href={playUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-zenda-growth"
                >
                  {playLabel}
                </a>
                <a
                  href={appUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                >
                  {appLabel}
                </a>
              </div>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {screenshots.length > 0
                ? screenshots.slice(0, 4).map((shot, i) => (
                    <div
                      key={shot.id}
                      className={`rounded-2xl overflow-hidden ring-1 ring-white/10 aspect-[9/16] bg-slate-800 ${
                        i === 0 ? 'col-span-2 sm:col-span-1' : ''
                      }`}
                    >
                      {shot.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={shot.image_url}
                          alt={shot.caption || zenda.headline}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      )}
                    </div>
                  ))
                : features.slice(0, 4).map((f) => (
                    <div
                      key={f.id}
                      className="rounded-2xl bg-gradient-to-br from-zenda-primary/60 to-zenda-deep aspect-[9/16] ring-1 ring-white/10 flex flex-col items-center justify-center p-4 text-center"
                    >
                      {f.icon && <span className="text-3xl">{f.icon}</span>}
                      {f.title && <p className="text-xs text-slate-400 mt-2">{f.title}</p>}
                    </div>
                  ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

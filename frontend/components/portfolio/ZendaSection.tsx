'use client'

import Link from 'next/link'
import { useTranslations } from '@/contexts/LocaleContext'
import type { ZendaContent } from '@/lib/portfolio-types'
import SectionHeader from './SectionHeader'

function hasZendaData(zenda: ZendaContent | Record<string, never>): zenda is ZendaContent {
  return 'headline' in zenda && Boolean(zenda.headline)
}

export default function ZendaSection({ zenda }: { zenda: ZendaContent | Record<string, never> }) {
  const t = useTranslations()
  if (!hasZendaData(zenda)) return null

  return (
    <section id="zenda" className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(99,102,241,0.2),transparent_50%)]" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader label={t('zenda.label')} title={zenda.headline || t('zenda.title')} />
        <div className="grid lg:grid-cols-2 gap-12 items-center -mt-4">
          <div className="space-y-6">
            <p className="text-xl text-slate-300">{zenda.subheadline}</p>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 mb-2">
                  {t('zenda.whatIs')}
                </h3>
                <p className="text-slate-300 leading-relaxed">{zenda.what_is}</p>
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 mb-2">
                  {t('zenda.whoHelps')}
                </h3>
                <p className="text-slate-300 leading-relaxed">{zenda.who_it_helps}</p>
              </div>
            </div>
            {zenda.benefits?.length > 0 && (
              <ul className="grid sm:grid-cols-2 gap-3">
                {zenda.benefits.map((benefit) => (
                  <li
                    key={benefit}
                    className="flex items-center gap-2 text-slate-300 text-sm bg-white/5 rounded-lg px-4 py-3 border border-white/5"
                  >
                    <span className="text-amber-400">✓</span>
                    {benefit}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-4 pt-4">
              {zenda.play_store_url && (
                <a
                  href={zenda.play_store_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  {t('zenda.download')}
                </a>
              )}
              <Link href="/zenda" className="btn-ghost">
                {t('zenda.learnMore')}
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {zenda.screenshots?.length > 0 ? (
              zenda.screenshots.slice(0, 4).map((shot) => (
                <div
                  key={shot.id}
                  className="rounded-xl overflow-hidden ring-1 ring-white/10 aspect-[9/16] bg-slate-800"
                >
                  {shot.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={shot.image_url} alt={shot.caption} className="w-full h-full object-cover" />
                  )}
                </div>
              ))
            ) : (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-gradient-to-br from-indigo-900/50 to-slate-800 aspect-[9/16] ring-1 ring-white/10 flex items-center justify-center"
                  >
                    <span className="text-4xl font-display font-bold text-white/20">Z</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

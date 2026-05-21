'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import PhoneSlideshow from '@/components/PhoneSlideshow'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useLocale } from '@/contexts/LocaleContext'
import { publicApi } from '@/lib/public-api'
import type { FAQ, SiteSettings, ZendaContent } from '@/lib/public-types'

export default function ZendaLanding() {
  const { locale } = useLocale()
  const [zenda, setZenda] = useState<ZendaContent | null>(null)
  const [settings, setSettings] = useState<SiteSettings | Record<string, never>>({})
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      publicApi.getZenda(locale),
      publicApi.getFaqs(locale, 'zenda'),
      publicApi.getSiteSettings(locale),
    ])
      .then(([z, f, s]) => {
        if (!cancelled) {
          setZenda('headline' in z ? (z as ZendaContent) : null)
          setFaqs(f)
          setSettings(s)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setZenda(null)
          setFaqs([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [locale])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!zenda) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 px-4 text-center">
        Zenda content is not available yet.
      </div>
    )
  }

  const features = zenda.features ?? []
  const screenshots = zenda.screenshots?.map((s) => s.image_url).filter(Boolean) as string[]
  const playLabel = settings.play_store_label || ''
  const appLabel = settings.app_store_label || ''
  const whatLabel = settings.what_is_label || ''
  const whoLabel = settings.who_label || ''
  const contactLabel = settings.contact_label || ''

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <section className="relative overflow-hidden cinematic-hero py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex items-center gap-4 mb-6">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-sm font-medium border border-indigo-500/30">
                Zenda
              </span>
              <LanguageSwitcher />
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight">{zenda.headline}</h1>
            <p className="mt-6 text-lg text-slate-300 leading-relaxed">{zenda.subheadline}</p>
            <div className="mt-10 flex flex-wrap gap-4">
              {zenda.play_store_url && playLabel && (
                <a href={zenda.play_store_url} target="_blank" rel="noopener noreferrer" className="btn-primary">
                  {playLabel}
                </a>
              )}
              {zenda.app_store_url && appLabel && (
                <a href={zenda.app_store_url} target="_blank" rel="noopener noreferrer" className="btn-outline-gold">
                  {appLabel}
                </a>
              )}
              {contactLabel && (
                <Link href="/contact" className="btn-secondary">
                  {contactLabel}
                </Link>
              )}
            </div>
          </div>
          {screenshots.length > 0 && (
            <div className="rounded-2xl bg-gradient-to-br from-indigo-900/40 to-slate-900 p-6 ring-1 ring-white/10">
              <PhoneSlideshow images={screenshots} />
            </div>
          )}
        </div>
      </section>

      <section className="py-20 bg-slate-900/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid sm:grid-cols-2 gap-8 mb-16">
            {zenda.what_is && whatLabel && (
              <div className="premium-card p-8">
                <h2 className="text-lg font-bold text-amber-400 mb-3">{whatLabel}</h2>
                <p className="text-slate-300 leading-relaxed">{zenda.what_is}</p>
              </div>
            )}
            {zenda.who_it_helps && whoLabel && (
              <div className="premium-card p-8">
                <h2 className="text-lg font-bold text-amber-400 mb-3">{whoLabel}</h2>
                <p className="text-slate-300 leading-relaxed">{zenda.who_it_helps}</p>
              </div>
            )}
          </div>
          {features.length > 0 && (
            <>
              <h2 className="text-3xl font-display font-bold text-center mb-12">{zenda.headline}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {features.map((f) => (
                  <div key={f.id} className="premium-card p-6">
                    <span className="text-3xl">{f.icon || '◆'}</span>
                    <h3 className="text-lg font-semibold text-white mt-4">{f.title}</h3>
                    <p className="text-slate-400 mt-2 text-sm leading-relaxed">{f.description}</p>
                  </div>
                ))}
              </div>
            </>
          )}
          {zenda.benefits?.length > 0 && (
            <ul className="mt-12 flex flex-wrap justify-center gap-3">
              {zenda.benefits.map((b) => (
                <li key={b} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm text-slate-300">
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {faqs.length > 0 && (
        <section className="py-20 max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-display font-bold text-center mb-10">FAQ</h2>
          <div className="space-y-4">
            {faqs.map((item) => (
              <details key={item.id} className="premium-card p-5 group">
                <summary className="font-semibold text-white cursor-pointer list-none flex justify-between">
                  {item.question}
                  <span className="text-amber-400 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-4 text-slate-400 text-sm leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {zenda.monthly_price_kz && (
        <section className="py-16 text-center border-t border-white/5">
          <p className="text-slate-400 text-sm uppercase tracking-wider">From</p>
          <p className="text-4xl font-display font-bold text-amber-400 mt-2">{zenda.monthly_price_kz} Kz</p>
        </section>
      )}
    </div>
  )
}

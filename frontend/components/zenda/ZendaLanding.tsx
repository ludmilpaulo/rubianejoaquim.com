'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import PhoneSlideshow from '@/components/PhoneSlideshow'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import ZendaLogo from '@/components/zenda/ZendaLogo'
import ZendaLoader from '@/components/zenda/ZendaLoader'
import { useLocale } from '@/contexts/LocaleContext'
import { publicApi } from '@/lib/public-api'
import type { FAQ, SiteSettings, ZendaContent } from '@/lib/public-types'
import {
  ZENDA_APP_STORE_URL,
  ZENDA_DOWNLOAD_BLURB,
  ZENDA_PLAY_STORE_URL,
  ZENDA_TAGLINE,
} from '@/lib/zenda-stores'

const FALLBACK: Record<string, { headline: string; subheadline: string; what: string; who: string; benefits: string[] }> = {
  en: {
    headline: 'Zenda',
    subheadline: ZENDA_TAGLINE,
    what: ZENDA_DOWNLOAD_BLURB,
    who: 'Built for individuals, families and small businesses who want clear control of money every day.',
    benefits: ['Salary and budgets', 'Expenses and debts', 'Savings and goals', 'Business finance', 'Live currency conversion'],
  },
  pt: {
    headline: 'Zenda',
    subheadline: 'Uma app. O seu dinheiro. A sua vida. O seu negócio.',
    what: 'Descarregue o Zenda e gira as suas finanças, dinheiro, negócio e muito mais.',
    who: 'Criada para pessoas, famílias e pequenos negócios que querem controlo claro do dinheiro todos os dias.',
    benefits: ['Salário e orçamentos', 'Despesas e dívidas', 'Poupança e metas', 'Finanças do negócio', 'Câmbio em tempo real'],
  },
  fr: {
    headline: 'Zenda',
    subheadline: 'Une app. Votre argent. Votre vie. Votre entreprise.',
    what: 'Téléchargez Zenda et gérez vos finances, votre argent, votre entreprise et plus encore.',
    who: 'Conçue pour les particuliers, les familles et les petites entreprises.',
    benefits: ['Salaire et budgets', 'Dépenses et dettes', 'Épargne et objectifs', 'Finance d’entreprise', 'Change en direct'],
  },
  es: {
    headline: 'Zenda',
    subheadline: 'Una app. Tu dinero. Tu vida. Tu negocio.',
    what: 'Descarga Zenda y gestiona tus finanzas, dinero, negocio y más.',
    who: 'Hecha para personas, familias y pequeños negocios que quieren control diario del dinero.',
    benefits: ['Salario y presupuestos', 'Gastos y deudas', 'Ahorro y metas', 'Finanzas del negocio', 'Cambio en tiempo real'],
  },
}

function hasHeadline(value: ZendaContent | Record<string, never> | null): value is ZendaContent {
  return Boolean(value && 'headline' in value && value.headline)
}

export default function ZendaLanding() {
  const { locale, t } = useLocale()
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
          setZenda(hasHeadline(z) ? z : null)
          setFaqs(Array.isArray(f) ? f : [])
          setSettings(s)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setZenda(null)
          setFaqs([])
          setSettings({})
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [locale])

  const copy = FALLBACK[locale] || FALLBACK.en
  const headline = zenda?.headline || copy.headline
  const subheadline = zenda?.subheadline || copy.subheadline
  const whatIs = zenda?.what_is || copy.what
  const who = zenda?.who_it_helps || copy.who
  const benefits = zenda?.benefits?.length ? zenda.benefits : copy.benefits
  const features = zenda?.features ?? []
  const screenshots = (zenda?.screenshots ?? [])
    .map((s) => s.image_url)
    .filter((url): url is string => Boolean(url))
  const playUrl = zenda?.play_store_url || ZENDA_PLAY_STORE_URL
  const appUrl = zenda?.app_store_url || ZENDA_APP_STORE_URL
  const playLabel = settings.play_store_label || 'Download for Android'
  const appLabel = settings.app_store_label || 'Download for iPhone'
  const whatLabel = settings.what_is_label || (locale === 'pt' ? 'O que é' : 'What it is')
  const whoLabel = settings.who_label || (locale === 'pt' ? 'Para quem' : 'Who it helps')
  const contactLabel = settings.contact_label || ''

  if (loading) {
    return (
      <div className="min-h-screen bg-zenda-deep flex flex-col items-center justify-center">
        <ZendaLoader inverse message="A carregar o Zenda…" size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zenda-deep text-white">
      <section className="relative overflow-hidden zenda-hero py-20 md:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(77,184,61,0.18),transparent_45%)]" />
        <div className="relative max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <ZendaLogo size="md" priority />
              <LanguageSwitcher />
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight">{headline}</h1>
            <p className="mt-6 text-lg text-white/80 leading-relaxed">{subheadline}</p>
            <p className="mt-4 text-base text-white/70 leading-relaxed">{whatIs}</p>
            <div className="mt-10 flex flex-wrap gap-4">
              <a href={appUrl} className="btn-zenda" rel="noopener noreferrer">
                {appLabel}
              </a>
              <a href={playUrl} className="btn-zenda-growth" rel="noopener noreferrer">
                {playLabel}
              </a>
              <Link href="/zenda/copilot" className="btn-secondary">
                {t('copilot.openCta')}
              </Link>
              <Link href="/" className="btn-secondary">
                Open Zenda Web
              </Link>
              {contactLabel ? (
                <Link href="/contact" className="btn-secondary">
                  {contactLabel}
                </Link>
              ) : null}
            </div>
          </div>
          {screenshots.length > 0 && (
            <div className="rounded-2xl bg-gradient-to-br from-zenda-primary/40 to-zenda-deep p-6 ring-1 ring-white/10">
              <PhoneSlideshow images={screenshots} />
            </div>
          )}
        </div>
      </section>

      <section className="py-20 bg-zenda-navyMid/40">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid sm:grid-cols-2 gap-8 mb-16">
            <div className="premium-card p-8">
              <h2 className="text-lg font-bold text-zenda-growth mb-3">{whatLabel}</h2>
              <p className="text-slate-300 leading-relaxed">{whatIs}</p>
            </div>
            <div className="premium-card p-8">
              <h2 className="text-lg font-bold text-zenda-growth mb-3">{whoLabel}</h2>
              <p className="text-slate-300 leading-relaxed">{who}</p>
            </div>
          </div>
          {features.length > 0 && (
            <>
              <h2 className="text-3xl font-display font-bold text-center mb-12">{headline}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {features.map((f) => (
                  <div key={f.id} className="premium-card p-6">
                    <span className="text-3xl text-zenda-growth">{f.icon || '◆'}</span>
                    <h3 className="text-lg font-semibold text-white mt-4">{f.title}</h3>
                    <p className="text-slate-400 mt-2 text-sm leading-relaxed">{f.description}</p>
                  </div>
                ))}
              </div>
            </>
          )}
          {benefits.length > 0 && (
            <ul className="mt-12 flex flex-wrap justify-center gap-3">
              {benefits.map((b) => (
                <li
                  key={b}
                  className="px-4 py-2 rounded-full bg-zenda-primary/15 border border-zenda-light/20 text-sm text-slate-200"
                >
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
                <summary className="font-semibold text-white cursor-pointer list-none flex justify-between gap-3">
                  <span className="min-w-0 flex-1">{item.question}</span>
                  <span className="text-zenda-growth group-open:rotate-45 transition-transform shrink-0">+</span>
                </summary>
                <p className="mt-4 text-slate-400 text-sm leading-relaxed">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      <section className="py-16 text-center border-t border-white/5">
        {zenda?.monthly_price_kz ? (
          <>
            <p className="text-slate-400 text-sm uppercase tracking-wider">From</p>
            <p className="text-4xl font-display font-bold text-zenda-growth mt-2">{zenda.monthly_price_kz} Kz</p>
          </>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <a href={appUrl} className="btn-zenda">
            {appLabel}
          </a>
          <a href={playUrl} className="btn-zenda-growth">
            {playLabel}
          </a>
          <Link href="/download" className="btn-secondary">
            Download Zenda
          </Link>
        </div>
      </section>
    </div>
  )
}

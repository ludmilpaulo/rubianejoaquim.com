'use client'

import Link from 'next/link'
import { useTranslations } from '@/contexts/LocaleContext'
import RubianeImage from '@/components/RubianeImage'

export default function HeroSection() {
  const t = useTranslations()

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden cinematic-hero">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(251,191,36,0.15),_transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(99,102,241,0.12),_transparent_55%)]" />
      <div className="absolute inset-0 film-grain opacity-30 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="animate-fade-in order-2 lg:order-1">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-300 text-xs sm:text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              {t('hero.badge')}
            </span>
            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight">
              {t('hero.title')}
              <span className="block text-gradient-gold mt-2">{t('hero.titleAccent')}</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-xl leading-relaxed">
              {t('hero.subtitle')}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row flex-wrap gap-4">
              <Link href="/portfolio" className="btn-primary">
                {t('hero.ctaPortfolio')}
              </Link>
              <Link href="/contact" className="btn-secondary">
                {t('hero.ctaWork')}
              </Link>
              <Link href="/zenda" className="btn-ghost">
                {t('hero.ctaZenda')}
              </Link>
            </div>
            <ul className="mt-10 flex flex-wrap gap-6 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <span className="text-amber-400">◆</span> {t('hero.trust1')}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400">◆</span> {t('hero.trust2')}
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400">◆</span> {t('hero.trust3')}
              </li>
            </ul>
          </div>
          <div className="relative order-1 lg:order-2 animate-slide-up">
            <div className="relative aspect-[4/5] max-w-md mx-auto lg:ml-auto rounded-2xl overflow-hidden ring-1 ring-white/10 shadow-2xl shadow-amber-900/20">
              <RubianeImage />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
            </div>
            <div className="absolute -z-10 -inset-4 bg-amber-500/20 blur-3xl rounded-full" />
          </div>
        </div>
      </div>
    </section>
  )
}

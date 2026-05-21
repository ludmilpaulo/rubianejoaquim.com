'use client'

import Link from 'next/link'
import { useTranslations } from '@/contexts/LocaleContext'

export default function CtaSection() {
  const t = useTranslations()

  return (
    <section className="py-20 md:py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 via-amber-500/10 to-indigo-600/20" />
      <div className="relative max-w-4xl mx-auto px-4 text-center">
        <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white">
          {t('cta.title')}
        </h2>
        <p className="mt-4 text-lg text-slate-300">{t('cta.subtitle')}</p>
        <Link href="/contact" className="btn-primary inline-flex mt-10">
          {t('cta.button')}
        </Link>
      </div>
    </section>
  )
}

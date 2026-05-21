'use client'

import Link from 'next/link'
import { useTranslations } from '@/contexts/LocaleContext'

export default function EducationBanner() {
  const t = useTranslations()

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-100 p-8 md:p-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900">{t('education.title')}</h2>
            <p className="text-slate-600 mt-2">{t('education.subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/cursos" className="px-6 py-3 rounded-xl bg-sky-600 text-white font-semibold hover:bg-sky-700 transition-colors">
              {t('nav.courses')}
            </Link>
            <Link href="/mentoria" className="px-6 py-3 rounded-xl border-2 border-sky-600 text-sky-700 font-semibold hover:bg-sky-50 transition-colors">
              {t('nav.mentorship')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

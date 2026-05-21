'use client'

import { useTranslations } from '@/contexts/LocaleContext'
import type { CaseStudy } from '@/lib/portfolio-types'
import SectionHeader from './SectionHeader'

export default function CaseStudiesSection({ caseStudies }: { caseStudies: CaseStudy[] }) {
  const t = useTranslations()
  if (!caseStudies.length) return null

  return (
    <section id="case-studies" className="py-20 md:py-28 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          label={t('caseStudies.label')}
          title={t('caseStudies.title')}
        />
        <div className="grid md:grid-cols-2 gap-8">
          {caseStudies.map((study) => (
            <article
              key={study.id}
              className="p-6 sm:p-8 rounded-2xl bg-slate-900/80 border border-white/5 hover:border-amber-400/20 transition-colors"
            >
              <h3 className="text-xl font-semibold text-white">{study.title || study.client_name}</h3>
              <p className="text-amber-400/80 text-sm mt-1">{study.client_name}</p>
              <dl className="mt-6 space-y-4 text-sm">
                <div>
                  <dt className="text-slate-500 uppercase tracking-wider text-xs">{t('caseStudies.goal')}</dt>
                  <dd className="text-slate-300 mt-1">{study.goal}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 uppercase tracking-wider text-xs">{t('caseStudies.role')}</dt>
                  <dd className="text-slate-300 mt-1">{study.role}</dd>
                </div>
                {study.tools_used && (
                  <div>
                    <dt className="text-slate-500 uppercase tracking-wider text-xs">{t('caseStudies.tools')}</dt>
                    <dd className="text-slate-300 mt-1">{study.tools_used}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-slate-500 uppercase tracking-wider text-xs">{t('caseStudies.result')}</dt>
                  <dd className="text-amber-200/90 mt-1 font-medium">{study.result}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

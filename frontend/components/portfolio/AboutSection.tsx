'use client'

import { useTranslations } from '@/contexts/LocaleContext'
import RubianeImage from '@/components/RubianeImage'
import SectionHeader from './SectionHeader'

export default function AboutSection() {
  const t = useTranslations()

  return (
    <section id="about" className="py-20 md:py-28 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
          <div className="relative aspect-[4/5] rounded-2xl overflow-hidden ring-1 ring-white/10 max-w-lg">
            <RubianeImage />
          </div>
          <div>
            <SectionHeader
              label={t('about.label')}
              title={`${t('about.title')} ${t('about.name')}`}
              align="left"
            />
            <div className="space-y-4 text-slate-300 text-lg leading-relaxed -mt-8">
              <p>{t('about.p1')}</p>
              <p>{t('about.p2')}</p>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6">
              {[
                { value: '50+', label: t('about.stat1') },
                { value: '5+', label: t('about.stat2') },
                { value: '98%', label: t('about.stat3') },
              ].map((stat) => (
                <div key={stat.label} className="text-center md:text-left">
                  <div className="text-2xl md:text-3xl font-display font-bold text-amber-400">
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

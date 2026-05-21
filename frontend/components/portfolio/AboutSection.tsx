'use client'

import RubianeImage from '@/components/RubianeImage'
import type { HomeSection, HomepageStatistic } from '@/lib/public-types'
import SectionIntro from './SectionIntro'
import Reveal from './Reveal'

export default function AboutSection({
  section,
  statistics = [],
}: {
  section?: HomeSection
  statistics?: HomepageStatistic[]
}) {
  if (!section) return null

  const paragraphs = section.body ? section.body.split(/\n\n+/).filter(Boolean) : []

  return (
    <section id="about" className="py-24 md:py-32 section-elevated relative overflow-hidden">
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-[100px]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <Reveal>
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden ring-1 ring-white/10 max-w-lg mx-auto lg:mx-0 premium-glow">
              <RubianeImage />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div>
              <SectionIntro section={section} align="left" />
              <div className="space-y-5 text-slate-300 text-lg leading-relaxed -mt-8">
                {paragraphs.map((p) => (
                  <p key={p.slice(0, 40)}>{p}</p>
                ))}
              </div>
              {statistics.length > 0 && (
                <div className="mt-10 grid grid-cols-3 gap-4">
                  {statistics.map((stat) => (
                    <div
                      key={stat.id}
                      className="text-center p-4 rounded-xl bg-white/[0.03] border border-white/5"
                    >
                      <div className="text-2xl md:text-3xl font-display font-bold text-amber-400">{stat.value}</div>
                      <div className="text-xs text-slate-500 mt-1 leading-snug">{stat.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

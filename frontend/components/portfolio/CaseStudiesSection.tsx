'use client'

import Link from 'next/link'
import type { CaseStudy, HomeSection } from '@/lib/public-types'
import SectionIntro from './SectionIntro'
import Reveal from './Reveal'

export default function CaseStudiesSection({
  caseStudies,
  intro,
}: {
  caseStudies: CaseStudy[]
  intro?: HomeSection
}) {
  if (!caseStudies.length) return null

  const goalLabel = (intro?.extra_data?.goal_label as string) || 'Goal'
  const roleLabel = (intro?.extra_data?.role_label as string) || 'Role'
  const toolsLabel = (intro?.extra_data?.tools_label as string) || 'Tools'
  const resultLabel = (intro?.extra_data?.result_label as string) || 'Result'

  return (
    <section className="py-24 md:py-32 section-elevated">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionIntro section={intro} />
        </Reveal>
        <div className="grid md:grid-cols-2 gap-8 -mt-4">
          {caseStudies.map((item, index) => (
            <Reveal key={item.id} delay={100 * index}>
              <article className="premium-card p-8 h-full flex flex-col hover:border-amber-400/20 transition-colors">
                {item.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_url} alt="" className="w-full h-40 object-cover rounded-xl mb-6" loading="lazy" />
                )}
                <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                {item.client_name && <p className="text-amber-400/80 text-sm mt-1">{item.client_name}</p>}
                <dl className="mt-6 space-y-4 text-sm flex-1">
                  <div>
                    <dt className="text-slate-500 uppercase tracking-wider text-[10px] font-bold">{goalLabel}</dt>
                    <dd className="text-slate-300 mt-1">{item.goal}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 uppercase tracking-wider text-[10px] font-bold">{roleLabel}</dt>
                    <dd className="text-slate-300 mt-1">{item.role}</dd>
                  </div>
                  {item.tools_used && (
                    <div>
                      <dt className="text-slate-500 uppercase tracking-wider text-[10px] font-bold">{toolsLabel}</dt>
                      <dd className="text-slate-300 mt-1">{item.tools_used}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-slate-500 uppercase tracking-wider text-[10px] font-bold">{resultLabel}</dt>
                    <dd className="text-slate-300 mt-1">{item.result}</dd>
                  </div>
                </dl>
                <Link href={`/portfolio/${item.slug}`} className="mt-6 text-amber-400 text-sm font-medium hover:underline">
                  →
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

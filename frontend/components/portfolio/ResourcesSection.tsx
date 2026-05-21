'use client'

import Link from 'next/link'
import type { HomeSection, Resource } from '@/lib/public-types'
import SectionIntro from './SectionIntro'
import Reveal from './Reveal'

export default function ResourcesSection({
  resources,
  intro,
}: {
  resources: Resource[]
  intro?: HomeSection
}) {
  if (!resources.length) return null

  const viewAllHref = (intro?.extra_data?.view_all_href as string) || '/conteudos-gratis'
  const viewAllLabel = intro?.cta_label || ''

  return (
    <section id="resources" className="py-24 md:py-32 section-elevated border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {intro?.title && (
          <Reveal>
            <SectionIntro section={intro} />
          </Reveal>
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 -mt-4">
          {resources.map((item, index) => (
            <Reveal key={item.id} delay={60 * index}>
              <article className="h-full premium-card p-6 flex flex-col hover:border-amber-400/25 transition-all duration-500 hover-lift">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400/90">
                  {item.category}
                </span>
                <h3 className="mt-3 text-lg font-semibold text-white line-clamp-2">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-400 flex-1 line-clamp-3">{item.description}</p>
                <p className="mt-4 text-xs text-slate-500 capitalize">{item.resource_type}</p>
              </article>
            </Reveal>
          ))}
        </div>
        {viewAllLabel && (
          <Reveal delay={120}>
            <div className="text-center mt-12">
              <Link href={viewAllHref} className="btn-outline-gold inline-flex">
                {viewAllLabel} →
              </Link>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  )
}

'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { HomeSection, PortfolioProject, PortfolioCategory } from '@/lib/public-types'
import { portfolio_category_label } from '@/lib/portfolio-categories'
import SectionIntro from './SectionIntro'
import Reveal from './Reveal'

const CATEGORIES: (PortfolioCategory | 'all')[] = [
  'all',
  'campaign_videos',
  'interviews',
  'social_reels',
  'canva_designs',
  'scriptwriting',
  'zenda_content',
]

export default function FeaturedPortfolioSection({
  projects,
  intro,
}: {
  projects: PortfolioProject[]
  intro?: HomeSection
}) {
  const [active, setActive] = useState<PortfolioCategory | 'all'>('all')
  const emptyLabel = intro?.cta_label || '—'

  const filtered = useMemo(() => {
    if (active === 'all') return projects
    return projects.filter((p) => p.category === active)
  }, [projects, active])

  const categoryLabel = (cat: PortfolioCategory | 'all') => {
    if (cat === 'all') {
      return intro?.category_labels?.all || 'All'
    }
    const fromIntro = intro?.category_labels?.[cat]
    if (fromIntro) return fromIntro
    const sample = projects.find((p) => p.category === cat)
    if (sample?.category_label) return sample.category_label
    return portfolio_category_label(cat)
  }

  return (
    <section id="portfolio" className="py-24 md:py-32 section-dark relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.04),transparent_70%)] pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionIntro section={intro} />
        </Reveal>

        <Reveal delay={100}>
          <div className="flex flex-wrap justify-center gap-2 mb-12 -mt-6">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActive(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  active === cat
                    ? 'bg-amber-400 text-slate-950 shadow-lg shadow-amber-900/30'
                    : 'bg-white/5 text-slate-400 border border-white/10 hover:border-amber-400/30 hover:text-amber-200'
                }`}
              >
                {categoryLabel(cat)}
              </button>
            ))}
          </div>
        </Reveal>

        {filtered.length === 0 ? (
          <p className="text-center text-slate-500 py-16">{emptyLabel}</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filtered.map((project, index) => (
              <Reveal key={project.id} delay={80 * (index % 3)}>
                <Link
                  href={`/portfolio/${project.slug}`}
                  className="group block h-full rounded-2xl overflow-hidden premium-card hover:border-amber-400/30 transition-all duration-500 hover-lift"
                >
                  <div className="aspect-video bg-gradient-to-br from-slate-800 to-indigo-950/80 relative overflow-hidden">
                    {project.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={project.thumbnail_url}
                        alt={project.title}
                        className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-amber-900/20 to-indigo-900/40">
                        <span className="w-14 h-14 rounded-full bg-amber-400/90 flex items-center justify-center text-slate-950 text-xl">
                          ▶
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent opacity-80" />
                    <span className="absolute top-3 left-3 px-3 py-1 text-xs font-semibold rounded-full bg-black/50 text-amber-200 backdrop-blur-md border border-white/10">
                      {project.category_label || categoryLabel(project.category)}
                    </span>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                      {project.title}
                    </h3>
                    {project.client_name && (
                      <p className="text-sm text-amber-400/70 mt-1 font-medium">{project.client_name}</p>
                    )}
                    <p className="text-sm text-slate-400 mt-3 line-clamp-2 leading-relaxed">{project.description}</p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}

        <Reveal delay={200}>
          <div className="text-center mt-14">
            <Link href="/portfolio" className="btn-secondary inline-flex">
              {(intro?.extra_data?.view_all_label as string) || 'Portfolio'} →
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

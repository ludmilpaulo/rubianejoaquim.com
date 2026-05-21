'use client'

import Link from 'next/link'
import { useTranslations } from '@/contexts/LocaleContext'
import type { PortfolioProject, PortfolioCategory } from '@/lib/portfolio-types'
import SectionHeader from './SectionHeader'

export default function PortfolioGrid({
  projects,
  showViewAll = true,
}: {
  projects: PortfolioProject[]
  showViewAll?: boolean
}) {
  const t = useTranslations()

  const categoryLabel = (cat: PortfolioCategory) =>
    t(`portfolio.categories.${cat}`)

  return (
    <section id="portfolio" className="py-20 md:py-28 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          label={t('portfolio.label')}
          title={t('portfolio.title')}
          subtitle={t('portfolio.subtitle')}
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/portfolio#${project.slug}`}
              className="group block rounded-2xl overflow-hidden bg-slate-900 border border-white/5 hover:border-amber-400/40 transition-all duration-300 hover-lift"
            >
              <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 relative">
                {project.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={project.thumbnail_url}
                    alt={project.title}
                    className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl text-amber-400/40">▶</span>
                  </div>
                )}
                <span className="absolute top-3 left-3 px-2 py-1 text-xs font-medium rounded-full bg-black/60 text-amber-300 backdrop-blur-sm">
                  {categoryLabel(project.category)}
                </span>
              </div>
              <div className="p-5 sm:p-6">
                <h3 className="text-lg font-semibold text-white group-hover:text-amber-300 transition-colors">
                  {project.title}
                </h3>
                {project.client_name && (
                  <p className="text-sm text-slate-500 mt-1">{project.client_name}</p>
                )}
                <p className="text-sm text-slate-400 mt-2 line-clamp-2">{project.description}</p>
              </div>
            </Link>
          ))}
        </div>
        {showViewAll && (
          <div className="text-center mt-12">
            <Link href="/portfolio" className="btn-secondary inline-flex">
              {t('portfolio.viewAll')}
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

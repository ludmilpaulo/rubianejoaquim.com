'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/contexts/LocaleContext'
import { portfolioApi } from '@/lib/portfolio-api'
import type { HomeSection, PortfolioProject, PortfolioCategory } from '@/lib/public-types'
import { sectionByKey } from '@/lib/cms'
import SectionIntro from '@/components/portfolio/SectionIntro'
import { getYoutubeEmbedUrl } from '@/lib/youtube'
import { portfolio_category_label } from '@/lib/portfolio-categories'

const CATEGORIES: PortfolioCategory[] = [
  'campaign_videos',
  'interviews',
  'social_reels',
  'canva_designs',
  'scriptwriting',
  'zenda_content',
]

export default function PortfolioPage() {
  const { locale } = useLocale()
  const [projects, setProjects] = useState<PortfolioProject[]>([])
  const [intro, setIntro] = useState<HomeSection | undefined>()
  const [filter, setFilter] = useState<PortfolioCategory | 'all'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([portfolioApi.getProjects(locale), portfolioApi.getHomepage(locale)])
      .then(([projs, home]) => {
        setProjects(projs)
        setIntro(sectionByKey(home.sections, 'portfolio_intro'))
      })
      .finally(() => setLoading(false))
  }, [locale])

  const filtered = filter === 'all' ? projects : projects.filter((p) => p.category === filter)

  const categoryLabel = (cat: PortfolioCategory | 'all') => {
    if (cat === 'all') return intro?.category_labels?.all || 'All'
    const sample = projects.find((p) => p.category === cat)
    return intro?.category_labels?.[cat] || sample?.category_label || portfolio_category_label(cat)
  }

  return (
    <div className="bg-slate-950 min-h-screen pt-8 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionIntro section={intro} />
        <div className="flex flex-wrap gap-2 justify-center mb-12 -mt-6">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === 'all' ? 'bg-amber-400 text-slate-950' : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {categoryLabel('all')}
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === cat ? 'bg-amber-400 text-slate-950' : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              {categoryLabel(cat)}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 zenda-spinner zenda-spinner-sm" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-slate-500 py-16">{intro?.cta_label || '—'}</p>
        ) : (
          <div className="space-y-16">
            {filtered.map((project) => (
              <article
                key={project.id}
                id={project.slug}
                className="scroll-mt-24 grid md:grid-cols-2 gap-8 p-6 sm:p-8 rounded-2xl bg-slate-900/50 border border-white/5"
              >
                <div className="aspect-video rounded-xl overflow-hidden bg-black ring-1 ring-white/10">
                  {project.video_url ? (
                    <iframe
                      src={getYoutubeEmbedUrl(project.video_url)}
                      title={project.title}
                      className="w-full h-full"
                      allowFullScreen
                    />
                  ) : project.thumbnail_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={project.thumbnail_url} alt={project.title} className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    {project.category_label || categoryLabel(project.category)}
                  </span>
                  <h2 className="text-2xl font-display font-bold text-white mt-2">{project.title}</h2>
                  {project.client_name && <p className="text-slate-500 mt-1">{project.client_name}</p>}
                  <p className="text-slate-300 mt-4 leading-relaxed">{project.description}</p>
                  {project.role && (
                    <p className="text-sm text-slate-400 mt-4">
                      <strong className="text-slate-300">Role:</strong> {project.role}
                    </p>
                  )}
                  {project.tools_used && (
                    <p className="text-sm text-slate-400 mt-2">
                      <strong className="text-slate-300">Tools:</strong> {project.tools_used}
                    </p>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

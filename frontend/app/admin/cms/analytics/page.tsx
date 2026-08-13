'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { adminApi } from '@/lib/api'
import { useAdminGate } from '@/hooks/useAdminGate'

interface CmsStats {
  leads: number
  newLeads: number
  newsletter: number
  homeSections: number
  activeSections: number
  services: number
  portfolio: number
  testimonials: number
  resources: number
  faqs: number
}

function countList<T>(data: { results?: T[] } | T[]): number {
  return Array.isArray(data) ? data.length : data.results?.length ?? 0
}

export default function CmsAnalyticsPage() {
  const { ready } = useAdminGate()
  const [stats, setStats] = useState<CmsStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ready) return
    setLoading(true)
    Promise.all([
      adminApi.portfolio.contactMessages.list(),
      adminApi.portfolio.newsletter.list(),
      adminApi.portfolio.homeSections.list(),
      adminApi.portfolio.services.list(),
      adminApi.portfolio.projects.list(),
      adminApi.portfolio.testimonials.list(),
      adminApi.portfolio.resources.list(),
      adminApi.portfolio.faqs.list(),
    ])
      .then(
        ([
          leadsRes,
          newsletterRes,
          sectionsRes,
          servicesRes,
          projectsRes,
          testimonialsRes,
          resourcesRes,
          faqsRes,
        ]) => {
          const leads = (Array.isArray(leadsRes.data)
            ? leadsRes.data
            : leadsRes.data.results ?? []) as { status: string }[]
          const sections = (Array.isArray(sectionsRes.data)
            ? sectionsRes.data
            : sectionsRes.data.results ?? []) as { is_active: boolean }[]

          setStats({
            leads: leads.length,
            newLeads: leads.filter((l) => l.status === 'new').length,
            newsletter: countList(newsletterRes.data),
            homeSections: sections.length,
            activeSections: sections.filter((s) => s.is_active).length,
            services: countList(servicesRes.data),
            portfolio: countList(projectsRes.data),
            testimonials: countList(testimonialsRes.data),
            resources: countList(resourcesRes.data),
            faqs: countList(faqsRes.data),
          })
        },
      )
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [ready])

  if (!ready) return null

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 zenda-spinner zenda-spinner-md" />
      </div>
    )
  }

  if (!stats) {
    return <p className="text-slate-600">Could not load CMS analytics.</p>
  }

  const cards = [
    { label: 'New leads', value: stats.newLeads, href: '/admin/cms/leads', accent: 'text-blue-700' },
    { label: 'Total leads', value: stats.leads, href: '/admin/cms/leads', accent: 'text-slate-900' },
    { label: 'Newsletter', value: stats.newsletter, href: '/admin/cms', accent: 'text-zenda-dark' },
    { label: 'Active homepage sections', value: stats.activeSections, sub: `/ ${stats.homeSections}`, href: '/admin/cms/homepage', accent: 'text-amber-700' },
    { label: 'Services', value: stats.services, href: '/admin/cms/services', accent: 'text-slate-900' },
    { label: 'Portfolio projects', value: stats.portfolio, href: '/admin/cms/portfolio', accent: 'text-slate-900' },
    { label: 'Testimonials', value: stats.testimonials, href: '/admin/cms/testimonials', accent: 'text-slate-900' },
    { label: 'Resources', value: stats.resources, href: '/admin/cms/resources', accent: 'text-slate-900' },
    { label: 'FAQs', value: stats.faqs, href: '/admin/cms/faqs', accent: 'text-slate-900' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">CMS analytics</h1>
      <p className="text-slate-600 mb-8 text-sm">
        Snapshot of public website content and inbound leads from the portfolio API.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="p-5 bg-white rounded-xl border border-slate-200 hover:border-amber-400/50 hover:shadow-md transition-all"
          >
            <p className={`text-3xl font-bold ${c.accent}`}>
              {c.value}
              {c.sub && <span className="text-lg text-slate-400 font-normal">{c.sub}</span>}
            </p>
            <p className="text-sm text-slate-500 mt-1">{c.label}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

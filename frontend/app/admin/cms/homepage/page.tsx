'use client'

import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/api'
import { useAdminGate } from '@/hooks/useAdminGate'
import HomeSectionEditor, { type HomeSectionRow } from '@/components/admin/HomeSectionEditor'

export default function AdminHomepageSectionsPage() {
  const { ready } = useAdminGate()
  const [sections, setSections] = useState<HomeSectionRow[]>([])

  useEffect(() => {
    if (!ready) return
    adminApi.portfolio.homeSections
      .list()
      .then((res) => {
        const data = res.data as { results?: HomeSectionRow[] } | HomeSectionRow[]
        const list = Array.isArray(data) ? data : data.results ?? []
        const order = [
          'hero',
          'showreel',
          'about',
          'services_intro',
          'portfolio_intro',
          'zenda',
          'case_studies_intro',
          'testimonials_intro',
          'education',
          'resources_intro',
          'faq_newsletter',
          'final_cta',
          'contact_intro',
        ]
        list.sort((a, b) => order.indexOf(a.section_key) - order.indexOf(b.section_key))
        setSections(list)
      })
      .catch(() => setSections([]))
  }, [ready])

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Homepage sections</h1>
          <p className="text-slate-600 mt-2 text-sm max-w-2xl">
            Edit copy per language and toggle visibility. Changes appear on the public site after save.
          </p>
        </div>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-amber-700 hover:underline"
        >
          Preview homepage ↗
        </a>
      </div>
      <div className="space-y-4">
        {sections.map((s) => (
          <HomeSectionEditor
            key={s.id}
            section={s}
            onSaved={(updated) =>
              setSections((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
            }
          />
        ))}
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { adminApi } from '@/lib/api'

interface HomeSectionRow {
  id: number
  section_key: string
  is_active: boolean
}

export default function AdminHomepageSectionsPage() {
  const { user, checkAuth, isLoading } = useAuthStore()
  const router = useRouter()
  const [sections, setSections] = useState<HomeSectionRow[]>([])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!isLoading && (!user || !user.is_admin)) router.push('/login')
  }, [user, isLoading, router])

  useEffect(() => {
    if (!user?.is_admin) return
    adminApi.portfolio.homeSections
      .list()
      .then((res) => {
        const data = res.data as { results?: HomeSectionRow[] } | HomeSectionRow[]
        setSections(Array.isArray(data) ? data : data.results ?? [])
      })
      .catch(() => setSections([]))
  }, [user])

  const toggleActive = async (row: HomeSectionRow) => {
    await adminApi.portfolio.homeSections.update(row.id, { is_active: !row.is_active })
    setSections((prev) =>
      prev.map((s) => (s.id === row.id ? { ...s, is_active: !s.is_active } : s)),
    )
  }

  if (isLoading || !user?.is_admin) return null

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Homepage sections</h1>
      <p className="text-slate-600 mb-6 text-sm">
        Toggle sections on the public homepage. Edit copy in Django admin or via API translations JSON.
      </p>
      <ul className="space-y-2">
        {sections.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200"
          >
            <span className="font-medium text-slate-800">{s.section_key}</span>
            <button
              type="button"
              onClick={() => toggleActive(s)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                s.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {s.is_active ? 'Active' : 'Inactive'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

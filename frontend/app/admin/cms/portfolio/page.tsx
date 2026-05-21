'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { adminApi } from '@/lib/api'
import CmsDataTable from '@/components/admin/CmsDataTable'

interface Row {
  id: number
  title?: string
  slug?: string
  category?: string
  is_published?: boolean
  is_featured?: boolean
}

export default function AdminPortfolioPage() {
  const { user, checkAuth, isLoading } = useAuthStore()
  const router = useRouter()
  const [rows, setRows] = useState<Row[]>([])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!isLoading && (!user || !user.is_admin)) router.push('/login')
  }, [user, isLoading, router])

  useEffect(() => {
    if (!user?.is_admin) return
    adminApi.portfolio.projects
      .list()
      .then((res) => {
        const data = res.data as { results?: Row[] } | Row[]
        setRows(Array.isArray(data) ? data : data.results ?? [])
      })
      .catch(() => setRows([]))
  }, [user])

  if (isLoading || !user?.is_admin) return null

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Portfolio projects</h1>
      <p className="text-slate-600 mb-6 text-sm">
        Public portfolio grid and detail pages load from these records. Full editing via Django admin
        or REST API.
      </p>
      <CmsDataTable
        rows={rows}
        columns={[
          { key: 'title', header: 'Title', render: (r) => r.title || r.slug || '—' },
          { key: 'category', header: 'Category', render: (r) => r.category || '—' },
          {
            key: 'featured',
            header: 'Featured',
            render: (r) => (r.is_featured ? 'Yes' : '—'),
          },
          {
            key: 'published',
            header: 'Published',
            render: (r) => (
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  r.is_published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100'
                }`}
              >
                {r.is_published ? 'Yes' : 'Draft'}
              </span>
            ),
          },
        ]}
      />
    </div>
  )
}

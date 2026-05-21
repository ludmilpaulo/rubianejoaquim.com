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
  resource_type?: string
  is_published?: boolean
  is_featured?: boolean
}

export default function AdminResourcesPage() {
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
    adminApi.portfolio.resources
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
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Free content & resources</h1>
      <p className="text-slate-600 mb-6 text-sm">Guides, videos, PDFs shown on homepage and free content pages.</p>
      <CmsDataTable
        rows={rows}
        columns={[
          { key: 'title', header: 'Title', render: (r) => r.title || r.slug || '—' },
          { key: 'type', header: 'Type', render: (r) => r.resource_type || '—' },
          { key: 'featured', header: 'Featured', render: (r) => (r.is_featured ? 'Yes' : '—') },
          {
            key: 'pub',
            header: 'Published',
            render: (r) => (r.is_published ? 'Yes' : 'No'),
          },
        ]}
      />
    </div>
  )
}

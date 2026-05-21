'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { adminApi } from '@/lib/api'
import CmsDataTable from '@/components/admin/CmsDataTable'

interface Row {
  id: number
  client_name?: string
  client_company?: string
  rating?: number
  is_published?: boolean
}

export default function AdminTestimonialsPage() {
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
    adminApi.portfolio.testimonials
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
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Testimonials</h1>
      <p className="text-slate-600 mb-6 text-sm">Homepage testimonial carousel content from API.</p>
      <CmsDataTable
        rows={rows}
        columns={[
          { key: 'name', header: 'Client', render: (r) => r.client_name || '—' },
          { key: 'company', header: 'Company', render: (r) => r.client_company || '—' },
          { key: 'rating', header: 'Rating', render: (r) => r.rating ?? '—' },
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

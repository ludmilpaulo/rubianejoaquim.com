'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { adminApi } from '@/lib/api'
import CmsDataTable from '@/components/admin/CmsDataTable'

interface Row {
  id: number
  category?: string
  question?: string
  is_active?: boolean
}

export default function AdminFaqsPage() {
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
    adminApi.portfolio.faqs
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
      <h1 className="text-2xl font-bold text-slate-900 mb-2">FAQs</h1>
      <p className="text-slate-600 mb-6 text-sm">Per-category FAQs for services, Zenda, courses, etc.</p>
      <CmsDataTable
        rows={rows}
        columns={[
          { key: 'cat', header: 'Category', render: (r) => r.category || '—' },
          { key: 'q', header: 'Question', render: (r) => r.question || '—' },
          { key: 'active', header: 'Active', render: (r) => (r.is_active ? 'Yes' : 'No') },
        ]}
      />
    </div>
  )
}

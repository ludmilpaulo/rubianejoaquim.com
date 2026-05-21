'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { adminApi } from '@/lib/api'
import CmsDataTable from '@/components/admin/CmsDataTable'

interface ZendaRow {
  id: number
  headline?: string
  is_active?: boolean
}

export default function AdminZendaPage() {
  const { user, checkAuth, isLoading } = useAuthStore()
  const router = useRouter()
  const [rows, setRows] = useState<ZendaRow[]>([])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!isLoading && (!user || !user.is_admin)) router.push('/login')
  }, [user, isLoading, router])

  useEffect(() => {
    if (!user?.is_admin) return
    adminApi.portfolio.zenda
      .list()
      .then((res) => {
        const data = res.data as { results?: ZendaRow[] } | ZendaRow[]
        setRows(Array.isArray(data) ? data : data.results ?? [])
      })
      .catch(() => setRows([]))
  }, [user])

  if (isLoading || !user?.is_admin) return null

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Zenda product content</h1>
      <p className="text-slate-600 mb-6 text-sm">
        Homepage Zenda block and /zenda page. Manage features and screenshots via Django admin.
      </p>
      <CmsDataTable
        rows={rows}
        columns={[
          { key: 'headline', header: 'Headline', render: (r) => r.headline || '—' },
          {
            key: 'active',
            header: 'Active',
            render: (r) => (r.is_active ? 'Yes' : 'No'),
          },
        ]}
      />
      <a
        href="/zenda"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mt-6 text-sm text-amber-700 hover:underline"
      >
        Preview Zenda page ↗
      </a>
    </div>
  )
}

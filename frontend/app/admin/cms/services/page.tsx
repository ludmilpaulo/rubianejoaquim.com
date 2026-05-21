'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { adminApi } from '@/lib/api'

interface ServiceRow {
  id: number
  slug?: string
  icon: string
  is_active?: boolean
  is_featured?: boolean
  order?: number
  translations?: Record<string, { title?: string }>
}

export default function AdminServicesPage() {
  const { user, checkAuth, isLoading } = useAuthStore()
  const router = useRouter()
  const [services, setServices] = useState<ServiceRow[]>([])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!isLoading && (!user || !user.is_admin)) router.push('/login')
  }, [user, isLoading, router])

  useEffect(() => {
    if (!user?.is_admin) return
    adminApi.portfolio.services
      .list()
      .then((res) => {
        const data = res.data as { results?: ServiceRow[] } | ServiceRow[]
        setServices(Array.isArray(data) ? data : data.results ?? [])
      })
      .catch(() => setServices([]))
  }, [user])

  if (isLoading || !user?.is_admin) return null

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Services</h1>
      <ul className="space-y-2">
        {services.map((s) => (
          <li key={s.id} className="p-4 bg-white rounded-xl border border-slate-200 flex justify-between gap-4">
            <div>
              <p className="font-medium text-slate-900">
                {s.translations?.pt?.title || s.translations?.en?.title || `Service #${s.id}`}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {s.slug} · order {s.order} · {s.is_featured ? 'featured' : 'standard'}
              </p>
            </div>
            <span
              className={`self-center px-3 py-1 rounded-full text-xs ${
                s.is_active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {s.is_active !== false ? 'Active' : 'Inactive'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

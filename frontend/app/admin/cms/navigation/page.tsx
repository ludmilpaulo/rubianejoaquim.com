'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { adminApi } from '@/lib/api'

interface NavRow {
  id: number
  url: string
  placement: string
  order: number
  is_active: boolean
  translations?: Record<string, { label?: string }>
}

export default function AdminNavigationPage() {
  const { user, checkAuth, isLoading } = useAuthStore()
  const router = useRouter()
  const [items, setItems] = useState<NavRow[]>([])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!isLoading && (!user || !user.is_admin)) router.push('/login')
  }, [user, isLoading, router])

  useEffect(() => {
    if (!user?.is_admin) return
    adminApi.portfolio.navigation
      .list()
      .then((res) => {
        const data = res.data as { results?: NavRow[] } | NavRow[]
        setItems(Array.isArray(data) ? data : data.results ?? [])
      })
      .catch(() => setItems([]))
  }, [user])

  const toggle = async (row: NavRow) => {
    await adminApi.portfolio.navigation.update(row.id, { is_active: !row.is_active })
    setItems((prev) => prev.map((i) => (i.id === row.id ? { ...i, is_active: !i.is_active } : i)))
  }

  if (isLoading || !user?.is_admin) return null

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Navigation</h1>
      <ul className="space-y-2">
        {items
          .sort((a, b) => a.order - b.order)
          .map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200"
            >
              <div>
                <p className="font-medium">{item.translations?.pt?.label || item.translations?.en?.label}</p>
                <p className="text-xs text-slate-500">
                  {item.url} · {item.placement}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggle(item)}
                className={`px-3 py-1 rounded-full text-xs ${
                  item.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {item.is_active ? 'Active' : 'Off'}
              </button>
            </li>
          ))}
      </ul>
    </div>
  )
}

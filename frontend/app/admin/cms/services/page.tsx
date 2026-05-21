'use client'

import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/api'
import { useAdminGate } from '@/hooks/useAdminGate'
import ServiceEditor, { type ServiceRow } from '@/components/admin/ServiceEditor'

export default function AdminServicesPage() {
  const { ready } = useAdminGate()
  const [services, setServices] = useState<ServiceRow[]>([])

  useEffect(() => {
    if (!ready) return
    adminApi.portfolio.services
      .list()
      .then((res) => {
        const data = res.data as { results?: ServiceRow[] } | ServiceRow[]
        const list = Array.isArray(data) ? data : data.results ?? []
        list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        setServices(list)
      })
      .catch(() => setServices([]))
  }, [ready])

  if (!ready) return null

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Services</h1>
      <p className="text-slate-600 mb-6 text-sm">
        Edit service cards shown on the homepage. Expand each row to edit copy per language.
      </p>
      <div className="space-y-3">
        {services.map((s) => (
          <ServiceEditor
            key={s.id}
            service={s}
            onSaved={(updated) =>
              setServices((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
            }
          />
        ))}
      </div>
    </div>
  )
}

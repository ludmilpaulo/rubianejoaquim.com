'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { adminApi } from '@/lib/api'

interface LeadRow {
  id: number
  name: string
  email: string
  subject: string
  status: string
  service_interest?: string
  created_at: string
}

const STATUSES = ['new', 'contacted', 'in_progress', 'converted', 'lost', 'spam'] as const

export default function AdminLeadsPage() {
  const { user, checkAuth, isLoading } = useAuthStore()
  const router = useRouter()
  const [leads, setLeads] = useState<LeadRow[]>([])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!isLoading && (!user || !user.is_admin)) router.push('/login')
  }, [user, isLoading, router])

  useEffect(() => {
    if (!user?.is_admin) return
    adminApi.portfolio.contactMessages
      .list()
      .then((res) => {
        const data = res.data as { results?: LeadRow[] } | LeadRow[]
        setLeads(Array.isArray(data) ? data : data.results ?? [])
      })
      .catch(() => setLeads([]))
  }, [user])

  const updateStatus = async (id: number, status: string) => {
    await adminApi.portfolio.contactMessages.update(id, { status })
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)))
  }

  if (isLoading || !user?.is_admin) return null

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Leads</h1>
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{lead.name}</td>
                <td className="px-4 py-3">{lead.email}</td>
                <td className="px-4 py-3">{lead.subject}</td>
                <td className="px-4 py-3 text-slate-500">{lead.service_interest || '—'}</td>
                <td className="px-4 py-3">
                  <select
                    value={lead.status}
                    onChange={(e) => updateStatus(lead.id, e.target.value)}
                    className="border border-slate-200 rounded px-2 py-1 text-xs"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(lead.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {leads.length === 0 && <p className="p-8 text-center text-slate-500">No leads yet</p>}
      </div>
    </div>
  )
}

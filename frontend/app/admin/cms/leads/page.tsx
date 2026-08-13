'use client'

import { useEffect, useMemo, useState } from 'react'
import { adminApi } from '@/lib/api'
import { useAdminGate } from '@/hooks/useAdminGate'
import LeadDetailPanel, { type LeadRow } from '@/components/admin/LeadDetailPanel'

const STATUSES = ['all', 'new', 'contacted', 'in_progress', 'converted', 'lost', 'spam'] as const

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-zenda-dark',
  contacted: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-zenda-container text-zenda-dark',
  converted: 'bg-emerald-100 text-emerald-800',
  lost: 'bg-slate-100 text-slate-600',
  spam: 'bg-red-100 text-red-800',
}

export default function AdminLeadsPage() {
  const { ready } = useAdminGate()
  const [leads, setLeads] = useState<LeadRow[]>([])
  const [filter, setFilter] = useState<(typeof STATUSES)[number]>('all')
  const [selected, setSelected] = useState<LeadRow | null>(null)

  useEffect(() => {
    if (!ready) return
    adminApi.portfolio.contactMessages
      .list()
      .then((res) => {
        const data = res.data as { results?: LeadRow[] } | LeadRow[]
        setLeads(Array.isArray(data) ? data : data.results ?? [])
      })
      .catch(() => setLeads([]))
  }, [ready])

  const filtered = useMemo(() => {
    if (filter === 'all') return leads
    return leads.filter((l) => l.status === filter)
  }, [leads, filter])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: leads.length }
    for (const l of leads) {
      c[l.status] = (c[l.status] || 0) + 1
    }
    return c
  }, [leads])

  const updateStatus = async (id: number, status: string) => {
    await adminApi.portfolio.contactMessages.update(id, { status })
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)))
  }

  if (!ready) return null

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Leads & contact</h1>
      <p className="text-slate-600 mb-6 text-sm">Manage form submissions from the public site.</p>

      <div className="flex flex-wrap gap-2 mb-6">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === s ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            {s} {counts[s] !== undefined ? `(${counts[s]})` : ''}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <p className="text-2xl font-bold text-slate-900">{counts.new || 0}</p>
          <p className="text-xs text-slate-500 mt-1">New leads</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <p className="text-2xl font-bold text-emerald-700">{counts.converted || 0}</p>
          <p className="text-xs text-slate-500 mt-1">Converted</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200">
          <p className="text-2xl font-bold text-slate-900">{leads.length}</p>
          <p className="text-xs text-slate-500 mt-1">Total submissions</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((lead) => (
              <tr
                key={lead.id}
                className="border-t border-slate-100 hover:bg-slate-50/80 cursor-pointer"
                onClick={() => setSelected(lead)}
              >
                <td className="px-4 py-3 font-medium">{lead.name}</td>
                <td className="px-4 py-3 text-slate-600">{lead.email}</td>
                <td className="px-4 py-3 max-w-[200px] truncate">{lead.subject}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={lead.status}
                    onChange={(e) => updateStatus(lead.id, e.target.value)}
                    className={`border-0 rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[lead.status] || ''}`}
                  >
                    {STATUSES.filter((s) => s !== 'all').map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                  {new Date(lead.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-amber-700 text-xs font-medium">View</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-8 text-center text-slate-500">No leads in this filter</p>
        )}
      </div>

      {selected && (
        <LeadDetailPanel
          lead={selected}
          onClose={() => setSelected(null)}
          onUpdate={(updated) => {
            setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
            setSelected(null)
          }}
        />
      )}
    </div>
  )
}

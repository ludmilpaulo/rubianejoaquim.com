'use client'

import { useState } from 'react'
import { adminApi } from '@/lib/api'

export interface LeadRow {
  id: number
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  status: string
  service_interest?: string
  budget_range?: string
  project_type?: string
  source_page?: string
  admin_notes?: string
  created_at: string
}

const STATUSES = ['new', 'contacted', 'in_progress', 'converted', 'lost', 'spam'] as const

export default function LeadDetailPanel({
  lead,
  onClose,
  onUpdate,
}: {
  lead: LeadRow
  onClose: () => void
  onUpdate: (lead: LeadRow) => void
}) {
  const [status, setStatus] = useState(lead.status)
  const [notes, setNotes] = useState(lead.admin_notes || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const res = await adminApi.portfolio.contactMessages.update(lead.id, {
        status,
        admin_notes: notes,
      })
      onUpdate(res.data as LeadRow)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <h2 className="font-semibold text-slate-900">Lead details</h2>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-800">
            ✕
          </button>
        </div>
        <div className="p-6 space-y-4 text-sm">
          <div>
            <p className="text-xs text-slate-500 uppercase">Name</p>
            <p className="font-medium text-slate-900">{lead.name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Email</p>
            <a href={`mailto:${lead.email}`} className="text-amber-700 hover:underline">
              {lead.email}
            </a>
          </div>
          {lead.phone && (
            <div>
              <p className="text-xs text-slate-500 uppercase">Phone</p>
              <p>{lead.phone}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-slate-500 uppercase">Subject</p>
            <p>{lead.subject}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Message</p>
            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{lead.message}</p>
          </div>
          {lead.service_interest && (
            <div>
              <p className="text-xs text-slate-500 uppercase">Service interest</p>
              <p>{lead.service_interest}</p>
            </div>
          )}
          {lead.budget_range && (
            <div>
              <p className="text-xs text-slate-500 uppercase">Budget</p>
              <p>{lead.budget_range}</p>
            </div>
          )}
          {lead.project_type && (
            <div>
              <p className="text-xs text-slate-500 uppercase">Project type</p>
              <p>{lead.project_type}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-slate-500 uppercase mb-1">Status</p>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase mb-1">Admin notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 resize-y"
            />
          </div>
          <p className="text-xs text-slate-400">
            {new Date(lead.created_at).toLocaleString()} · {lead.source_page || '/'}
          </p>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="w-full py-2.5 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

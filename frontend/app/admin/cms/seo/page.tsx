'use client'

import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/api'
import { useAdminGate } from '@/hooks/useAdminGate'
import LocaleTabs from '@/components/admin/LocaleTabs'
import {
  blockFromTranslations,
  mergeTranslations,
  type CmsLocale,
  type TranslationsMap,
} from '@/lib/cms-admin'

interface PageSeoRow {
  id: number
  page_key: string
  canonical_path?: string
  translations?: TranslationsMap
}

type SeoBlock = {
  title?: string
  description?: string
  keywords?: string
  og_title?: string
  og_description?: string
}

export default function AdminSeoPage() {
  const { ready } = useAdminGate()
  const [pages, setPages] = useState<PageSeoRow[]>([])
  const [selected, setSelected] = useState<PageSeoRow | null>(null)
  const [locale, setLocale] = useState<CmsLocale>('pt')
  const [form, setForm] = useState<SeoBlock>({})
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!ready) return
    adminApi.portfolio.pageSeo
      .list()
      .then((res) => {
        const data = res.data as { results?: PageSeoRow[] } | PageSeoRow[]
        const list = Array.isArray(data) ? data : data.results ?? []
        setPages(list)
        setSelected((prev) => prev ?? list[0] ?? null)
      })
      .catch(() => setPages([]))
  }, [ready])

  useEffect(() => {
    if (!selected) return
    setForm(blockFromTranslations(selected.translations, locale) as SeoBlock)
  }, [selected, locale])

  const save = async () => {
    if (!selected) return
    setSaving(true)
    setMessage('')
    try {
      const translations = mergeTranslations(selected.translations, locale, form)
      const res = await adminApi.portfolio.pageSeo.update(selected.id, { translations })
      const updated = res.data as PageSeoRow
      setPages((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      setSelected(updated)
      setMessage('Saved')
    } catch {
      setMessage('Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (!ready) return null

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Page SEO</h1>
      <p className="text-slate-600 mb-6 text-sm">
        Meta titles and descriptions for public pages (home, Zenda, etc.).
      </p>

      <div className="flex flex-wrap gap-2 mb-6">
        {pages.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelected(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              selected?.id === p.id
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            {p.page_key}
          </button>
        ))}
      </div>

      {selected && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-2xl">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-slate-500">
              Path: <code className="text-slate-800">{selected.canonical_path || '/'}</code>
            </p>
            <LocaleTabs locale={locale} onChange={setLocale} />
          </div>
          <div className="space-y-4">
            {(['title', 'description', 'keywords', 'og_title', 'og_description'] as const).map(
              (key) => (
                <label key={key} className="block">
                  <span className="text-xs font-medium text-slate-500 uppercase">{key}</span>
                  {key === 'description' || key === 'og_description' ? (
                    <textarea
                      value={form[key] || ''}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      rows={3}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    />
                  ) : (
                    <input
                      type="text"
                      value={form[key] || ''}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                    />
                  )}
                </label>
              ),
            )}
          </div>
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save SEO'}
            </button>
            {message && (
              <span
                className={`text-sm ${message === 'Saved' ? 'text-emerald-600' : 'text-red-600'}`}
              >
                {message}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

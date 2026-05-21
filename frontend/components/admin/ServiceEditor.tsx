'use client'

import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/api'
import LocaleTabs from './LocaleTabs'
import {
  arrayToLines,
  blockFromTranslations,
  linesToArray,
  mergeTranslations,
  type CmsLocale,
  type TranslationsMap,
} from '@/lib/cms-admin'

export interface ServiceRow {
  id: number
  slug?: string
  icon: string
  order?: number
  is_active?: boolean
  is_featured?: boolean
  translations?: TranslationsMap & Record<string, { title?: string; description?: string; short_description?: string; features?: string[] }>
}

type ServiceBlock = {
  title?: string
  description?: string
  short_description?: string
  cta_text?: string
  cta_link?: string
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  multiline?: boolean
}) {
  const className =
    'w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 outline-none'
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={`${className} mt-1 resize-y`}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${className} mt-1`}
        />
      )}
    </label>
  )
}

export default function ServiceEditor({
  service,
  onSaved,
}: {
  service: ServiceRow
  onSaved: (updated: ServiceRow) => void
}) {
  const [locale, setLocale] = useState<CmsLocale>('pt')
  const [expanded, setExpanded] = useState(false)
  const [active, setActive] = useState(service.is_active !== false)
  const [featured, setFeatured] = useState(Boolean(service.is_featured))
  const [form, setForm] = useState<ServiceBlock>({})
  const [featuresText, setFeaturesText] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setActive(service.is_active !== false)
    setFeatured(Boolean(service.is_featured))
    const block = blockFromTranslations(service.translations, locale) as ServiceBlock & {
      features?: string[]
    }
    setForm(block)
    setFeaturesText(arrayToLines(Array.isArray(block.features) ? block.features : undefined))
  }, [service, locale])

  const title =
    service.translations?.pt?.title || service.translations?.en?.title || `Service #${service.id}`

  const save = async () => {
    setSaving(true)
    setMessage('')
    try {
      const patch = {
        ...form,
        features: linesToArray(featuresText),
      }
      const translations = mergeTranslations(service.translations, locale, patch)
      const res = await adminApi.portfolio.services.update(service.id, {
        is_active: active,
        is_featured: featured,
        translations,
      })
      onSaved(res.data as ServiceRow)
      setMessage('Saved')
    } catch {
      setMessage('Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100/80 text-left"
      >
        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {service.slug || '—'} · {service.icon} · order {service.order ?? 0}
          </p>
        </div>
        <span className="text-slate-400 text-sm">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <>
          <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded"
                />
                Active
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="rounded"
                />
                Featured
              </label>
            </div>
            <LocaleTabs locale={locale} onChange={setLocale} />
          </div>
          <div className="p-4 grid sm:grid-cols-2 gap-4 border-t border-slate-100">
            <Field
              label="Title"
              value={form.title || ''}
              onChange={(v) => setForm((p) => ({ ...p, title: v }))}
            />
            <Field
              label="Short description"
              value={form.short_description || ''}
              onChange={(v) => setForm((p) => ({ ...p, short_description: v }))}
            />
            <Field
              label="Description"
              value={form.description || ''}
              onChange={(v) => setForm((p) => ({ ...p, description: v }))}
              multiline
            />
            <Field
              label="Features (one per line)"
              value={featuresText}
              onChange={setFeaturesText}
              multiline
            />
            <Field
              label="CTA text"
              value={form.cta_text || ''}
              onChange={(v) => setForm((p) => ({ ...p, cta_text: v }))}
            />
            <Field
              label="CTA link"
              value={form.cta_link || ''}
              onChange={(v) => setForm((p) => ({ ...p, cta_link: v }))}
            />
          </div>
          <div className="px-4 pb-4 flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save service'}
            </button>
            {message && (
              <span
                className={`text-sm ${message === 'Saved' ? 'text-emerald-600' : 'text-red-600'}`}
              >
                {message}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  )
}

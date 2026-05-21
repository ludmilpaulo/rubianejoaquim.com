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
  type LocaleBlock,
  type TranslationsMap,
} from '@/lib/cms-admin'

export interface HomeSectionRow {
  id: number
  section_key: string
  is_active: boolean
  translations?: TranslationsMap
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

export default function HomeSectionEditor({
  section,
  onSaved,
}: {
  section: HomeSectionRow
  onSaved: (updated: HomeSectionRow) => void
}) {
  const [locale, setLocale] = useState<CmsLocale>('pt')
  const [active, setActive] = useState(section.is_active)
  const [form, setForm] = useState<LocaleBlock>({})
  const [rolesText, setRolesText] = useState('')
  const [trustText, setTrustText] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setActive(section.is_active)
    const block = blockFromTranslations(section.translations, locale)
    setForm(block)
    if (section.section_key === 'hero') {
      setRolesText(arrayToLines(Array.isArray(block.roles) ? block.roles : undefined))
      setTrustText(arrayToLines(Array.isArray(block.trust_items) ? block.trust_items : undefined))
    }
  }, [section, locale])

  const update = (key: keyof LocaleBlock, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const save = async () => {
    setSaving(true)
    setMessage('')
    try {
      const patch: LocaleBlock = {
        title: form.title,
        subtitle: form.subtitle,
        body: form.body,
        badge: form.badge,
        cta_label: form.cta_label,
      }
      if (section.section_key === 'hero') {
        patch.roles = linesToArray(rolesText)
        patch.trust_items = linesToArray(trustText)
      }
      const translations = mergeTranslations(section.translations, locale, patch)
      const res = await adminApi.portfolio.homeSections.update(section.id, {
        is_active: active,
        translations,
      })
      const updated = res.data as HomeSectionRow
      onSaved(updated)
      setMessage('Saved')
    } catch {
      setMessage('Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-slate-200 rounded-xl bg-white overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
        <div>
          <p className="font-semibold text-slate-900">{section.section_key}</p>
          <label className="flex items-center gap-2 mt-1 text-sm text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="rounded border-slate-300"
            />
            Visible on homepage
          </label>
        </div>
        <LocaleTabs locale={locale} onChange={setLocale} />
      </div>
      <div className="p-4 grid sm:grid-cols-2 gap-4">
        <Field label="Title" value={form.title || ''} onChange={(v) => update('title', v)} />
        <Field label="Subtitle" value={form.subtitle || ''} onChange={(v) => update('subtitle', v)} />
        <Field
          label="Body"
          value={form.body || ''}
          onChange={(v) => update('body', v)}
          multiline
        />
        <Field label="Badge" value={form.badge || ''} onChange={(v) => update('badge', v)} />
        <Field label="CTA label" value={form.cta_label || ''} onChange={(v) => update('cta_label', v)} />
        {section.section_key === 'hero' && (
          <>
            <Field
              label="Roles (one per line)"
              value={rolesText}
              onChange={setRolesText}
              multiline
            />
            <Field
              label="Trust items (one per line)"
              value={trustText}
              onChange={setTrustText}
              multiline
            />
          </>
        )}
      </div>
      <div className="px-4 pb-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save section'}
        </button>
        {message && (
          <span className={`text-sm ${message === 'Saved' ? 'text-emerald-600' : 'text-red-600'}`}>
            {message}
          </span>
        )}
      </div>
    </div>
  )
}

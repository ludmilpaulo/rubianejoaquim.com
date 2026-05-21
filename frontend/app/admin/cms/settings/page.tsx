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

type SettingsData = {
  id: number
  contact_email?: string
  whatsapp_number?: string
  phone?: string
  instagram_url?: string
  linkedin_url?: string
  youtube_url?: string
  tiktok_url?: string
  calendly_url?: string
  translations?: TranslationsMap
}

type LocaleSettings = {
  brand_name?: string
  brand_tagline?: string
  footer_description?: string
  footer_rights?: string
  contact_title?: string
  contact_subtitle?: string
  play_store_label?: string
  app_store_label?: string
}

const CONTACT_FORM_KEYS = [
  'name',
  'email',
  'phone',
  'subject',
  'message',
  'service_interest',
  'budget_range',
  'project_type',
  'submit',
  'submitting',
  'success',
  'error',
] as const

export default function AdminSettingsPage() {
  const { ready } = useAdminGate()
  const [settings, setSettings] = useState<SettingsData | null>(null)
  const [locale, setLocale] = useState<CmsLocale>('pt')
  const [localeForm, setLocaleForm] = useState<LocaleSettings>({})
  const [contactForm, setContactForm] = useState<Record<string, string>>({})
  const [contact, setContact] = useState({
    contact_email: '',
    whatsapp_number: '',
    phone: '',
    instagram_url: '',
    linkedin_url: '',
    youtube_url: '',
    tiktok_url: '',
    calendly_url: '',
  })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!ready) return
    adminApi.portfolio.settings
      .get()
      .then((res) => {
        const data = res.data as SettingsData
        setSettings(data)
        setContact({
          contact_email: data.contact_email || '',
          whatsapp_number: data.whatsapp_number || '',
          phone: data.phone || '',
          instagram_url: data.instagram_url || '',
          linkedin_url: data.linkedin_url || '',
          youtube_url: data.youtube_url || '',
          tiktok_url: data.tiktok_url || '',
          calendly_url: data.calendly_url || '',
        })
      })
      .catch(() => setSettings(null))
  }, [ready])

  useEffect(() => {
    if (!settings) return
    const block = blockFromTranslations(settings.translations, locale) as LocaleSettings & {
      contact_form?: Record<string, string>
    }
    setLocaleForm(block)
    setContactForm(
      typeof block.contact_form === 'object' && block.contact_form ? { ...block.contact_form } : {},
    )
  }, [settings, locale])

  const save = async () => {
    if (!settings) return
    setSaving(true)
    setMessage('')
    try {
      const localePatch = { ...localeForm, contact_form: contactForm }
      const translations = mergeTranslations(settings.translations, locale, localePatch)
      const res = await adminApi.portfolio.settings.update({
        ...contact,
        translations,
      })
      setSettings(res.data as SettingsData)
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
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Site settings</h1>
      <p className="text-slate-600 mb-6 text-sm">
        Global contact details, social links, and localized labels (footer, contact form, Zenda).
      </p>

      <div className="space-y-6 max-w-3xl">
        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Contact & social</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {(
              [
                ['contact_email', 'Contact email'],
                ['whatsapp_number', 'WhatsApp'],
                ['phone', 'Phone'],
                ['instagram_url', 'Instagram URL'],
                ['linkedin_url', 'LinkedIn URL'],
                ['youtube_url', 'YouTube URL'],
                ['tiktok_url', 'TikTok URL'],
                ['calendly_url', 'Calendly URL'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block">
                <span className="text-xs text-slate-500 uppercase">{label}</span>
                <input
                  type="text"
                  value={contact[key]}
                  onChange={(e) => setContact((c) => ({ ...c, [key]: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </label>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-slate-900">Localized copy</h2>
            <LocaleTabs locale={locale} onChange={setLocale} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {(
              [
                ['brand_name', 'Brand name'],
                ['brand_tagline', 'Brand tagline'],
                ['contact_title', 'Contact section title'],
                ['contact_subtitle', 'Contact subtitle'],
                ['play_store_label', 'Play Store label'],
                ['app_store_label', 'App Store label'],
                ['footer_description', 'Footer description'],
                ['footer_rights', 'Footer rights line'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block sm:col-span-2">
                <span className="text-xs text-slate-500 uppercase">{label}</span>
                <input
                  type="text"
                  value={localeForm[key] || ''}
                  onChange={(e) => setLocaleForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </label>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Contact form labels ({locale})</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {CONTACT_FORM_KEYS.map((key) => (
              <label key={key} className="block">
                <span className="text-xs text-slate-500">{key}</span>
                <input
                  type="text"
                  value={contactForm[key] || ''}
                  onChange={(e) => setContactForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </label>
            ))}
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving || !settings}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
          {message && (
            <span className={`text-sm ${message === 'Saved' ? 'text-emerald-600' : 'text-red-600'}`}>
              {message}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

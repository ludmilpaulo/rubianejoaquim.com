'use client'

import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useLocale } from '@/contexts/LocaleContext'
import { portfolioApi } from '@/lib/portfolio-api'
import type { ContactFormData, ContactFormLabels, SiteSettings } from '@/lib/public-types'
import type { Locale } from '@/lib/i18n/config'
import SectionHeader from './SectionHeader'
import Reveal from './Reveal'

const WHATSAPP_BASE = 'https://wa.me/'

const FORM_FALLBACK_PT: ContactFormLabels = {
  name: 'Nome',
  email: 'Email',
  phone: 'Telefone',
  subject: 'Assunto',
  message: 'Mensagem',
  service_interest: 'Serviço de interesse',
  budget_range: 'Orçamento estimado',
  project_type: 'Tipo de projeto',
  submit: 'Enviar mensagem',
  submitting: 'A enviar…',
  success: 'Mensagem enviada. Obrigado!',
  error: 'Erro ao enviar. Tente novamente.',
  required: 'Obrigatório',
  whatsapp_label: 'WhatsApp',
  email_label: 'Email',
}

const FORM_FALLBACK_EN: ContactFormLabels = {
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  subject: 'Subject',
  message: 'Message',
  service_interest: 'Service of interest',
  budget_range: 'Budget range',
  project_type: 'Project type',
  submit: 'Send message',
  submitting: 'Sending…',
  success: 'Message sent. Thank you!',
  error: 'Could not send. Please try again.',
  required: 'Required',
  whatsapp_label: 'WhatsApp',
  email_label: 'Email',
}

function contactFallbacks(locale: Locale) {
  if (locale === 'pt') {
    return {
      label: 'Contacto',
      title: 'Vamos trabalhar juntos',
      subtitle: 'Conte-me sobre o seu projeto — respondo em breve.',
      form: FORM_FALLBACK_PT,
    }
  }
  return {
    label: 'Contact',
    title: "Let's work together",
    subtitle: 'Tell me about your project — I will reply soon.',
    form: FORM_FALLBACK_EN,
  }
}

const SERVICE_OPTIONS = [
  'campaign_videos',
  'interviews',
  'scriptwriting',
  'social_reels',
  'capcut',
  'canva',
  'brand_storytelling',
  'content_strategy',
  'zenda',
  'other',
] as const

export default function ContactSection({
  settings,
}: {
  settings: SiteSettings | Record<string, never>
}) {
  const { locale } = useLocale()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactFormData>()

  const fallbacks = contactFallbacks(locale)
  const whatsapp = 'whatsapp_number' in settings ? settings.whatsapp_number : ''
  const email = 'contact_email' in settings ? settings.contact_email : ''
  const phone = 'phone' in settings ? settings.phone : ''
  const label = settings.contact_label || fallbacks.label
  const title = settings.contact_title || fallbacks.title
  const subtitle = settings.contact_subtitle || fallbacks.subtitle
  const form = { ...fallbacks.form, ...(settings.contact_form || {}) }

  const serviceLabels = useMemo(() => {
    const fromSettings = (settings as SiteSettings).contact_form as Record<string, string> | undefined
    return SERVICE_OPTIONS.map((key) => ({
      value: key,
      label: fromSettings?.[`service_${key}`] || key.replace(/_/g, ' '),
    }))
  }, [settings])

  const onSubmit = async (data: ContactFormData) => {
    setStatus('loading')
    try {
      await portfolioApi.sendContact({
        ...data,
        locale,
        source_page: typeof window !== 'undefined' ? window.location.pathname : '/',
      })
      setStatus('success')
      reset()
    } catch {
      setStatus('error')
    }
  }

  return (
    <section id="contact" className="py-24 md:py-32 section-dark border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeader label={label} title={title} subtitle={subtitle} />
        </Reveal>
        <Reveal delay={100}>
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto -mt-4">
            <div className="space-y-4">
              {whatsapp && (
                <a
                  href={`${WHATSAPP_BASE}${whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-colors"
                >
                  <span className="text-2xl" aria-hidden>
                    ◆
                  </span>
                  <div>
                    <span className="text-xs uppercase tracking-wider opacity-70">
                      {form.whatsapp_label}
                    </span>
                    <p className="font-semibold text-lg">{phone}</p>
                  </div>
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:border-amber-400/30 transition-colors"
                >
                  <span className="text-2xl" aria-hidden>
                    ◆
                  </span>
                  <div>
                    <span className="text-xs uppercase tracking-wider text-slate-500">
                      {form.email_label}
                    </span>
                    <p className="font-medium">{email}</p>
                  </div>
                </a>
              )}
            </div>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="p-6 sm:p-8 rounded-2xl bg-slate-900/80 border border-white/5 space-y-4"
            >
              <div>
                <label className="block text-sm text-slate-400 mb-1">{form.name}</label>
                <input {...register('name', { required: true })} className="input-field" />
                {errors.name && (
                  <span className="text-red-400 text-xs">{form.required}</span>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">{form.email}</label>
                  <input
                    type="email"
                    {...register('email', { required: true })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">{form.phone}</label>
                  <input {...register('phone')} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">{form.service_interest}</label>
                <select {...register('service_interest')} className="input-field">
                  <option value="" />
                  {serviceLabels.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">{form.budget_range}</label>
                  <input {...register('budget_range')} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">{form.project_type}</label>
                  <input {...register('project_type')} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">{form.subject}</label>
                <input {...register('subject', { required: true })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">{form.message}</label>
                <textarea
                  {...register('message', { required: true })}
                  rows={5}
                  className="input-field resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={status === 'loading'}
                className="btn-primary w-full disabled:opacity-60"
              >
                {status === 'loading' ? form.submitting : form.submit}
              </button>
              {status === 'success' && (
                <p className="text-emerald-400 text-sm text-center">{form.success}</p>
              )}
              {status === 'error' && (
                <p className="text-red-400 text-sm text-center">{form.error}</p>
              )}
            </form>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

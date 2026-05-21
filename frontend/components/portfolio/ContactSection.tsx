'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocale, useTranslations } from '@/contexts/LocaleContext'
import { portfolioApi } from '@/lib/portfolio-api'
import type { ContactFormData, SiteSettings } from '@/lib/portfolio-types'
import SectionHeader from './SectionHeader'

const WHATSAPP_BASE = 'https://wa.me/'

export default function ContactSection({
  settings,
}: {
  settings: SiteSettings | Record<string, never>
}) {
  const t = useTranslations()
  const { locale } = useLocale()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactFormData>()

  const whatsapp = 'whatsapp_number' in settings ? settings.whatsapp_number : '244944905246'
  const email = 'contact_email' in settings ? settings.contact_email : 'contacto@rubianejoaquim.com'
  const phone = 'phone' in settings ? settings.phone : '+244 944 905246'

  const onSubmit = async (data: ContactFormData) => {
    setStatus('loading')
    try {
      await portfolioApi.sendContact({ ...data, locale })
      setStatus('success')
      reset()
    } catch {
      setStatus('error')
    }
  }

  return (
    <section id="contact" className="py-20 md:py-28 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          label={t('contact.label')}
          title={t('contact.title')}
          subtitle={t('contact.subtitle')}
        />
        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          <div className="space-y-4">
            <a
              href={`${WHATSAPP_BASE}${whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 transition-colors"
            >
              <span className="text-2xl">💬</span>
              <div>
                <span className="text-xs uppercase tracking-wider opacity-70">{t('contact.whatsapp')}</span>
                <p className="font-semibold text-lg">{phone}</p>
              </div>
            </a>
            <a
              href={`mailto:${email}`}
              className="flex items-center gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 text-slate-300 hover:border-amber-400/30 transition-colors"
            >
              <span className="text-2xl">✉</span>
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-500">Email</span>
                <p className="font-medium">{email}</p>
              </div>
            </a>
          </div>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="p-6 sm:p-8 rounded-2xl bg-slate-900/80 border border-white/5 space-y-4"
          >
            <div>
              <label className="block text-sm text-slate-400 mb-1">{t('contact.name')}</label>
              <input
                {...register('name', { required: true })}
                className="input-field"
              />
              {errors.name && <span className="text-red-400 text-xs">Required</span>}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">{t('contact.email')}</label>
                <input
                  type="email"
                  {...register('email', { required: true })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">{t('contact.phone')}</label>
                <input {...register('phone')} className="input-field" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">{t('contact.subject')}</label>
              <input
                {...register('subject', { required: true })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">{t('contact.message')}</label>
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
              {status === 'loading' ? t('contact.sending') : t('contact.send')}
            </button>
            {status === 'success' && (
              <p className="text-emerald-400 text-sm text-center">{t('contact.success')}</p>
            )}
            {status === 'error' && (
              <p className="text-red-400 text-sm text-center">{t('contact.error')}</p>
            )}
          </form>
        </div>
      </div>
    </section>
  )
}

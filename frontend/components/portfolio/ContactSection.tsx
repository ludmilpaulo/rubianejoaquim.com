'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLocale } from '@/contexts/LocaleContext'
import { portfolioApi } from '@/lib/portfolio-api'
import type { ContactFormData, SiteSettings } from '@/lib/public-types'
import SectionHeader from './SectionHeader'
import Reveal from './Reveal'

const WHATSAPP_BASE = 'https://wa.me/'

export default function ContactSection({
  settings,
}: {
  settings: SiteSettings | Record<string, never>
}) {
  const { locale } = useLocale()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ContactFormData>()

  const whatsapp = 'whatsapp_number' in settings ? settings.whatsapp_number : ''
  const email = 'contact_email' in settings ? settings.contact_email : ''
  const phone = 'phone' in settings ? settings.phone : ''
  const label = settings.contact_label || 'Contact'
  const title = settings.contact_title || ''
  const subtitle = settings.contact_subtitle || ''

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
                  <span className="text-2xl">💬</span>
                  <div>
                    <span className="text-xs uppercase tracking-wider opacity-70">WhatsApp</span>
                    <p className="font-semibold text-lg">{phone}</p>
                  </div>
                </a>
              )}
              {email && (
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
              )}
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 sm:p-8 rounded-2xl bg-slate-900/80 border border-white/5 space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Name</label>
                <input {...register('name', { required: true })} className="input-field" />
                {errors.name && <span className="text-red-400 text-xs">Required</span>}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Email</label>
                  <input type="email" {...register('email', { required: true })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Phone</label>
                  <input {...register('phone')} className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Subject</label>
                <input {...register('subject', { required: true })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Message</label>
                <textarea {...register('message', { required: true })} rows={5} className="input-field resize-none" />
              </div>
              <input type="hidden" {...register('service_interest')} />
              <button type="submit" disabled={status === 'loading'} className="btn-primary w-full disabled:opacity-60">
                {status === 'loading' ? '…' : 'Send'}
              </button>
              {status === 'success' && <p className="text-emerald-400 text-sm text-center">✓</p>}
              {status === 'error' && <p className="text-red-400 text-sm text-center">Error</p>}
            </form>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

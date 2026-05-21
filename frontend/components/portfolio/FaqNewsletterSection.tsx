'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useLocale } from '@/contexts/LocaleContext'
import { publicApi } from '@/lib/public-api'
import type { FAQ, HomeSection } from '@/lib/public-types'
import SectionIntro from './SectionIntro'
import Reveal from './Reveal'

type Status = 'idle' | 'loading' | 'success' | 'error'

function extraText(section: HomeSection | undefined, key: string, fallback: string) {
  const value = section?.extra_data?.[key]
  return typeof value === 'string' && value.trim() ? value : fallback
}

export default function FaqNewsletterSection({
  faqs,
  intro,
}: {
  faqs: FAQ[]
  intro?: HomeSection
}) {
  const { locale } = useLocale()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  const visibleFaqs = useMemo(() => faqs.slice(0, 6), [faqs])
  const placeholder = extraText(intro, 'newsletter_placeholder', 'your@email.com')
  const successText = extraText(intro, 'newsletter_success', 'Subscription confirmed. Thank you!')
  const errorText = extraText(intro, 'newsletter_error', 'Could not subscribe. Please try again.')
  const noteText = extraText(intro, 'newsletter_note', '')
  const ctaLabel = intro?.cta_label || 'Subscribe'

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) return

    setStatus('loading')
    try {
      await publicApi.subscribeNewsletter(cleanEmail, locale)
      setEmail('')
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  if (!visibleFaqs.length && !intro?.title) return null

  return (
    <section id="faq-newsletter" className="py-24 md:py-32 section-dark border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionIntro section={intro} />
        </Reveal>

        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8 lg:gap-10 -mt-4">
          {visibleFaqs.length > 0 && (
            <Reveal delay={80}>
              <div className="space-y-3">
                {visibleFaqs.map((item, index) => (
                  <details
                    key={item.id}
                    className="group premium-card overflow-hidden transition-all duration-300 open:border-amber-400/25"
                    open={index === 0}
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 sm:p-6">
                      <span className="flex min-w-0 items-center gap-4">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-400/10 text-sm font-bold text-amber-300">
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        <span className="text-left text-base font-semibold text-white">
                          {item.question}
                        </span>
                      </span>
                      <span className="shrink-0 text-xl text-amber-300 transition-transform group-open:rotate-45">
                        +
                      </span>
                    </summary>
                    <div className="px-5 pb-5 sm:px-6 sm:pb-6">
                      <p className="border-t border-white/5 pt-4 text-sm leading-relaxed text-slate-400">
                        {item.answer}
                      </p>
                    </div>
                  </details>
                ))}
              </div>
            </Reveal>
          )}

          <Reveal delay={160}>
            <aside className="premium-card p-6 sm:p-8 lg:sticky lg:top-28">
              {intro?.badge && (
                <span className="inline-flex rounded-lg bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
                  {intro.badge}
                </span>
              )}
              {intro?.body && (
                <p className="mt-5 text-sm leading-relaxed text-slate-300">{intro.body}</p>
              )}
              <form onSubmit={onSubmit} className="mt-6 space-y-3">
                <label className="sr-only" htmlFor="newsletter-email">
                  {placeholder}
                </label>
                <input
                  id="newsletter-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={placeholder}
                  className="input-field"
                  required
                />
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {ctaLabel}
                </button>
              </form>
              {noteText && <p className="mt-4 text-xs leading-relaxed text-slate-500">{noteText}</p>}
              {status === 'success' && (
                <p className="mt-4 text-sm font-medium text-emerald-400">{successText}</p>
              )}
              {status === 'error' && (
                <p className="mt-4 text-sm font-medium text-red-400">{errorText}</p>
              )}
            </aside>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

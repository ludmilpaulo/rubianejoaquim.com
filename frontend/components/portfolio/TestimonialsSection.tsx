'use client'

import { useTranslations } from '@/contexts/LocaleContext'
import type { Testimonial } from '@/lib/portfolio-types'
import SectionHeader from './SectionHeader'

export default function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  const t = useTranslations()
  if (!testimonials.length) return null

  return (
    <section id="testimonials" className="py-20 md:py-28 bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader label={t('testimonials.label')} title={t('testimonials.title')} />
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((item) => (
            <blockquote
              key={item.id}
              className="p-6 sm:p-8 rounded-2xl bg-slate-950 border border-white/5 flex flex-col"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: item.rating }).map((_, i) => (
                  <span key={i} className="text-amber-400 text-sm">
                    ★
                  </span>
                ))}
              </div>
              <p className="text-slate-300 leading-relaxed flex-1">&ldquo;{item.quote}&rdquo;</p>
              <footer className="mt-6 pt-6 border-t border-white/5">
                <cite className="not-italic font-semibold text-white">{item.client_name}</cite>
                <p className="text-sm text-slate-500">
                  {[item.client_role, item.client_company].filter(Boolean).join(' · ')}
                </p>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  )
}

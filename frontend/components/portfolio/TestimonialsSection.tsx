'use client'

import type { HomeSection, Testimonial } from '@/lib/public-types'
import SectionIntro from './SectionIntro'
import Reveal from './Reveal'

export default function TestimonialsSection({
  testimonials,
  intro,
}: {
  testimonials: Testimonial[]
  intro?: HomeSection
}) {
  if (!testimonials.length) return null

  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(251,191,36,0.06),transparent_60%)]" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionIntro section={intro} />
        </Reveal>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 -mt-4">
          {testimonials.map((item, index) => (
            <Reveal key={item.id} delay={80 * index}>
              <blockquote className="premium-card p-8 h-full flex flex-col">
                <div className="flex gap-1 text-amber-400 mb-4" aria-label={`${item.rating} stars`}>
                  {Array.from({ length: item.rating }).map((_, i) => (
                    <span key={i}>★</span>
                  ))}
                </div>
                <p className="text-slate-300 leading-relaxed flex-1">&ldquo;{item.quote}&rdquo;</p>
                <footer className="mt-6 flex items-center gap-4">
                  {item.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-amber-400/30" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-amber-400/20 flex items-center justify-center text-amber-300 font-bold">
                      {item.client_name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <cite className="not-italic font-semibold text-white">{item.client_name}</cite>
                    <p className="text-sm text-slate-500">
                      {[item.client_role, item.client_company].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </footer>
              </blockquote>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

'use client'

import Link from 'next/link'
import type { HomeSection } from '@/lib/public-types'
import Reveal from './Reveal'

export default function EducationBanner({ section }: { section?: HomeSection }) {
  if (!section) return null

  const cards = section.cards ?? []

  return (
    <section id="education" className="py-24 md:py-32 section-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="text-center max-w-3xl mx-auto mb-14">
            {section.badge && (
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">{section.badge}</span>
            )}
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white mt-4">{section.title}</h2>
            {section.subtitle && <p className="text-slate-400 mt-4 text-lg">{section.subtitle}</p>}
          </div>
        </Reveal>
        {cards.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6">
            {cards.map((card, i) => (
              <Reveal key={card.href} delay={80 * i}>
                <Link
                  href={card.href}
                  className="block h-full p-8 rounded-2xl bg-gradient-to-br from-sky-500/20 to-indigo-600/10 border border-sky-500/20 premium-card hover-lift group"
                >
                  <h3 className="text-xl font-semibold text-white group-hover:text-amber-200 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-slate-400 mt-3 text-sm leading-relaxed">{card.description}</p>
                  <span className="inline-flex mt-6 text-amber-400 font-semibold text-sm">{card.cta} →</span>
                </Link>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

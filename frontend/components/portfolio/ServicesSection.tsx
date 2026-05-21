'use client'

import Link from 'next/link'
import type { HomeSection, PortfolioService } from '@/lib/public-types'
import SectionIntro from './SectionIntro'
import ServiceCard from './ServiceCard'
import Reveal from './Reveal'

export default function ServicesSection({
  services,
  intro,
}: {
  services: PortfolioService[]
  intro?: HomeSection
}) {
  if (!services.length && !intro?.title) return null

  const ctaLabel = intro?.cta_label || services[0]?.cta_text
  const ctaHref = services[0]?.cta_link || '/contact'

  return (
    <section id="services" className="py-24 md:py-32 section-elevated relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(99,102,241,0.08),transparent_45%)]" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionIntro section={intro} />
        </Reveal>

        {services.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 -mt-4">
            {services.map((service, index) => (
              <Reveal key={service.id} delay={60 * (index % 4)} className={index === 0 ? 'sm:col-span-2 lg:col-span-2' : ''}>
                <ServiceCard service={service} featured={index === 0 || service.is_featured} />
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="text-center text-slate-500 py-12">—</p>
        )}

        {ctaLabel && (
          <Reveal delay={200}>
            <div className="mt-14 text-center">
              <Link href={ctaHref} className="btn-primary inline-flex">
                {ctaLabel} →
              </Link>
            </div>
          </Reveal>
        )}
      </div>
    </section>
  )
}

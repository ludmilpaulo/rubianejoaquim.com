'use client'

import { useTranslations } from '@/contexts/LocaleContext'
import type { PortfolioService } from '@/lib/portfolio-types'
import SectionHeader from './SectionHeader'
import ServiceCard from './ServiceCard'

export default function ServicesSection({ services }: { services: PortfolioService[] }) {
  const t = useTranslations()

  return (
    <section id="services" className="py-20 md:py-28 bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader
          label={t('services.label')}
          title={t('services.title')}
          subtitle={t('services.subtitle')}
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </div>
    </section>
  )
}

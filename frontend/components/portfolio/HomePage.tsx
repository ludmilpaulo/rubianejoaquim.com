'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/contexts/LocaleContext'
import { portfolioApi } from '@/lib/portfolio-api'
import type { PortfolioHomeData } from '@/lib/portfolio-types'
import HeroSection from './HeroSection'
import AboutSection from './AboutSection'
import ServicesSection from './ServicesSection'
import PortfolioGrid from './PortfolioGrid'
import ShowreelSection from './ShowreelSection'
import ZendaSection from './ZendaSection'
import CaseStudiesSection from './CaseStudiesSection'
import TestimonialsSection from './TestimonialsSection'
import ContactSection from './ContactSection'
import CtaSection from './CtaSection'
import EducationBanner from './EducationBanner'

const emptyHome: PortfolioHomeData = {
  sections: [],
  services: [],
  featured_projects: [],
  showreel: [],
  testimonials: [],
  case_studies: [],
  zenda: {},
  settings: {},
}

export default function HomePage() {
  const { locale } = useLocale()
  const [data, setData] = useState<PortfolioHomeData>(emptyHome)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    portfolioApi
      .getHome(locale)
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch(() => {
        if (!cancelled) setData(emptyHome)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [locale])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-slate-950">
        <div className="w-10 h-10 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <HeroSection />
      <AboutSection />
      <ServicesSection services={data.services} />
      <PortfolioGrid projects={data.featured_projects} />
      <ShowreelSection videos={data.showreel} />
      <ZendaSection zenda={data.zenda} />
      <CaseStudiesSection caseStudies={data.case_studies} />
      <TestimonialsSection testimonials={data.testimonials} />
      <CtaSection />
      <EducationBanner />
      <ContactSection settings={data.settings} />
    </>
  )
}

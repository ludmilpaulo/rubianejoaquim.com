'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/contexts/LocaleContext'
import { publicApi } from '@/lib/public-api'
import type { PublicHomepageData } from '@/lib/public-types'
import { buildHomeContext, isSectionVisible } from '@/lib/cms'
import HeroSection from './HeroSection'
import AboutSection from './AboutSection'
import ServicesSection from './ServicesSection'
import FeaturedPortfolioSection from './FeaturedPortfolioSection'
import ShowreelSection from './ShowreelSection'
import ZendaSection from './ZendaSection'
import CaseStudiesSection from './CaseStudiesSection'
import TestimonialsSection from './TestimonialsSection'
import EducationBanner from './EducationBanner'
import ResourcesSection from './ResourcesSection'
import FaqNewsletterSection from './FaqNewsletterSection'
import FinalContactCta from './FinalContactCta'
import ContactSection from './ContactSection'

const emptyHome: PublicHomepageData = {
  sections: [],
  section_visibility: {},
  services: [],
  featured_projects: [],
  showreel: [],
  testimonials: [],
  case_studies: [],
  statistics: [],
  resources: [],
  navigation: [],
  faqs: [],
  zenda: {},
  settings: {},
  seo: {},
}

function HomeLoading() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="h-[100svh] cinematic-hero animate-pulse" />
      <div className="max-w-7xl mx-auto px-4 py-24 space-y-8">
        <div className="h-8 w-48 bg-white/5 rounded-lg mx-auto" />
        <div className="grid sm:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-white/5 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

function HomeApiError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="min-h-[40vh] flex flex-col items-center justify-center px-4 bg-slate-950 text-center">
      <p className="text-slate-400 max-w-md">
        Content could not be loaded from the server. Check that the API is running.
      </p>
      <button type="button" onClick={onRetry} className="btn-primary mt-6">
        Retry
      </button>
    </div>
  )
}

export default function HomePage() {
  const { locale } = useLocale()
  const [data, setData] = useState<PublicHomepageData>(emptyHome)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const load = () => {
    setLoading(true)
    setLoadError(false)
    publicApi
      .getHomepage(locale)
      .then((res) => setData(res))
      .catch(() => {
        setData(emptyHome)
        setLoadError(true)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [locale])

  if (loading) return <HomeLoading />
  if (loadError && !data.sections.length) return <HomeApiError onRetry={load} />

  const ctx = buildHomeContext(data)
  const primaryShowreel = data.showreel.find((v) => v.is_primary) ?? data.showreel[0] ?? null
  const settings =
    data.settings && 'contact_email' in data.settings ? data.settings : undefined

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen">
      {isSectionVisible(ctx.visibility, 'hero') && (
        <HeroSection
          section={ctx.hero}
          showreel={primaryShowreel}
          settings={settings}
          statistics={data.statistics}
        />
      )}
      {isSectionVisible(ctx.visibility, 'showreel') && (
        <ShowreelSection videos={data.showreel} intro={ctx.showreelIntro} />
      )}
      {isSectionVisible(ctx.visibility, 'about') && (
        <AboutSection section={ctx.about} statistics={data.statistics} />
      )}
      {isSectionVisible(ctx.visibility, 'services_intro') && (
        <ServicesSection services={data.services} intro={ctx.servicesIntro} />
      )}
      {isSectionVisible(ctx.visibility, 'portfolio_intro') && (
        <FeaturedPortfolioSection
          projects={data.featured_projects}
          intro={ctx.portfolioIntro}
        />
      )}
      {isSectionVisible(ctx.visibility, 'zenda') && (
        <ZendaSection zenda={data.zenda} intro={ctx.zendaIntro} settings={settings} />
      )}
      {isSectionVisible(ctx.visibility, 'case_studies_intro') && (
        <CaseStudiesSection caseStudies={data.case_studies} intro={ctx.caseStudiesIntro} />
      )}
      {isSectionVisible(ctx.visibility, 'testimonials_intro') && (
        <TestimonialsSection testimonials={data.testimonials} intro={ctx.testimonialsIntro} />
      )}
      {isSectionVisible(ctx.visibility, 'education') && (
        <EducationBanner section={ctx.education} />
      )}
      {isSectionVisible(ctx.visibility, 'resources_intro') && (
        <ResourcesSection resources={data.resources} intro={ctx.resourcesIntro} />
      )}
      {isSectionVisible(ctx.visibility, 'faq_newsletter') && (
        <FaqNewsletterSection faqs={data.faqs} intro={ctx.faqNewsletter} />
      )}
      {isSectionVisible(ctx.visibility, 'final_cta') && (
        <FinalContactCta section={ctx.finalCta} settings={data.settings} />
      )}
      {isSectionVisible(ctx.visibility, 'contact_intro') && (
        <ContactSection settings={data.settings} />
      )}
    </div>
  )
}

import type { HomeSection, PublicHomepageData } from './public-types'

export function sectionByKey(
  sections: HomeSection[],
  key: string,
): HomeSection | undefined {
  return sections.find((s) => s.section_key === key)
}

export function isSectionVisible(
  visibility: Record<string, boolean> | undefined,
  key: string,
): boolean {
  if (!visibility || !(key in visibility)) return true
  return visibility[key] !== false
}

export function ctaFromExtra(
  section: HomeSection | undefined,
  key: string,
): { label: string; url: string; variant?: string } | null {
  if (!section?.extra_data?.ctas || !Array.isArray(section.extra_data.ctas)) return null
  const ctas = section.extra_data.ctas as { key: string; label: string; url: string; variant?: string }[]
  return ctas.find((c) => c.key === key) ?? null
}

export function listFromExtra(section: HomeSection | undefined, key: string): string[] {
  const raw = section?.extra_data?.[key]
  if (Array.isArray(raw)) return raw.map(String)
  return []
}

export function buildHomeContext(data: PublicHomepageData) {
  return {
    hero: sectionByKey(data.sections, 'hero'),
    about: sectionByKey(data.sections, 'about'),
    servicesIntro: sectionByKey(data.sections, 'services_intro'),
    portfolioIntro: sectionByKey(data.sections, 'portfolio_intro'),
    showreelIntro: sectionByKey(data.sections, 'showreel'),
    zendaIntro: sectionByKey(data.sections, 'zenda'),
    caseStudiesIntro: sectionByKey(data.sections, 'case_studies_intro'),
    testimonialsIntro: sectionByKey(data.sections, 'testimonials_intro'),
    education: sectionByKey(data.sections, 'education'),
    resourcesIntro: sectionByKey(data.sections, 'resources_intro'),
    faqNewsletter: sectionByKey(data.sections, 'faq_newsletter'),
    contactIntro: sectionByKey(data.sections, 'contact_intro'),
    finalCta: sectionByKey(data.sections, 'final_cta'),
    statistics: sectionByKey(data.sections, 'statistics'),
    visibility: data.section_visibility,
  }
}

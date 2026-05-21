/** Public CMS types — all content from Django /api/public/ */

export type PortfolioCategory =
  | 'campaign_videos'
  | 'interviews'
  | 'social_reels'
  | 'canva_designs'
  | 'scriptwriting'
  | 'zenda_content'

export interface HomeCta {
  key: string
  label: string
  url: string
  variant?: string
}

export interface EducationCard {
  title: string
  description: string
  href: string
  cta: string
}

export interface HomeSection {
  id: number
  section_key: string
  is_active: boolean
  title: string
  subtitle: string
  body: string
  cta_label: string
  badge?: string
  roles?: string[]
  ctas?: HomeCta[]
  trust_items?: string[]
  cards?: EducationCard[]
  category_labels?: Record<string, string>
  extra_data?: Record<string, unknown>
}

export interface PortfolioService {
  id: number
  slug?: string
  icon: string
  category?: string
  image_url?: string | null
  title: string
  description: string
  short_description?: string
  full_description?: string
  features?: string[]
  cta_text?: string
  cta_link?: string
  is_featured?: boolean
  order?: number
}

export interface PortfolioProject {
  id: number
  category: PortfolioCategory
  category_label?: string
  slug: string
  thumbnail_url: string | null
  video_url: string
  external_url: string
  client_name: string
  tools_used: string
  is_featured: boolean
  title: string
  description: string
  role: string
}

export interface Testimonial {
  id: number
  client_name: string
  client_role: string
  client_company: string
  avatar_url: string | null
  rating: number
  quote: string
}

export interface ShowreelVideo {
  id: number
  title: string
  description: string
  youtube_url: string
  is_primary: boolean
}

export interface CaseStudy {
  id: number
  slug: string
  client_name: string
  image_url: string | null
  tools_used: string
  title: string
  goal: string
  role: string
  result: string
}

export interface ZendaFeature {
  id: number
  icon: string
  image_url?: string | null
  category: string
  title: string
  description: string
  is_premium?: boolean
}

export interface ZendaContent {
  headline: string
  subheadline: string
  what_is: string
  who_it_helps: string
  benefits: string[]
  features?: ZendaFeature[]
  app_store_url: string
  play_store_url: string
  monthly_price_kz: string | number
  screenshots: { id: number; image_url: string | null; caption: string }[]
}

export interface ContactFormLabels {
  name?: string
  email?: string
  phone?: string
  subject?: string
  message?: string
  service_interest?: string
  budget_range?: string
  project_type?: string
  submit?: string
  submitting?: string
  success?: string
  error?: string
  required?: string
  whatsapp_label?: string
  email_label?: string
}

export interface SiteSettings {
  contact_email: string
  whatsapp_number: string
  phone: string
  instagram_url?: string
  linkedin_url?: string
  youtube_url?: string
  tiktok_url?: string
  calendly_url?: string
  og_image_url?: string | null
  brand_name?: string
  brand_tagline?: string
  footer_description?: string
  footer_rights?: string
  contact_label?: string
  contact_title?: string
  contact_subtitle?: string
  footer_navigation?: string
  footer_contact?: string
  contact_form?: ContactFormLabels
  play_store_label?: string
  app_store_label?: string
  what_is_label?: string
  who_label?: string
}

export interface NavItem {
  id: number
  url: string
  label: string
  placement: string
  open_in_new_tab: boolean
  order: number
}

export interface FAQ {
  id: number
  category: string
  question: string
  answer: string
  order: number
}

export interface Resource {
  id: number
  slug: string
  resource_type: string
  category: string
  title: string
  description: string
  thumbnail_url?: string | null
  file_url?: string | null
  video_url?: string
  is_featured: boolean
}

export interface HomepageStatistic {
  id: number
  value: string
  icon: string
  label: string
}

export interface PageSEO {
  page_key: string
  title?: string
  description?: string
  keywords?: string
  og_title?: string
  og_description?: string
  canonical_path?: string
  og_image_url?: string | null
}

export interface PublicHomepageData {
  sections: HomeSection[]
  section_visibility: Record<string, boolean>
  services: PortfolioService[]
  featured_projects: PortfolioProject[]
  showreel: ShowreelVideo[]
  testimonials: Testimonial[]
  case_studies: CaseStudy[]
  statistics: HomepageStatistic[]
  resources: Resource[]
  navigation: NavItem[]
  faqs: FAQ[]
  zenda: ZendaContent | Record<string, never>
  settings: SiteSettings | Record<string, never>
  seo: PageSEO | Record<string, never>
}

export interface ContactFormData {
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  service_interest?: string
  budget_range?: string
  project_type?: string
  source_page?: string
  locale?: string
}

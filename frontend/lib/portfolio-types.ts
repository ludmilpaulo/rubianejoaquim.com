export type PortfolioCategory =
  | 'campaign_videos'
  | 'interviews'
  | 'social_reels'
  | 'canva_designs'
  | 'scriptwriting'
  | 'zenda_content'

export interface PortfolioProject {
  id: number
  category: PortfolioCategory
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

export interface PortfolioService {
  id: number
  icon: string
  title: string
  description: string
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

export interface ZendaContent {
  id?: number
  headline: string
  subheadline: string
  what_is: string
  who_it_helps: string
  benefits: string[]
  app_store_url: string
  play_store_url: string
  monthly_price_kz: string | number
  screenshots: { id: number; image_url: string | null; caption: string }[]
}

export interface SiteSettings {
  contact_email: string
  whatsapp_number: string
  phone: string
  instagram_url?: string
  linkedin_url?: string
  youtube_url?: string
  tiktok_url?: string
}

export interface PortfolioHomeData {
  sections: { section_key: string; title: string; subtitle: string; body: string; cta_label: string }[]
  services: PortfolioService[]
  featured_projects: PortfolioProject[]
  showreel: ShowreelVideo[]
  testimonials: Testimonial[]
  case_studies: CaseStudy[]
  zenda: ZendaContent | Record<string, never>
  settings: SiteSettings | Record<string, never>
}

export interface ContactFormData {
  name: string
  email: string
  phone?: string
  subject: string
  message: string
  locale?: string
}

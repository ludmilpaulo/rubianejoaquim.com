import type { PortfolioCategory } from './public-types'

const LABELS: Record<PortfolioCategory, string> = {
  campaign_videos: 'Campaign Videos',
  interviews: 'Interviews',
  social_reels: 'Social Media Reels',
  canva_designs: 'Canva Designs',
  scriptwriting: 'Scriptwriting',
  zenda_content: 'Zenda Content',
}

export function portfolio_category_label(cat: PortfolioCategory): string {
  return LABELS[cat] ?? cat.replace(/_/g, ' ')
}

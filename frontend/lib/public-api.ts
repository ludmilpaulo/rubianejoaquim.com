import api from './api'
import type {
  PublicHomepageData,
  PortfolioProject,
  PortfolioService,
  ContactFormData,
  PortfolioCategory,
  ZendaContent,
  PageSEO,
  FAQ,
  Resource,
  NavItem,
  SiteSettings,
} from './public-types'
import type { Locale } from './i18n/config'

function langParam(locale: Locale) {
  return { params: { lang: locale } }
}

function unwrapList<T>(data: T[] | { results?: T[] }): T[] {
  if (Array.isArray(data)) return data
  return data.results ?? []
}

/** Public CMS API — prefer /api/public/, falls back to /api/portfolio/ paths */
const BASE = '/public'

export const publicApi = {
  getHomepage: async (locale: Locale): Promise<PublicHomepageData> => {
    const { data } = await api.get<PublicHomepageData>(`${BASE}/homepage/`, langParam(locale))
    return data
  },

  getSiteSettings: async (locale: Locale): Promise<SiteSettings> => {
    const { data } = await api.get<SiteSettings>(`${BASE}/site-settings/`, langParam(locale))
    return data
  },

  getNavigation: async (locale: Locale, placement?: string): Promise<NavItem[]> => {
    const { data } = await api.get<NavItem[] | { results?: NavItem[] }>(`${BASE}/navigation/`, {
      params: { lang: locale, placement },
    })
    return unwrapList(data)
  },

  getServices: async (locale: Locale, featured?: boolean): Promise<PortfolioService[]> => {
    const { data } = await api.get<PortfolioService[] | { results?: PortfolioService[] }>(
      `${BASE}/services/`,
      { params: { lang: locale, featured: featured ? 'true' : undefined } },
    )
    return unwrapList(data)
  },

  getService: async (slug: string, locale: Locale): Promise<PortfolioService> => {
    const { data } = await api.get<PortfolioService>(`${BASE}/services/${slug}/`, langParam(locale))
    return data
  },

  /** @alias getPortfolio */
  getProjects: async (
    locale: Locale,
    options?: { category?: PortfolioCategory; featured?: boolean },
  ): Promise<PortfolioProject[]> => {
    return publicApi.getPortfolio(locale, options)
  },

  getPortfolio: async (
    locale: Locale,
    options?: { category?: PortfolioCategory; featured?: boolean },
  ): Promise<PortfolioProject[]> => {
    const { data } = await api.get<PortfolioProject[] | { results?: PortfolioProject[] }>(
      `${BASE}/projects/`,
      {
        params: {
          lang: locale,
          category: options?.category,
          featured: options?.featured ? 'true' : undefined,
        },
      },
    )
    return unwrapList(data)
  },

  getProject: async (slug: string, locale: Locale): Promise<PortfolioProject> => {
    const { data } = await api.get<PortfolioProject>(`${BASE}/projects/${slug}/`, langParam(locale))
    return data
  },

  getZenda: async (locale: Locale): Promise<ZendaContent | Record<string, never>> => {
    const { data } = await api.get<ZendaContent | Record<string, never>>(`${BASE}/zenda/`, langParam(locale))
    return data
  },

  getFaqs: async (locale: Locale, category?: string): Promise<FAQ[]> => {
    const { data } = await api.get<FAQ[] | { results?: FAQ[] }>(`${BASE}/faqs/`, {
      params: { lang: locale, category },
    })
    return unwrapList(data)
  },

  getResources: async (locale: Locale, featured?: boolean): Promise<Resource[]> => {
    const { data } = await api.get<Resource[] | { results?: Resource[] }>(`${BASE}/resources/`, {
      params: { lang: locale, featured: featured ? 'true' : undefined },
    })
    return unwrapList(data)
  },

  getPageSeo: async (pageKey: string, locale: Locale): Promise<PageSEO | null> => {
    try {
      const { data } = await api.get<PageSEO>(`${BASE}/page-seo/${pageKey}/`, langParam(locale))
      return data
    } catch {
      return null
    }
  },

  sendContact: async (payload: ContactFormData) => {
    const { data } = await api.post(`${BASE}/contact/`, payload)
    return data
  },

  subscribeNewsletter: async (email: string, locale: Locale) => {
    const { data } = await api.post(`${BASE}/newsletter/`, { email, locale })
    return data
  },
}

/** Re-export for gradual migration from portfolio-api */
export { publicApi as portfolioApi }

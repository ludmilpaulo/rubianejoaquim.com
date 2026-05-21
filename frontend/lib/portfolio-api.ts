import api from './api'
import type {
  PortfolioHomeData,
  PortfolioProject,
  ContactFormData,
  PortfolioCategory,
} from './portfolio-types'
import type { Locale } from './i18n/config'

function langParam(locale: Locale) {
  return { params: { lang: locale } }
}

export const portfolioApi = {
  getHome: async (locale: Locale): Promise<PortfolioHomeData> => {
    const { data } = await api.get<PortfolioHomeData>('/portfolio/home/', langParam(locale))
    return data
  },

  getProjects: async (
    locale: Locale,
    options?: { category?: PortfolioCategory; featured?: boolean },
  ): Promise<PortfolioProject[]> => {
    const { data } = await api.get<{ results?: PortfolioProject[] } | PortfolioProject[]>(
      '/portfolio/projects/',
      {
        params: {
          lang: locale,
          category: options?.category,
          featured: options?.featured ? 'true' : undefined,
        },
      },
    )
    if (Array.isArray(data)) return data
    return data.results ?? []
  },

  getProject: async (slug: string, locale: Locale): Promise<PortfolioProject> => {
    const { data } = await api.get<PortfolioProject>(
      `/portfolio/projects/${slug}/`,
      langParam(locale),
    )
    return data
  },

  sendContact: async (payload: ContactFormData) => {
    const { data } = await api.post('/portfolio/contact/', payload)
    return data
  },
}

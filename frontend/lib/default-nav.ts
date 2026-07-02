import type { NavItem } from './public-types'
import type { Locale } from './i18n/config'

const LABELS: Record<Locale, Record<string, string>> = {
  pt: { home: 'Início', portfolio: 'Portfólio', courses: 'Cursos', zenda: 'Zenda', contact: 'Contacto' },
  en: { home: 'Home', portfolio: 'Portfolio', courses: 'Courses', zenda: 'Zenda', contact: 'Contact' },
  fr: { home: 'Accueil', portfolio: 'Portfolio', courses: 'Cours', zenda: 'Zenda', contact: 'Contact' },
  es: { home: 'Inicio', portfolio: 'Portafolio', courses: 'Cursos', zenda: 'Zenda', contact: 'Contacto' },
}

/** Client-side fallback when CMS navigation API returns no items. */
export function defaultNavItems(locale: Locale): NavItem[] {
  const labels = LABELS[locale] ?? LABELS.pt
  const specs: Array<{ id: number; url: string; order: number; placement: NavItem['placement']; key: keyof typeof labels }> = [
    { id: -1, url: '/', order: 0, placement: 'both', key: 'home' },
    { id: -2, url: '/portfolio', order: 1, placement: 'header', key: 'portfolio' },
    { id: -3, url: '/cursos', order: 2, placement: 'header', key: 'courses' },
    { id: -4, url: '/zenda', order: 3, placement: 'header', key: 'zenda' },
    { id: -5, url: '/contact', order: 4, placement: 'header', key: 'contact' },
  ]

  return specs.map((spec) => ({
    id: spec.id,
    url: spec.url,
    order: spec.order,
    placement: spec.placement,
    open_in_new_tab: false,
    label: labels[spec.key],
  }))
}

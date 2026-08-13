/**
 * Routes that use Zenda product chrome (light financial UI)
 * vs Rubiane cinema chrome on the public homepage.
 */
export const ZENDA_PRODUCT_PREFIXES = [
  '/login',
  '/area-do-aluno',
  '/admin',
  '/cursos',
  '/aulas',
  '/mentoria',
  '/certificado',
  '/delete-account',
  '/support',
  '/privacy-policy',
  '/legal',
  '/conteudos-gratis',
] as const

export const ZENDA_MARKETING_PREFIXES = ['/zenda', '/download'] as const

export type ZendaChrome = 'cinema' | 'product' | 'marketing'

export function getZendaChrome(pathname: string): ZendaChrome {
  if (ZENDA_MARKETING_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return 'marketing'
  }
  if (ZENDA_PRODUCT_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return 'product'
  }
  return 'cinema'
}

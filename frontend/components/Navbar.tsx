'use client'

import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations, useLocale } from '@/contexts/LocaleContext'
import { useSiteData, navByPlacement } from '@/contexts/SiteDataContext'
import { defaultNavItems } from '@/lib/default-nav'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import ZendaLogo from '@/components/zenda/ZendaLogo'
import { getZendaChrome } from '@/lib/zenda-routes'

export default function Navbar() {
  const { user, logout, checkAuth, isLoading } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname() || '/'
  const t = useTranslations()
  const { navigation, settings } = useSiteData()
  const { locale } = useLocale()
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const chrome = getZendaChrome(pathname)

  useEffect(() => {
    setMounted(true)
    checkAuth()
  }, [checkAuth])

  if (pathname.startsWith('/admin/subscriptions')) {
    return null
  }

  const handleLogout = () => {
    logout()
    setMobileMenuOpen(false)
    router.push('/')
  }

  const showLoading = mounted && isLoading
  const showUser = mounted && !isLoading && user
  const navLinks = navByPlacement(navigation.length > 0 ? navigation : defaultNavItems(locale), 'header')
  const brandName = settings.brand_tagline ? 'Rubiane Joaquim' : 'Rubiane Joaquim'
  const workCta = navLinks.find((l) => l.url.includes('contact'))?.label || 'Contact'

  const isProduct = chrome === 'product'
  const isMarketing = chrome === 'marketing'

  const linkClass = isProduct
    ? 'text-zenda-navy/80 hover:text-zenda-primary text-sm font-medium transition-colors'
    : 'text-slate-300 hover:text-zenda-growth text-sm font-medium transition-colors'

  const renderLinks = () =>
    navLinks.map((link) => (
      <Link
        key={`${link.id}-${link.url}`}
        href={link.url}
        target={link.open_in_new_tab ? '_blank' : undefined}
        rel={link.open_in_new_tab ? 'noopener noreferrer' : undefined}
        className={linkClass}
        onClick={() => setMobileMenuOpen(false)}
      >
        {link.label}
      </Link>
    ))

  const navClass = isProduct
    ? 'bg-white/95 backdrop-blur-xl border-b border-zenda-border sticky top-0 z-50'
    : isMarketing
      ? 'bg-zenda-deep/90 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50'
      : 'bg-slate-950/90 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50'

  return (
    <nav
      className={navClass}
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))' }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16 gap-2 min-w-0">
          {isProduct || isMarketing ? (
            <Link href="/zenda" className="flex items-center gap-2 min-w-0">
              <ZendaLogo size="sm" variant="icon" className="!rounded-lg w-8 h-8 sm:w-9 sm:h-9" />
              <span
                className={`text-sm sm:text-lg font-bold truncate ${
                  isProduct ? 'text-zenda-navy' : 'text-white'
                }`}
              >
                Zenda
              </span>
            </Link>
          ) : (
            <Link href="/" className="text-sm sm:text-lg font-display font-bold text-white hover:text-zenda-growth truncate">
              {brandName.split('|')[0]?.trim() || brandName}
            </Link>
          )}

          <div className="hidden lg:flex items-center gap-6">
            {isProduct ? (
              <>
                <Link href="/cursos" className={linkClass}>{t('nav.courses')}</Link>
                <Link href="/mentoria" className={linkClass}>{t('nav.mentorship')}</Link>
                <Link href="/zenda" className={linkClass}>{t('nav.zenda')}</Link>
                {user?.is_instructor ? (
                  <Link href="/instructor" className={linkClass}>{t('education.goDashboard')}</Link>
                ) : user ? (
                  <Link href="/instructor/apply" className={linkClass}>{t('education.applyCta')}</Link>
                ) : null}
              </>
            ) : (
              renderLinks()
            )}
            <LanguageSwitcher variant={isProduct ? 'product' : 'cinema'} />
            {showLoading ? (
              <div className="zenda-spinner zenda-spinner-sm" />
            ) : showUser && user ? (
              <>
                {user.is_admin && (
                  <Link href="/admin" className={linkClass}>
                    {t('nav.admin')}
                  </Link>
                )}
                {!user.is_admin && (
                  <Link href="/area-do-aluno" className={linkClass}>
                    {t('nav.studentArea')}
                  </Link>
                )}
                <button type="button" onClick={handleLogout} className={linkClass}>
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className={isProduct ? 'btn-zenda !py-2 !px-4 text-sm' : linkClass}>
                  {t('nav.login')}
                </Link>
                {!isProduct && (
                  <Link href="/contact" className="btn-primary !py-2 !px-4 text-sm">
                    {workCta}
                  </Link>
                )}
              </>
            )}
          </div>

          <div className="lg:hidden flex items-center gap-2">
            <LanguageSwitcher variant={isProduct ? 'product' : 'cinema'} />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`touch-target p-2 rounded-lg ${isProduct ? 'text-zenda-navy' : 'text-slate-300'}`}
              aria-label="Menu"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className={`lg:hidden py-4 ${isProduct ? 'border-t border-zenda-border' : 'border-t border-white/5'}`}>
            <div className="flex flex-col gap-1">
              {isProduct ? (
                <>
                  <Link href="/cursos" className={`${linkClass} py-2`} onClick={() => setMobileMenuOpen(false)}>Cursos</Link>
                  <Link href="/zenda" className={`${linkClass} py-2`} onClick={() => setMobileMenuOpen(false)}>App</Link>
                </>
              ) : (
                renderLinks()
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

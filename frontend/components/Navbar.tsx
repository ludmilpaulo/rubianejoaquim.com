'use client'

import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from '@/contexts/LocaleContext'
import { useSiteData, navByPlacement } from '@/contexts/SiteDataContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function Navbar() {
  const { user, logout, checkAuth, isLoading } = useAuthStore()
  const router = useRouter()
  const t = useTranslations()
  const { navigation, settings } = useSiteData()
  const [mounted, setMounted] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    setMounted(true)
    checkAuth()
  }, [checkAuth])

  const handleLogout = () => {
    logout()
    setMobileMenuOpen(false)
    router.push('/')
  }

  const showLoading = mounted && isLoading
  const showUser = mounted && !isLoading && user
  const navLinks = navByPlacement(navigation, 'header')
  const brandName = settings.brand_tagline ? 'Rubiane Joaquim' : 'Rubiane Joaquim'
  const workCta = navLinks.find((l) => l.url.includes('contact'))?.label || 'Contact'

  const renderLinks = () =>
    navLinks.map((link) => (
      <Link
        key={`${link.id}-${link.url}`}
        href={link.url}
        target={link.open_in_new_tab ? '_blank' : undefined}
        rel={link.open_in_new_tab ? 'noopener noreferrer' : undefined}
        className="text-slate-300 hover:text-amber-300 text-sm font-medium transition-colors"
        onClick={() => setMobileMenuOpen(false)}
      >
        {link.label}
      </Link>
    ))

  return (
    <nav
      className="bg-slate-950/90 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50"
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))' }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16 gap-2 min-w-0">
          <Link href="/" className="text-sm sm:text-lg font-display font-bold text-white hover:text-amber-300 truncate">
            {brandName.split('|')[0]?.trim() || brandName}
          </Link>

          <div className="hidden lg:flex items-center gap-6">
            {renderLinks()}
            <LanguageSwitcher />
            {showLoading ? (
              <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            ) : showUser && user ? (
              <>
                {user.is_admin && (
                  <Link href="/admin" className="text-slate-300 hover:text-amber-300 text-sm">
                    {t('nav.admin')}
                  </Link>
                )}
                {!user.is_admin && (
                  <Link href="/area-do-aluno" className="text-slate-300 hover:text-amber-300 text-sm">
                    {t('nav.studentArea')}
                  </Link>
                )}
                <button type="button" onClick={handleLogout} className="text-slate-300 hover:text-amber-300 text-sm">
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-slate-300 hover:text-amber-300 text-sm">
                  {t('nav.login')}
                </Link>
                <Link href="/contact" className="btn-primary !py-2 !px-4 text-sm">
                  {workCta}
                </Link>
              </>
            )}
          </div>

          <div className="lg:hidden flex items-center gap-2">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="touch-target p-2 rounded-lg text-slate-300"
              aria-label="Menu"
            >
              {mobileMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/5 py-4">
            <div className="flex flex-col gap-1">{renderLinks()}</div>
          </div>
        )}
      </div>
    </nav>
  )
}

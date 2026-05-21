'use client'

import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from '@/contexts/LocaleContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function Navbar() {
  const { user, logout, checkAuth, isLoading } = useAuthStore()
  const router = useRouter()
  const t = useTranslations()
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
  const showGuest = mounted && !isLoading && !user

  const navLinks = [
    { href: '/#services', label: t('nav.services') },
    { href: '/portfolio', label: t('nav.portfolio') },
    { href: '/zenda', label: t('nav.zenda') },
    { href: '/contact', label: t('nav.contact') },
    { href: '/cursos', label: t('nav.courses') },
  ]

  return (
    <nav
      className="bg-slate-950/90 backdrop-blur-xl border-b border-white/5 sticky top-0 z-50"
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))' }}
    >
      <div
        className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8"
        style={{
          paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0.75rem))',
          paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0.75rem))',
        }}
      >
        <div className="flex justify-between items-center h-14 sm:h-16 md:h-18 gap-2 min-w-0">
          <Link
            href="/"
            className="text-sm sm:text-lg font-display font-bold text-white hover:text-amber-300 transition-colors truncate min-w-0"
          >
            {t('brand.name')}
          </Link>

          <div className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-slate-300 hover:text-amber-300 text-sm font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <LanguageSwitcher />
            {showLoading ? (
              <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            ) : showUser && user ? (
              <>
                {user.is_admin ? (
                  <Link href="/admin" className="text-slate-300 hover:text-amber-300 text-sm">
                    {t('nav.admin')}
                  </Link>
                ) : (
                  <Link href="/area-do-aluno" className="text-slate-300 hover:text-amber-300 text-sm">
                    {t('nav.studentArea')}
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-slate-300 hover:text-amber-300 text-sm"
                >
                  {t('nav.logout')}
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-slate-300 hover:text-amber-300 text-sm">
                  {t('nav.login')}
                </Link>
                <Link href="/contact" className="btn-primary !py-2 !px-4 text-sm">
                  {t('nav.workWithMe')}
                </Link>
              </>
            )}
          </div>

          <div className="lg:hidden flex items-center gap-2">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="touch-target p-2 rounded-lg text-slate-300 hover:text-amber-300"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/5 py-4 animate-fade-in">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-300 hover:text-amber-300 px-4 py-3 rounded-lg hover:bg-white/5"
                >
                  {link.label}
                </Link>
              ))}
              {showUser && user ? (
                <>
                  {user.is_admin ? (
                    <Link href="/admin" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-slate-300">
                      {t('nav.admin')}
                    </Link>
                  ) : (
                    <Link href="/area-do-aluno" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-slate-300">
                      {t('nav.studentArea')}
                    </Link>
                  )}
                  <button type="button" onClick={handleLogout} className="text-left px-4 py-3 text-slate-300">
                    {t('nav.logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="px-4 py-3 text-slate-300">
                    {t('nav.login')}
                  </Link>
                  <Link href="/contact" onClick={() => setMobileMenuOpen(false)} className="mx-4 mt-2 btn-primary text-center">
                    {t('nav.workWithMe')}
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

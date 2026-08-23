'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { useTranslations } from '@/contexts/LocaleContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import ZendaLogo from '@/components/zenda/ZendaLogo'
import './ops.css'

const THEME_KEY = 'zenda-ops-theme'

const NAV = [
  { href: '/admin', key: 'adminSubs.nav.dashboard' },
  { href: '/admin/users', key: 'adminSubs.nav.users' },
  { href: '/admin/subscriptions', key: 'adminSubs.nav.subscriptions' },
  { href: '/admin/payments', key: 'adminSubs.nav.payments' },
  { href: '/admin/subscriptions#verification', key: 'adminSubs.nav.transactions' },
  { href: '/admin/analytics', key: 'adminSubs.nav.analytics' },
  { href: '/admin/cms/settings', key: 'adminSubs.nav.settings' },
  { href: '/admin/settings/payments', key: 'adminSubs.nav.paymentSettings' },
  { href: '/admin/settings/email', key: 'adminSubs.nav.emailSettings' },
] as const

export default function OpsShell({
  children,
  notificationCount = 0,
}: {
  children: React.ReactNode
  notificationCount?: number
}) {
  const t = useTranslations()
  const pathname = usePathname() || ''
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [menuOpen, setMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_KEY)
    if (stored === 'dark' || stored === 'light') setTheme(stored)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    window.localStorage.setItem(THEME_KEY, next)
  }

  const initials =
    `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.trim() ||
    user?.email?.[0]?.toUpperCase() ||
    'A'

  return (
    <div className="zenda-ops" data-theme={theme}>
      <header
        className="sticky top-0 z-40 border-b"
        style={{ background: 'var(--ops-header)', borderColor: 'var(--ops-border)' }}
      >
        <div className="max-w-[1440px] mx-auto px-4 lg:px-6 h-16 flex items-center gap-3">
          <button
            type="button"
            className="lg:hidden ops-btn ops-btn-ghost px-2"
            aria-label={t('adminSubs.nav.menu')}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Link href="/admin/subscriptions" className="flex items-center gap-2 shrink-0">
            <ZendaLogo size="sm" variant="icon" className="!rounded-lg w-8 h-8" />
            <span className="font-bold hidden sm:inline" style={{ color: 'var(--ops-text)' }}>
              Zenda
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
            {NAV.map((item) => {
              const active = item.href === '/admin/subscriptions'
                ? pathname.startsWith('/admin/subscriptions')
                : pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap"
                  style={{
                    color: active ? '#fff' : 'var(--ops-muted)',
                    background: active ? 'var(--ops-primary)' : 'transparent',
                  }}
                >
                  {t(item.key)}
                </Link>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher variant="product" />
            <button
              type="button"
              onClick={toggleTheme}
              className="ops-btn ops-btn-ghost px-2.5"
              aria-label={theme === 'dark' ? t('adminSubs.theme.light') : t('adminSubs.theme.dark')}
            >
              {theme === 'dark' ? '☀' : '🌙'}
            </button>
            <Link
              href="/admin/subscriptions#verification"
              className="relative ops-btn ops-btn-ghost px-2.5"
              aria-label={t('adminSubs.nav.notifications')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {notificationCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[1.1rem] h-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center"
                  style={{ background: 'var(--ops-danger)' }}
                >
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </Link>
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((v) => !v)}
                className="w-9 h-9 rounded-full text-white text-sm font-semibold"
                style={{ background: 'var(--ops-primary)' }}
                aria-label={t('adminSubs.nav.admin')}
              >
                {initials}
              </button>
              {profileOpen && (
                <div className="ops-card absolute right-0 mt-2 w-56 p-3 z-50">
                  <p className="text-sm font-semibold truncate">{user?.first_name || user?.email}</p>
                  <p className="text-xs truncate mb-3" style={{ color: 'var(--ops-muted)' }}>
                    {user?.email}
                  </p>
                  <button
                    type="button"
                    className="ops-btn ops-btn-ghost w-full"
                    onClick={() => {
                      logout()
                      router.push('/login')
                    }}
                  >
                    {t('adminSubs.nav.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="lg:hidden border-t px-4 py-3 space-y-1" style={{ borderColor: 'var(--ops-border)' }}>
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-3 py-2 rounded-lg text-sm"
                onClick={() => setMenuOpen(false)}
              >
                {t(item.key)}
              </Link>
            ))}
          </div>
        )}
      </header>
      <div className="max-w-[1440px] mx-auto px-4 lg:px-6 py-6 lg:py-8">{children}</div>
    </div>
  )
}

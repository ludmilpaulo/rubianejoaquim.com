'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from '@/contexts/LocaleContext'
import { useAuthStore } from '@/lib/store'
import ZendaLogo from '@/components/zenda/ZendaLogo'
import LanguageSwitcher from '@/components/LanguageSwitcher'

const NAV = [
  { href: '/instructor', key: 'education.goDashboard' },
  { href: '/instructor/courses', key: 'education.myContent' },
  { href: '/instructor/students', key: 'education.students' },
  { href: '/instructor/revenue', key: 'education.revenue' },
  { href: '/cursos', key: 'education.marketplace' },
] as const

export default function EducationShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations()
  const pathname = usePathname() || ''
  const { user } = useAuthStore()
  const name = user?.first_name || user?.email || ''

  return (
    <div className="min-h-screen bg-zenda-bg">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-zenda-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link href="/instructor" className="flex items-center gap-2">
            <ZendaLogo size="sm" variant="icon" className="!rounded-lg w-8 h-8" />
            <span className="font-semibold text-zenda-navy hidden sm:inline">{t('education.goDashboard')}</span>
          </Link>
          <nav className="hidden md:flex items-center gap-4 text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`font-medium ${
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? 'text-zenda-primary'
                    : 'text-zenda-navy/70 hover:text-zenda-primary'
                }`}
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-sm text-zenda-navy/70 hidden sm:inline">{name}</span>
            <LanguageSwitcher />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}

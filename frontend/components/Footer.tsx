'use client'

import Link from 'next/link'
import { useTranslations } from '@/contexts/LocaleContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'

const WHATSAPP_NUMBER = '244944905246'
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`

export default function Footer() {
  const t = useTranslations()

  const navLinks = [
    { href: '/portfolio', label: t('nav.portfolio') },
    { href: '/#services', label: t('nav.services') },
    { href: '/zenda', label: t('nav.zenda') },
    { href: '/contact', label: t('nav.contact') },
    { href: '/cursos', label: t('nav.courses') },
    { href: '/mentoria', label: t('nav.mentorship') },
    { href: '/conteudos-gratis', label: t('nav.freeContent') },
  ]

  return (
    <footer className="bg-slate-950 text-white mt-0 relative overflow-hidden border-t border-white/5">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
      <div
        className="max-w-7xl mx-auto py-12 md:py-16 relative px-4 sm:px-6 lg:px-8"
        style={{
          paddingLeft: 'max(1rem, env(safe-area-inset-left, 1rem))',
          paddingRight: 'max(1rem, env(safe-area-inset-right, 1rem))',
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-8">
          <div className="md:col-span-5">
            <h3 className="font-display text-xl font-bold text-white mb-3">{t('brand.name')}</h3>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">{t('footer.description')}</p>
            <div className="mt-6">
              <LanguageSwitcher />
            </div>
          </div>
          <div className="md:col-span-3">
            <h4 className="font-semibold text-slate-300 mb-4 text-xs uppercase tracking-wider">
              {t('footer.navigation')}
            </h4>
            <ul className="space-y-2">
              {navLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link href={href} className="text-slate-400 hover:text-amber-300 text-sm transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-4">
            <h4 className="font-semibold text-slate-300 mb-4 text-xs uppercase tracking-wider">
              {t('footer.contact')}
            </h4>
            <div className="space-y-3 text-sm">
              <a href="mailto:contacto@rubianejoaquim.com" className="block text-slate-400 hover:text-white">
                contacto@rubianejoaquim.com
              </a>
              <a href="tel:+244944905246" className="block text-slate-400 hover:text-white">
                +244 944 905246
              </a>
              <a
                href={WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
              >
                {t('contact.whatsapp')}
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/5 mt-10 pt-8 flex flex-col sm:flex-row justify-between gap-4 text-slate-500 text-sm">
          <p>
            &copy; {new Date().getFullYear()} {t('brand.name')}. {t('footer.rights')}{' '}
            <Link href="/legal" className="hover:text-amber-300 underline underline-offset-2">
              Legal
            </Link>
          </p>
        </div>
      </div>
    </footer>
  )
}

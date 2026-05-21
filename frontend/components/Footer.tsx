'use client'

import Link from 'next/link'
import { useSiteData, navByPlacement } from '@/contexts/SiteDataContext'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function Footer() {
  const { settings, navigation } = useSiteData()
  const navLinks = navByPlacement(navigation, 'footer')
  const email = settings.contact_email || ''
  const phone = settings.phone || ''
  const whatsapp = settings.whatsapp_number || ''
  const description = settings.footer_description || ''
  const rights = settings.footer_rights || ''
  const navTitle = settings.footer_navigation || 'Navigation'
  const contactTitle = settings.footer_contact || 'Contact'

  return (
    <footer className="bg-slate-950 text-white border-t border-white/5">
      <div className="max-w-7xl mx-auto py-12 md:py-16 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-8">
          <div className="md:col-span-5">
            <h3 className="font-display text-xl font-bold text-white mb-3">Rubiane Joaquim</h3>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">{description}</p>
            <div className="mt-6">
              <LanguageSwitcher />
            </div>
          </div>
          <div className="md:col-span-3">
            <h4 className="font-semibold text-slate-300 mb-4 text-xs uppercase tracking-wider">{navTitle}</h4>
            <ul className="space-y-2">
              {navLinks.map((item) => (
                <li key={item.id}>
                  <Link href={item.url} className="text-slate-400 hover:text-amber-300 text-sm transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-4">
            <h4 className="font-semibold text-slate-300 mb-4 text-xs uppercase tracking-wider">{contactTitle}</h4>
            <div className="space-y-3 text-sm">
              {email && (
                <a href={`mailto:${email}`} className="block text-slate-400 hover:text-white">
                  {email}
                </a>
              )}
              {phone && (
                <a href={`tel:${phone.replace(/\s/g, '')}`} className="block text-slate-400 hover:text-white">
                  {phone}
                </a>
              )}
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
                >
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="border-t border-white/5 mt-10 pt-8 text-slate-500 text-sm">
          <p>
            &copy; {new Date().getFullYear()} Rubiane Joaquim. {rights}{' '}
            <Link href="/legal" className="hover:text-amber-300 underline">
              Legal
            </Link>
          </p>
        </div>
      </div>
    </footer>
  )
}

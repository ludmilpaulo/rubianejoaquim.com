'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/admin/cms', label: 'Overview' },
  { href: '/admin/cms/analytics', label: 'Analytics' },
  { href: '/admin/cms/homepage', label: 'Homepage' },
  { href: '/admin/cms/services', label: 'Services' },
  { href: '/admin/cms/portfolio', label: 'Portfolio' },
  { href: '/admin/cms/zenda', label: 'Zenda' },
  { href: '/admin/cms/testimonials', label: 'Testimonials' },
  { href: '/admin/cms/resources', label: 'Resources' },
  { href: '/admin/cms/faqs', label: 'FAQs' },
  { href: '/admin/cms/navigation', label: 'Navigation' },
  { href: '/admin/cms/settings', label: 'Settings' },
  { href: '/admin/cms/seo', label: 'SEO' },
  { href: '/admin/cms/leads', label: 'Leads' },
]

export default function CmsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="w-60 bg-slate-950 text-white shrink-0 hidden md:flex flex-col border-r border-white/5">
        <div className="p-5 border-b border-white/10">
          <Link href="/admin" className="text-xs text-slate-400 hover:text-white uppercase tracking-wider">
            ← Admin hub
          </Link>
          <p className="font-display text-lg font-semibold mt-3 text-zenda-growthLight">Site CMS</p>
          <p className="text-xs text-slate-500 mt-1">Public website content</p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block px-3 py-2.5 rounded-lg text-sm transition-colors ${
                pathname === link.href
                  ? 'bg-zenda-primary/20 text-white font-medium'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-2">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs text-zenda-growth hover:underline"
          >
            Preview homepage ↗
          </a>
          <a
            href="/zenda"
            target="_blank"
            rel="noopener noreferrer"
            className="block text-xs text-zenda-light hover:underline"
          >
            Preview Zenda ↗
          </a>
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-10 overflow-auto">{children}</main>
    </div>
  )
}

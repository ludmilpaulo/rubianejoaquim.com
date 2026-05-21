'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/admin/cms', label: 'Overview' },
  { href: '/admin/cms/homepage', label: 'Homepage' },
  { href: '/admin/cms/services', label: 'Services' },
  { href: '/admin/cms/leads', label: 'Leads' },
  { href: '/admin/cms/navigation', label: 'Navigation' },
  { href: '/admin/portfolio', label: 'Legacy hub' },
]

export default function CmsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="w-56 bg-slate-900 text-white shrink-0 hidden md:flex flex-col">
        <div className="p-4 border-b border-white/10">
          <Link href="/admin" className="text-sm text-slate-400 hover:text-white">
            ← Admin
          </Link>
          <p className="font-semibold mt-2">Site CMS</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`block px-3 py-2 rounded-lg text-sm ${
                pathname === link.href ? 'bg-amber-500/20 text-amber-200' : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-amber-400 hover:underline"
          >
            Preview site ↗
          </a>
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-10 overflow-auto">{children}</main>
    </div>
  )
}

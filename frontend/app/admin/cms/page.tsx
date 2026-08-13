'use client'

import Link from 'next/link'
import { useAdminGate } from '@/hooks/useAdminGate'

const MODULES = [
  { href: '/admin/cms/analytics', title: 'Analytics', desc: 'Leads, newsletter, and content counts' },
  { href: '/admin/cms/homepage', title: 'Homepage sections', desc: 'Hero, portfolio, Zenda, testimonials — edit copy per locale' },
  { href: '/admin/cms/services', title: 'Services', desc: 'Creative services cards on homepage' },
  { href: '/admin/cms/portfolio', title: 'Portfolio', desc: 'Featured projects and case studies' },
  { href: '/admin/cms/zenda', title: 'Zenda product', desc: 'App copy, features, store links' },
  { href: '/admin/cms/testimonials', title: 'Testimonials', desc: 'Client quotes and ratings' },
  { href: '/admin/cms/resources', title: 'Free resources', desc: 'PDFs, videos, guides' },
  { href: '/admin/cms/faqs', title: 'FAQs', desc: 'Help content by category' },
  { href: '/admin/cms/navigation', title: 'Navigation', desc: 'Header and footer menus' },
  { href: '/admin/cms/settings', title: 'Site settings', desc: 'Contact info, footer, form labels' },
  { href: '/admin/cms/seo', title: 'Page SEO', desc: 'Meta titles for home, Zenda, and more' },
  { href: '/admin/cms/leads', title: 'Leads & contact', desc: 'Form submissions, notes, and status workflow' },
]

export default function CmsOverviewPage() {
  const { ready, isLoading } = useAdminGate()

  if (isLoading || !ready) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 zenda-spinner zenda-spinner-md" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Public website CMS</h1>
      <p className="text-slate-600 mb-8 max-w-2xl">
        All marketing copy, homepage sections, portfolio, Zenda, navigation, and SEO are served from
        Django. Next.js only renders API data — edit content here or in Django admin.
      </p>
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {MODULES.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="block p-6 bg-white rounded-xl border border-slate-200 hover:border-amber-400/60 hover:shadow-lg transition-all group"
          >
            <h2 className="font-semibold text-slate-900 group-hover:text-amber-800">{m.title}</h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">{m.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

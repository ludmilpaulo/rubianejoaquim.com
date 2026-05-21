'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'

const MODULES = [
  { href: '/admin/cms/homepage', title: 'Homepage sections', desc: 'Hero, services intro, Zenda block, visibility' },
  { href: '/admin/cms/services', title: 'Services', desc: 'Create, edit, reorder services' },
  { href: '/admin/cms/leads', title: 'Leads & contact', desc: 'Contact form submissions and status' },
  { href: '/admin/cms/navigation', title: 'Navigation', desc: 'Header and footer menu items' },
  { href: '/admin/portfolio', title: 'Full CMS (API)', desc: 'Projects, testimonials, Zenda, Django admin links' },
]

export default function CmsOverviewPage() {
  const { user, checkAuth, isLoading } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!isLoading && (!user || !user.is_admin)) router.push('/login')
  }, [user, isLoading, router])

  if (isLoading || !user?.is_admin) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Public website CMS</h1>
      <p className="text-slate-600 mb-8 max-w-2xl">
        All homepage, Zenda, navigation, and marketing copy is served from Django. Use these modules to manage
        content without editing Next.js files.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        {MODULES.map((m) => (
          <Link
            key={m.href}
            href={m.href}
            className="block p-6 bg-white rounded-xl border border-slate-200 hover:border-amber-400/50 hover:shadow-md transition-all"
          >
            <h2 className="font-semibold text-slate-900">{m.title}</h2>
            <p className="text-sm text-slate-500 mt-2">{m.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

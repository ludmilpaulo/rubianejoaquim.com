'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/contexts/LocaleContext'
import { portfolioApi } from '@/lib/portfolio-api'
import type { SiteSettings } from '@/lib/portfolio-types'
import ContactSection from '@/components/portfolio/ContactSection'
import api from '@/lib/api'

export default function ContactPage() {
  const { locale } = useLocale()
  const [settings, setSettings] = useState<SiteSettings | Record<string, never>>({})

  useEffect(() => {
    api
      .get<SiteSettings>('/portfolio/settings/', { params: { lang: locale } })
      .then((res) => setSettings(res.data))
      .catch(() => setSettings({}))
  }, [locale])

  return (
    <div className="bg-slate-950 min-h-screen">
      <ContactSection settings={settings} />
    </div>
  )
}

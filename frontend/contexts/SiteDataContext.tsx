'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useLocale } from '@/contexts/LocaleContext'
import { publicApi } from '@/lib/public-api'
import type { NavItem, SiteSettings } from '@/lib/public-types'

interface SiteDataContextValue {
  navigation: NavItem[]
  settings: SiteSettings | Record<string, never>
  loading: boolean
}

const SiteDataContext = createContext<SiteDataContextValue>({
  navigation: [],
  settings: {},
  loading: true,
})

export function SiteDataProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale()
  const [navigation, setNavigation] = useState<NavItem[]>([])
  const [settings, setSettings] = useState<SiteSettings | Record<string, never>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([publicApi.getNavigation(locale), publicApi.getSiteSettings(locale)])
      .then(([nav, site]) => {
        if (!cancelled) {
          setNavigation(nav)
          setSettings(site)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNavigation([])
          setSettings({})
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [locale])

  return (
    <SiteDataContext.Provider value={{ navigation, settings, loading }}>
      {children}
    </SiteDataContext.Provider>
  )
}

export function useSiteData() {
  return useContext(SiteDataContext)
}

export function navByPlacement(items: NavItem[], placement: 'header' | 'footer' | 'both') {
  return items
    .filter((item) => item.placement === placement || item.placement === 'both')
    .sort((a, b) => a.order - b.order)
}

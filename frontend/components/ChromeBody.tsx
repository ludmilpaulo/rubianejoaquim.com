'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { getZendaChrome } from '@/lib/zenda-routes'

/**
 * Product routes (login, instructor, student) use a light canvas so form
 * fields stay readable. Cinema/marketing pages keep the dark slate body.
 */
export default function ChromeBody() {
  const pathname = usePathname() || '/'

  useEffect(() => {
    const chrome = getZendaChrome(pathname)
    const product = chrome === 'product'
    const cinema = chrome === 'cinema'
    const marketing = chrome === 'marketing'
    document.body.classList.toggle('chrome-product', product)
    document.body.classList.toggle('chrome-cinema', cinema)
    document.body.classList.toggle('chrome-marketing', marketing)
    document.documentElement.classList.toggle('chrome-product', product)
    document.documentElement.classList.toggle('chrome-cinema', cinema)
    document.documentElement.classList.toggle('chrome-marketing', marketing)
  }, [pathname])

  return null
}

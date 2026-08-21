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
    document.body.classList.toggle('chrome-product', product)
    document.body.classList.toggle('chrome-cinema', !product)
    document.documentElement.classList.toggle('chrome-product', product)
  }, [pathname])

  return null
}

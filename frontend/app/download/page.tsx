import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import Image from 'next/image'
import { zendaBrand } from '@/lib/zenda-brand'
import {
  ZENDA_APP_STORE_URL,
  ZENDA_DOWNLOAD_BLURB,
  ZENDA_IOS_APP_ID,
  ZENDA_PLAY_STORE_URL,
  ZENDA_TAGLINE,
} from '@/lib/zenda-stores'

export const metadata: Metadata = {
  title: 'Download Zenda',
  description: `${ZENDA_TAGLINE} ${ZENDA_DOWNLOAD_BLURB}`,
  itunes: {
    appId: ZENDA_IOS_APP_ID,
  },
  other: {
    'apple-itunes-app': `app-id=${ZENDA_IOS_APP_ID}, app-argument=https://www.rubianejoaquim.com/download`,
  },
}

function detectPlatform(ua: string): 'ios' | 'android' | 'other' {
  const lower = ua.toLowerCase()
  if (/iphone|ipad|ipod/.test(lower)) return 'ios'
  if (/android/.test(lower)) return 'android'
  return 'other'
}

async function fetchStoreUrls(): Promise<{ ios: string; android: string }> {
  const api =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
    'https://ludmilpaulo.pythonanywhere.com/api'
  try {
    const res = await fetch(`${api}/config/app-version/`, { next: { revalidate: 60 } })
    if (!res.ok) throw new Error('config fetch failed')
    const data = (await res.json()) as {
      ios_store_url?: string
      android_store_url?: string
    }
    return {
      ios: data.ios_store_url || ZENDA_APP_STORE_URL,
      android: data.android_store_url || ZENDA_PLAY_STORE_URL,
    }
  } catch {
    return { ios: ZENDA_APP_STORE_URL, android: ZENDA_PLAY_STORE_URL }
  }
}

async function trackClick(ref: string | null, platform: string) {
  if (!ref) return
  const api =
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
    'https://ludmilpaulo.pythonanywhere.com/api'
  try {
    await fetch(`${api}/auth/referral/track/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referral_code: ref,
        event_type: 'click',
        platform,
        path: '/download',
      }),
      cache: 'no-store',
    })
  } catch {
    // ignore tracking failures
  }
}

type SearchParams = Promise<{ ref?: string; platform?: string; family?: string }>

export default async function DownloadPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const ref = typeof params.ref === 'string' ? params.ref : null
  const family =
    typeof params.family === 'string' && params.family.trim()
      ? params.family.trim().toUpperCase()
      : null
  if (family) {
    const jar = await cookies()
    jar.set('pending_family_invite', family, {
      expires: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      sameSite: 'lax',
      path: '/',
    })
  }
  const forced =
    params.platform === 'ios' || params.platform === 'android' ? params.platform : null
  const headerList = await headers()
  const ua = headerList.get('user-agent') || ''
  const platform = forced || detectPlatform(ua)
  const stores = await fetchStoreUrls()
  const iosUrl = stores.ios || ZENDA_APP_STORE_URL
  const androidUrl = stores.android || ZENDA_PLAY_STORE_URL

  await trackClick(ref, platform)

  // Universal Links open the installed app first. If this page renders, the app
  // is not installed (or the in-app browser blocked App Links) — send store URLs.
  if (platform === 'android') {
    redirect(androidUrl)
  }
  if (platform === 'ios') {
    redirect(iosUrl)
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: `linear-gradient(160deg, ${zendaBrand.primary} 0%, ${zendaBrand.primaryDark} 50%, ${zendaBrand.primaryDeep} 100%)`,
        color: '#f8fafc',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <Image src="/zenda_logo.svg" alt="Zenda" width={88} height={88} priority style={{ borderRadius: 20 }} />
        </div>
        <p style={{ letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.7, fontSize: 12 }}>
          Zenda
        </p>
        <h1 style={{ fontSize: '2rem', margin: '0.5rem 0 0.75rem', fontWeight: 700 }}>Zenda</h1>
        <p style={{ opacity: 0.9, fontWeight: 600, marginBottom: 8 }}>{ZENDA_TAGLINE}</p>
        <p style={{ opacity: 0.85, lineHeight: 1.5, marginBottom: '1.75rem' }}>{ZENDA_DOWNLOAD_BLURB}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <a
            href={iosUrl}
            style={{
              display: 'block',
              padding: '14px 18px',
              borderRadius: 12,
              background: '#f8fafc',
              color: zendaBrand.navy,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Download for iPhone
          </a>
          <a
            href={androidUrl}
            style={{
              display: 'block',
              padding: '14px 18px',
              borderRadius: 12,
              background: zendaBrand.growth,
              color: '#052e16',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Download for Android
          </a>
          <Link
            href="/"
            style={{ color: '#C8C7F5', marginTop: 8, fontSize: 14, textDecoration: 'underline' }}
          >
            Open Zenda Web
          </Link>
        </div>
      </div>
    </main>
  )
}

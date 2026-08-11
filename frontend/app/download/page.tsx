import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Download Zenda',
  description: 'Download Zenda for iOS or Android — manage finances, budgets, savings and goals.',
}

const PLAY_FALLBACK =
  'https://play.google.com/store/apps/details?id=com.rubianejoaquim.zenda'
const WEB_FALLBACK = 'https://www.rubianejoaquim.com/zenda'

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
    const res = await fetch(`${api}/config/app-version/`, { next: { revalidate: 300 } })
    if (!res.ok) throw new Error('config fetch failed')
    const data = (await res.json()) as {
      ios_store_url?: string
      android_store_url?: string
    }
    return {
      ios: data.ios_store_url || '',
      android: data.android_store_url || PLAY_FALLBACK,
    }
  } catch {
    return { ios: '', android: PLAY_FALLBACK }
  }
}

async function trackClick(ref: string | null, platform: string, ua: string) {
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
      // fire-and-forget; don't block redirect hard
      cache: 'no-store',
    })
  } catch {
    // ignore tracking failures
  }
  void ua
}

type SearchParams = Promise<{ ref?: string; platform?: string }>

export default async function DownloadPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const params = await searchParams
  const ref = typeof params.ref === 'string' ? params.ref : null
  const headerList = await headers()
  const ua = headerList.get('user-agent') || ''
  const platform = detectPlatform(ua)
  const stores = await fetchStoreUrls()

  await trackClick(ref, platform, ua)

  const withRef = (url: string) => {
    if (!url) return WEB_FALLBACK
    if (!ref) return url
    try {
      const u = new URL(url)
      u.searchParams.set('ref', ref)
      return u.toString()
    } catch {
      return url
    }
  }

  if (platform === 'android' && stores.android) {
    redirect(withRef(stores.android))
  }
  if (platform === 'ios' && stores.ios) {
    redirect(withRef(stores.ios))
  }
  // iOS without App Store URL yet → soft landing with both buttons
  if (platform === 'ios' && !stores.ios) {
    // fall through to chooser
  }

  const androidUrl = withRef(stores.android || PLAY_FALLBACK)
  const iosUrl = stores.ios ? withRef(stores.ios) : WEB_FALLBACK
  const inviteNote = ref ? `Referral: ${ref}` : null

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)',
        color: '#f8fafc',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <p style={{ letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.7, fontSize: 12 }}>
          Zenda
        </p>
        <h1 style={{ fontSize: '2rem', margin: '0.5rem 0 0.75rem', fontWeight: 700 }}>
          Download Zenda
        </h1>
        <p style={{ opacity: 0.85, lineHeight: 1.5, marginBottom: '1.75rem' }}>
          Manage salary, budgets, savings, debts and financial education in one app.
        </p>
        {inviteNote ? (
          <p style={{ fontSize: 13, opacity: 0.7, marginBottom: '1rem' }}>{inviteNote}</p>
        ) : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <a
            href={androidUrl}
            style={{
              display: 'block',
              padding: '14px 18px',
              borderRadius: 12,
              background: '#22c55e',
              color: '#052e16',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Download for Android
          </a>
          <a
            href={iosUrl}
            style={{
              display: 'block',
              padding: '14px 18px',
              borderRadius: 12,
              background: '#f8fafc',
              color: '#0f172a',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            Download for iPhone
          </a>
          <Link
            href="/zenda"
            style={{ color: '#c7d2fe', marginTop: 8, fontSize: 14, textDecoration: 'underline' }}
          >
            Learn more about Zenda
          </Link>
        </div>
      </div>
    </main>
  )
}

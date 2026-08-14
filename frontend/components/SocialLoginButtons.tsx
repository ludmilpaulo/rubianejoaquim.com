'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { getApiBaseUrl, getApiErrorMessage } from '@/lib/types/api'
import { useLocale } from '@/contexts/LocaleContext'
import { safeAuthNext } from '@/lib/auth-next'

type SocialConfig = {
  google_client_id: string
  facebook_app_id: string
  google_enabled: boolean
  facebook_enabled: boolean
  tiktok_enabled: boolean
}

type LinkRequired = {
  status: 'link_required'
  link_token: string
  email: string
  provider: string
  message?: string
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void
          renderButton: (parent: HTMLElement, config: Record<string, unknown>) => void
          prompt: () => void
        }
      }
    }
    FB?: {
      init: (config: Record<string, unknown>) => void
      login: (
        cb: (response: { authResponse?: { accessToken?: string }; status?: string }) => void,
        opts: Record<string, unknown>
      ) => void
    }
    fbAsyncInit?: () => void
  }
}

function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById(id)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.id = id
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.body.appendChild(script)
  })
}

type Props = {
  mode?: 'login' | 'link'
  nextPath?: string | null
  onError?: (message: string) => void
  onLinkRequired?: (payload: LinkRequired) => void
  onSuccess?: () => void
}

export default function SocialLoginButtons({
  mode = 'login',
  nextPath = null,
  onError,
  onLinkRequired,
  onSuccess,
}: Props) {
  const router = useRouter()
  const { t } = useLocale()
  const { applySession } = useAuthStore()
  const afterLogin = safeAuthNext(nextPath)
  const [config, setConfig] = useState<SocialConfig | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [loadError, setLoadError] = useState('')
  const googleBtnRef = useRef<HTMLDivElement>(null)
  const googleReady = useRef(false)

  const finishAuth = useCallback(
    async (data: {
      status?: string
      token?: string
      user?: Parameters<typeof applySession>[0]
      message?: string
      link_token?: string
      email?: string
      provider?: string
    }) => {
      if (data.status === 'link_required' && data.link_token) {
        onLinkRequired?.({
          status: 'link_required',
          link_token: data.link_token,
          email: data.email || '',
          provider: data.provider || '',
          message: data.message,
        })
        return
      }
      if (data.status === 'cancelled') {
        return
      }
      if (data.token && data.user) {
        applySession(data.user, data.token)
        onSuccess?.()
        if (mode === 'login') {
          if (afterLogin) router.push(afterLogin)
          else if (data.user.is_admin) router.push('/admin')
          else router.push('/area-do-aluno')
        }
        return
      }
      onError?.(data.message || t('auth.socialCallbackError'))
    },
    [afterLogin, applySession, mode, onError, onLinkRequired, onSuccess, router, t]
  )

  useEffect(() => {
    let cancelled = false
    authApi
      .socialConfig()
      .then((res) => {
        if (!cancelled) setConfig(res.data)
      })
      .catch(() => {
        if (!cancelled) setLoadError(t('auth.socialLoadFailed'))
      })
    return () => {
      cancelled = true
    }
  }, [t])

  useEffect(() => {
    if (!config?.google_enabled || !config.google_client_id || !googleBtnRef.current) return
    let cancelled = false

    const initGoogle = async () => {
      try {
        await loadScript('https://accounts.google.com/gsi/client', 'google-gsi')
        if (cancelled || !window.google || !googleBtnRef.current) return
        window.google.accounts.id.initialize({
          client_id: config.google_client_id,
          callback: async (response: { credential?: string }) => {
            if (!response.credential) {
              onError?.(t('auth.googleFailed'))
              return
            }
            setBusy('google')
            try {
              const res = await authApi.socialGoogle(response.credential)
              await finishAuth(res.data)
            } catch (err) {
              onError?.(getApiErrorMessage(err, t('auth.googleFailed')))
            } finally {
              setBusy(null)
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        })
        googleBtnRef.current.innerHTML = ''
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: googleBtnRef.current.offsetWidth || 320,
          text: mode === 'link' ? 'continue_with' : 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        })
        googleReady.current = true
      } catch {
        if (!cancelled) onError?.(t('auth.googleLoadFailed'))
      }
    }

    void initGoogle()
    return () => {
      cancelled = true
    }
  }, [config, finishAuth, mode, onError, t])

  const handleFacebook = async () => {
    if (!config?.facebook_enabled || !config.facebook_app_id || busy) return
    setBusy('facebook')
    try {
      await loadScript('https://connect.facebook.net/en_US/sdk.js', 'facebook-jssdk')
      await new Promise<void>((resolve) => {
        if (window.FB) {
          resolve()
          return
        }
        window.fbAsyncInit = () => resolve()
      })
      window.FB?.init({
        appId: config.facebook_app_id,
        cookie: true,
        xfbml: false,
        version: 'v21.0',
      })
      window.FB?.login(
        async (response) => {
          try {
            if (!response.authResponse?.accessToken) {
              setBusy(null)
              return
            }
            const res = await authApi.socialFacebook(response.authResponse.accessToken)
            await finishAuth(res.data)
          } catch (err) {
            onError?.(getApiErrorMessage(err, t('auth.facebookFailed')))
          } finally {
            setBusy(null)
          }
        },
        { scope: 'public_profile,email' }
      )
    } catch {
      onError?.(t('auth.facebookFailed'))
      setBusy(null)
    }
  }

  const handleTikTok = async () => {
    if (!config?.tiktok_enabled || busy) return
    setBusy('tiktok')
    const purpose = mode === 'link' ? 'link' : 'login'
    const redirect = mode === 'link' ? '/area-do-aluno?tab=profile' : (afterLogin || '/area-do-aluno')
    try {
      if (purpose === 'link') {
        const res = await authApi.socialTikTokLinkStart(redirect)
        const authorizeUrl = res.data.authorize_url
        if (!authorizeUrl) {
          onError?.(t('auth.tiktokStartFailed'))
          setBusy(null)
          return
        }
        window.location.href = authorizeUrl
        return
      }
      const apiRoot = getApiBaseUrl().replace(/\/api\/?$/, '')
      const url = `${apiRoot}/api/auth/social/tiktok/?purpose=${encodeURIComponent(purpose)}&redirect=${encodeURIComponent(redirect)}&client=web`
      window.location.href = url
    } catch (err) {
      onError?.(getApiErrorMessage(err, t('auth.tiktokFailed')))
      setBusy(null)
    }
  }

  if (loadError) {
    return <p className="text-sm text-gray-500 text-center">{loadError}</p>
  }

  if (!config) {
    return (
      <div className="flex justify-center py-2">
        <div className="w-6 h-6 border-2 border-gray-300 border-t-zenda-growth rounded-full animate-spin" />
      </div>
    )
  }

  const anyEnabled = config.google_enabled || config.facebook_enabled || config.tiktok_enabled
  if (!anyEnabled) {
    return null
  }

  return (
    <div className="space-y-3">
      {config.google_enabled && (
        <div className="relative">
          <div ref={googleBtnRef} className="w-full min-h-[44px] flex justify-center [&>div]:w-full" />
          {busy === 'google' && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-lg">
              <span className="text-sm text-gray-600">{t('auth.signingGoogle')}</span>
            </div>
          )}
        </div>
      )}

      {config.facebook_enabled && (
        <button
          type="button"
          disabled={!!busy}
          onClick={handleFacebook}
          className="w-full flex items-center justify-center gap-3 border border-[#1877F2] bg-[#1877F2] text-white py-2.5 px-4 rounded-lg font-medium hover:bg-[#166FE5] transition disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M22 12.07C22 6.48 17.52 2 11.93 2S1.86 6.48 1.86 12.07c0 5.02 3.66 9.18 8.44 9.93v-7.02H7.9v-2.91h2.4V9.84c0-2.37 1.4-3.68 3.56-3.68 1.03 0 2.11.18 2.11.18v2.32h-1.19c-1.17 0-1.54.73-1.54 1.48v1.78h2.62l-.42 2.91h-2.2V22c4.78-.75 8.44-4.91 8.44-9.93z" />
          </svg>
          {busy === 'facebook' ? t('auth.processing') : mode === 'link' ? t('auth.linkFacebook') : t('auth.continueFacebook')}
        </button>
      )}

      {config.tiktok_enabled && (
        <button
          type="button"
          disabled={!!busy}
          onClick={handleTikTok}
          className="w-full flex items-center justify-center gap-3 border border-gray-900 bg-gray-900 text-white py-2.5 px-4 rounded-lg font-medium hover:bg-black transition disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M16.6 5.82A4.86 4.86 0 0115.4 3h-3.1v12.4a2.6 2.6 0 01-2.6 2.5 2.6 2.6 0 01-2.6-2.6 2.6 2.6 0 012.6-2.6c.27 0 .53.04.78.11V9.67a5.7 5.7 0 00-.78-.05A5.72 5.72 0 003.98 15.34 5.72 5.72 0 009.7 21.06a5.72 5.72 0 005.72-5.72V9.3a7.9 7.9 0 004.6 1.46V7.66a4.87 4.87 0 01-3.42-1.84z" />
          </svg>
          {busy === 'tiktok' ? t('auth.redirecting') : mode === 'link' ? t('auth.linkTikTok') : t('auth.continueTikTok')}
        </button>
      )}
    </div>
  )
}

'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { getApiErrorMessage } from '@/lib/types/api'
import { useLocale } from '@/contexts/LocaleContext'
import { familyJoinPathFromCode, safeAuthNext } from '@/lib/auth-next'
import ZendaLoader from '@/components/zenda/ZendaLoader'

function SocialCallbackInner() {
  const router = useRouter()
  const params = useSearchParams()
  const { t } = useLocale()
  const { applySession } = useAuthStore()
  const [error, setError] = useState('')

  useEffect(() => {
    const status = params.get('status')
    const exchangeCode = params.get('exchange_code')
    const token = params.get('token')
    const pendingInvite = familyJoinPathFromCode(
      typeof document !== 'undefined'
        ? document.cookie.split('; ').find((row) => row.startsWith('pending_family_invite='))?.split('=')[1]
        : null,
    )
    const safeNext = safeAuthNext(params.get('next')) || pendingInvite || '/area-do-aluno'

    if (status === 'cancelled') {
      router.replace('/login')
      return
    }

    if (status === 'error') {
      setError(params.get('message') || t('auth.socialCallbackError'))
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        let sessionToken = token
        if (exchangeCode) {
          const res = await authApi.socialExchange(exchangeCode, params.get('social') || 'tiktok')
          const data = res.data as { token?: string; user?: Parameters<typeof applySession>[0]; status?: string }
          if (data.status === 'authenticated' && data.token && data.user) {
            applySession(data.user, data.token)
            window.history.replaceState({}, '', '/login/social-callback')
            if (data.user.is_admin && !safeAuthNext(params.get('next'))) router.replace('/admin')
            else router.replace(safeNext)
            return
          }
          setError(data.status === 'link_required'
            ? t('auth.socialLinkReturn')
            : t('auth.socialCallbackError'))
          return
        }

        if (status !== 'authenticated' && !sessionToken) {
          setError(params.get('message') || t('auth.socialCallbackError'))
          return
        }

        if (!sessionToken) {
          setError(t('auth.socialCallbackError'))
          return
        }

        const Cookies = (await import('js-cookie')).default
        Cookies.set('token', sessionToken, {
          expires: 30,
          sameSite: 'lax',
          secure: window.location.protocol === 'https:',
        })
        const me = await authApi.me()
        if (cancelled) return
        applySession(me.data, sessionToken)
        window.history.replaceState({}, '', '/login/social-callback')
        if (me.data.is_admin && !safeAuthNext(params.get('next'))) router.replace('/admin')
        else router.replace(safeNext)
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, t('auth.socialCallbackError')))
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [applySession, params, router, t])

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-3">{t('auth.socialFailed')}</h1>
        <p className="text-gray-600 mb-6">{error}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="inline-flex justify-center rounded-lg bg-zenda-primary text-white font-semibold px-4 py-2.5 hover:opacity-90"
          >
            {t('auth.tryAgain')}
          </Link>
          <Link
            href="/login"
            className="inline-flex justify-center rounded-lg border border-gray-300 text-gray-800 font-semibold px-4 py-2.5 hover:bg-gray-50"
          >
            {t('auth.useEmail')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <ZendaLoader message={t('auth.completing')} />
    </div>
  )
}

export default function SocialCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto px-4 py-16 text-center">
          <ZendaLoader />
        </div>
      }
    >
      <SocialCallbackInner />
    </Suspense>
  )
}

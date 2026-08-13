'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { Suspense } from 'react'
import ZendaLoader from '@/components/zenda/ZendaLoader'

function SocialCallbackInner() {
  const router = useRouter()
  const params = useSearchParams()
  const { applySession } = useAuthStore()
  const [error, setError] = useState('')

  useEffect(() => {
    const status = params.get('status')
    const token = params.get('token')
    const next = params.get('next') || '/area-do-aluno'

    if (status === 'cancelled') {
      router.replace('/login')
      return
    }

    if (status === 'error' || !token) {
      setError(params.get('message') || 'Não foi possível concluir o login social.')
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        // Temporarily set cookie so me() is authorized
        const Cookies = (await import('js-cookie')).default
        Cookies.set('token', token, {
          expires: 30,
          sameSite: 'lax',
          secure: window.location.protocol === 'https:',
        })
        const me = await authApi.me()
        if (cancelled) return
        applySession(me.data, token)
        // Clear sensitive query params from history
        window.history.replaceState({}, '', '/login/social-callback')
        if (me.data.is_admin) router.replace('/admin')
        else router.replace(next.startsWith('/') ? next : '/area-do-aluno')
      } catch {
        if (!cancelled) {
          setError('Não foi possível concluir o login social. Tente novamente.')
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [applySession, params, router])

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-3">Login social</h1>
        <p className="text-gray-600 mb-6">{error}</p>
        <Link href="/login" className="text-zenda-primary font-semibold hover:underline">
          Voltar ao login
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <ZendaLoader message="A concluir autenticação…" />
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

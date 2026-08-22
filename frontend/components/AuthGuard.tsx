'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { safeAuthNext } from '@/lib/auth-next'
import ZendaPageLoading from '@/components/zenda/ZendaPageLoading'

type AuthGuardProps = {
  children: React.ReactNode
  requireAdmin?: boolean
}

function isAdminUser(user: { is_admin?: boolean; is_staff?: boolean; is_superuser?: boolean } | null) {
  return Boolean(user?.is_admin || user?.is_staff || user?.is_superuser)
}

export default function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const router = useRouter()
  const { user, isLoading, checkAuth } = useAuthStore()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    void checkAuth()
    const timer = window.setTimeout(() => {
      if (useAuthStore.getState().isLoading) {
        useAuthStore.setState({ isLoading: false })
        setTimedOut(true)
      }
    }, 12000)
    return () => window.clearTimeout(timer)
  }, [checkAuth])

  const allowed = Boolean(user) && (!requireAdmin || isAdminUser(user))

  useEffect(() => {
    if (isLoading) return
    if (timedOut && !user) return
    if (!allowed) {
      const next = safeAuthNext(`${window.location.pathname}${window.location.search}`)
      router.push(next ? `/login?next=${encodeURIComponent(next)}` : '/login')
    }
  }, [allowed, isLoading, router, timedOut, user])

  if (isLoading) {
    return (
      <ZendaPageLoading message="A carregar…" />
    )
  }

  if (timedOut && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zenda-bg px-4">
        <div className="max-w-md w-full text-center space-y-4 bg-white border border-zenda-border rounded-2xl p-8">
          <p className="text-zenda-navy font-semibold">A sessão está a demorar a confirmar.</p>
          <button
            type="button"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-semibold text-white bg-zenda-primary"
            onClick={() => {
              setTimedOut(false)
              useAuthStore.setState({ isLoading: true })
              void checkAuth()
            }}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  if (!allowed) {
    return (
      <ZendaPageLoading message="A redirecionar para o login…" />
    )
  }

  return <>{children}</>
}

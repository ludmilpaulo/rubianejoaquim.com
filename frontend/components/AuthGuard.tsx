'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import ZendaLoader from '@/components/zenda/ZendaLoader'

type AuthGuardProps = {
  children: React.ReactNode
  requireAdmin?: boolean
}

export default function AuthGuard({ children, requireAdmin = false }: AuthGuardProps) {
  const router = useRouter()
  const { user, isLoading, checkAuth } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (isLoading) return
    if (!user || (requireAdmin && !user.is_admin)) {
      router.push('/login')
    }
  }, [user, isLoading, requireAdmin, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zenda-bg">
        <ZendaLoader message="A carregar…" />
      </div>
    )
  }

  if (!user || (requireAdmin && !user.is_admin)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-zenda-bg px-4 text-center">
        <ZendaLoader message="A redirecionar para o login…" />
      </div>
    )
  }

  return <>{children}</>
}

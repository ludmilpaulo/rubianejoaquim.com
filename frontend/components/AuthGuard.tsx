'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import ZendaPageLoading from '@/components/zenda/ZendaPageLoading'

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
      <ZendaPageLoading message="A carregar…" />
    )
  }

  if (!user || (requireAdmin && !user.is_admin)) {
    return (
      <ZendaPageLoading message="A redirecionar para o login…" />
    )
  }

  return <>{children}</>
}

'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/logger'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logger.error('Admin page error', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-zenda-bg px-4">
      <div className="max-w-md w-full text-center space-y-4 bg-white border border-zenda-border rounded-2xl p-8">
        <h1 className="text-xl font-bold text-zenda-navy">Não foi possível abrir esta página</h1>
        <p className="text-sm text-zenda-textSecondary">
          Ocorreu um erro ao carregar o painel de administração. Tente novamente.
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-semibold text-white bg-zenda-primary hover:bg-zenda-dark"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}

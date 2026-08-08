'use client'

import { useCallback, useEffect, useState } from 'react'
import { authApi } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/types/api'
import SocialLoginButtons from '@/components/SocialLoginButtons'

type Methods = {
  email: boolean
  email_address: string | null
  email_verified: boolean
  google: boolean
  facebook: boolean
  tiktok: boolean
  providers: string[]
}

export default function LoginMethodsPanel() {
  const [methods, setMethods] = useState<Methods | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authApi.loginMethods()
      setMethods(res.data)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível carregar os métodos de login.'))
      setMethods(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const unlink = async (provider: 'google' | 'facebook' | 'tiktok') => {
    if (busy) return
    if (!window.confirm(`Remover ${provider} como método de login?`)) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const res = await authApi.unlinkSocial(provider)
      setMethods(res.data.methods)
      setMessage(`${provider} removido.`)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível remover este método.'))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="h-5 w-40 bg-gray-100 rounded animate-pulse mb-4" />
        <div className="space-y-2">
          <div className="h-10 bg-gray-100 rounded animate-pulse" />
          <div className="h-10 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  if (error && !methods) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-red-800 text-sm mb-3">{error}</p>
        <button type="button" onClick={() => void load()} className="text-red-900 font-semibold underline text-sm">
          Tentar novamente
        </button>
      </div>
    )
  }

  if (!methods) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
        Nenhum método de login disponível.
      </div>
    )
  }

  const rows: { key: 'email' | 'google' | 'facebook' | 'tiktok'; label: string; linked: boolean }[] = [
    { key: 'email', label: 'Email / palavra-passe', linked: methods.email },
    { key: 'google', label: 'Google', linked: methods.google },
    { key: 'facebook', label: 'Facebook', linked: methods.facebook },
    { key: 'tiktok', label: 'TikTok', linked: methods.tiktok },
  ]

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
      <div>
        <h3 className="text-xl font-bold text-gray-900">Login e segurança</h3>
        <p className="text-sm text-gray-600 mt-1">
          Associe vários métodos de login à mesma conta. Não pode remover o único método restante.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</div>
      )}
      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">{message}</div>
      )}

      <ul className="space-y-3">
        {rows.map((row) => (
          <li
            key={row.key}
            className="flex items-center justify-between gap-3 border border-gray-100 rounded-lg px-3 py-2.5"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={row.linked ? 'text-green-600 font-bold' : 'text-gray-300 font-bold'} aria-hidden>
                {row.linked ? '✓' : '○'}
              </span>
              <div className="min-w-0">
                <p className="font-medium text-gray-900">{row.label}</p>
                {row.key === 'email' && methods.email_address && (
                  <p className="text-xs text-gray-500 truncate">{methods.email_address}</p>
                )}
              </div>
            </div>
            {row.key !== 'email' && row.linked && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void unlink(row.key as 'google' | 'facebook' | 'tiktok')}
                className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
              >
                Remover
              </button>
            )}
          </li>
        ))}
      </ul>

      {(!methods.google || !methods.facebook || !methods.tiktok) && (
        <div className="pt-2 border-t border-gray-100">
          <p className="text-sm font-medium text-gray-800 mb-3">Associar outro método</p>
          <SocialLoginButtons
            mode="link"
            onError={setError}
            onSuccess={() => {
              setMessage('Método associado com sucesso.')
              void load()
            }}
          />
        </div>
      )}
    </div>
  )
}

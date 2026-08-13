'use client'

import { useState } from 'react'
import Link from 'next/link'
import { authApi } from '@/lib/api'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const trimmed = email.trim()
    if (!trimmed) {
      setError('Introduza o seu email.')
      return
    }
    setLoading(true)
    try {
      await authApi.requestPasswordReset(trimmed)
      setSent(true)
    } catch (err: any) {
      const msg = err.response?.data?.error ?? err.message ?? 'Erro ao enviar. Tente novamente.'
      if (err.response?.status === 503) {
        setError('O envio de email está temporariamente indisponível. Tente mais tarde.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div
        className="bg-zenda-bg w-full max-w-md mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12 lg:py-20 min-w-0 min-h-[calc(100vh-8rem)] flex flex-col justify-center"
        style={{
          paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0.75rem))',
          paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0.75rem))',
        }}
      >
        <div className="zenda-card p-4 sm:p-6 lg:p-8 w-full text-center">
          <div className="w-14 h-14 rounded-full bg-zenda-growthContainer flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-zenda-growthDark" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Verifique o seu email</h1>
          <p className="text-gray-600 mb-6">
            Se existir uma conta com esse email, receberá um link para redefinir a palavra-passe. Verifique também a pasta de spam.
          </p>
          <Link
            href="/login"
            className="inline-block w-full sm:w-auto btn-zenda"
          >
            Voltar ao login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div
      className="bg-zenda-bg w-full max-w-md mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12 lg:py-20 min-w-0 min-h-[calc(100vh-8rem)] flex flex-col justify-center"
      style={{
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0.75rem))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0.75rem))',
      }}
    >
      <div className="zenda-card p-4 sm:p-6 lg:p-8 w-full">
        <h1 className="text-2xl sm:text-3xl font-bold text-zenda-navy mb-2 text-center">
          Esqueceu a palavra-passe?
        </h1>
        <p className="text-gray-600 mb-6 text-center text-sm sm:text-base">
          Introduza o email da sua conta e enviaremos um link para redefinir a palavra-passe.
        </p>

        {error && (
          <div className="px-4 py-3 rounded-lg mb-6 bg-red-50 border border-red-200 text-red-800 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-zenda-primary focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full btn-zenda disabled:opacity-50"
          >
            {loading ? 'A enviar...' : 'Enviar link'}
          </button>
        </form>

        <p className="mt-6 text-center">
          <Link href="/login" className="text-zenda-primary hover:text-zenda-dark font-medium">
            ← Voltar ao login
          </Link>
        </p>
      </div>
    </div>
  )
}

'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authApi } from '@/lib/api'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const uid = searchParams.get('uid') ?? ''
  const token = searchParams.get('token') ?? ''
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const valid = uid && token

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword.length < 8) {
      setError('A palavra-passe deve ter pelo menos 8 caracteres.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('As palavras-passe não coincidem.')
      return
    }
    setLoading(true)
    try {
      await authApi.confirmPasswordReset(uid, token, newPassword)
      setSuccess(true)
    } catch (err: any) {
      const msg = err.response?.data?.error ?? err.message ?? 'Link inválido ou expirado.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (!valid) {
    return (
      <div
        className="bg-zenda-bg w-full max-w-md mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12 lg:py-20 min-w-0 min-h-[calc(100vh-8rem)] flex flex-col justify-center"
        style={{
          paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0.75rem))',
          paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0.75rem))',
        }}
      >
        <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-zenda-container flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-zenda-debt" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Link inválido</h1>
          <p className="text-gray-600 mb-6">
            Este link de redefinição está incompleto ou expirado. Solicite um novo na página de recuperação.
          </p>
          <Link
            href="/login/forgot-password"
            className="inline-block w-full sm:w-auto bg-zenda-primary text-white text-center py-2.5 sm:py-3 px-6 rounded-lg hover:bg-zenda-dark transition font-semibold"
          >
            Pedir novo link
          </Link>
          <p className="mt-4">
            <Link href="/login" className="text-zenda-primary hover:text-zenda-dark font-medium">
              ← Voltar ao login
            </Link>
          </p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div
        className="bg-zenda-bg w-full max-w-md mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12 lg:py-20 min-w-0 min-h-[calc(100vh-8rem)] flex flex-col justify-center"
        style={{
          paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0.75rem))',
          paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0.75rem))',
        }}
      >
        <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm w-full text-center">
          <div className="w-14 h-14 rounded-full bg-zenda-growthContainer flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Palavra-passe alterada</h1>
          <p className="text-gray-600 mb-6">
            A sua palavra-passe foi alterada com sucesso. Pode entrar com a nova palavra-passe.
          </p>
          <Link
            href="/login"
            className="inline-block w-full sm:w-auto bg-zenda-primary text-white text-center py-2.5 sm:py-3 px-6 rounded-lg hover:bg-zenda-dark transition font-semibold"
          >
            Entrar
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
      <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm w-full">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 text-center">
          Nova palavra-passe
        </h1>
        <p className="text-gray-600 mb-6 text-center text-sm sm:text-base">
          Introduza a nova palavra-passe (mínimo 8 caracteres).
        </p>

        {error && (
          <div className="px-4 py-3 rounded-lg mb-6 bg-red-50 border border-red-200 text-red-800 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nova palavra-passe</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-zenda-primary focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar palavra-passe</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-zenda-primary focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={showConfirm ? 'Ocultar' : 'Mostrar'}
              >
                {showConfirm ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-zenda-primary text-white py-3 rounded-lg font-semibold hover:bg-zenda-dark transition disabled:opacity-50"
          >
            {loading ? 'A guardar...' : 'Alterar palavra-passe'}
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="bg-zenda-bg w-full max-w-md mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12 lg:py-20 min-w-0 min-h-[calc(100vh-8rem)] flex flex-col justify-center">
        <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-sm w-full text-center">
          <p className="text-gray-600">A carregar...</p>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}

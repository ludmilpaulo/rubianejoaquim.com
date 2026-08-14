'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { useLocale } from '@/contexts/LocaleContext'
import SocialLoginButtons from '@/components/SocialLoginButtons'
import ZendaLogo from '@/components/zenda/ZendaLogo'
import ZendaLoader from '@/components/zenda/ZendaLoader'
import ZendaButton from '@/components/zenda/ZendaButton'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { authApi } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/types/api'
import { safeAuthNext } from '@/lib/auth-next'

function LoginPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useLocale()
  const { login, register, applySession } = useAuthStore()
  const nextPath = safeAuthNext(searchParams.get('next'))

  const goAfterAuth = (isAdmin?: boolean) => {
    if (nextPath) {
      router.push(nextPath)
      return
    }
    router.push(isAdmin ? '/admin' : '/area-do-aluno')
  }
  const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'register')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [linkState, setLinkState] = useState<{
    link_token: string
    email: string
    provider: string
    message?: string
  } | null>(null)
  const [linkPassword, setLinkPassword] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    phone: '',
  })

  useEffect(() => {
    const social = searchParams.get('social')
    const status = searchParams.get('status')
    if (!social) return
    if (status === 'cancelled') {
      // Soft return — no error banner
      return
    }
    if (status === 'link_required') {
      setLinkState({
        link_token: searchParams.get('link_token') || '',
        email: searchParams.get('email') || '',
        provider: searchParams.get('provider') || social,
        message: t('auth.linkExists'),
      })
      return
    }
    if (status === 'error') {
      setError(searchParams.get('message') || t('auth.socialCallbackError'))
    }
  }, [searchParams, t])

  const handleLinkConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!linkState?.link_token || !linkPassword) return
    setLoading(true)
    setError('')
    try {
      const res = await authApi.socialLinkConfirm(linkState.link_token, linkPassword)
      if (res.data.token && res.data.user) {
        applySession(res.data.user, res.data.token)
        setLinkState(null)
        goAfterAuth(res.data.user.is_admin)
      }
    } catch (err) {
      setError(getApiErrorMessage(err, t('auth.linkFailed')))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        if (!formData.email || !formData.password) {
          setError(t('auth.fillRequired'))
          setLoading(false)
          return
        }
        await login(formData.email, formData.password)
        // Get updated user after login
        const updatedUser = useAuthStore.getState().user
        goAfterAuth(updatedUser?.is_admin)
      } else {
        // Validation for registration
        if (!formData.email || !formData.username || !formData.password || !formData.password_confirm) {
          setError(t('auth.fillRegisterRequired'))
          setLoading(false)
          return
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(formData.email)) {
          setError(t('auth.invalidEmail'))
          setLoading(false)
          return
        }
        
        // Username validation (alphanumeric, underscore, dot, hyphen, max 150 chars)
        const usernameRegex = /^[a-zA-Z0-9._-]+$/
        if (!usernameRegex.test(formData.username)) {
          setError(t('auth.invalidUsername'))
          setLoading(false)
          return
        }
        
        if (formData.username.length > 150) {
          setError(t('auth.usernameTooLong'))
          setLoading(false)
          return
        }
        
        // Password validation
        if (formData.password.length < 8) {
          setError(t('auth.passwordMin'))
          setLoading(false)
          return
        }
        
        if (formData.password !== formData.password_confirm) {
          setError(t('auth.passwordMismatch'))
          setLoading(false)
          return
        }
        
        await register({
          email: formData.email.trim(),
          username: formData.username.trim(),
          password: formData.password,
          password_confirm: formData.password_confirm,
          first_name: formData.first_name?.trim() || undefined,
          last_name: formData.last_name?.trim() || undefined,
          phone: formData.phone?.trim() || undefined,
        })
        goAfterAuth(false)
      }
    } catch (err: unknown) {
      const errorMessage = getApiErrorMessage(err, isLogin ? t('auth.loginFailed') : t('auth.registerFailed'))
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-zenda-bg min-h-[calc(100vh-4rem)]">
    <div
      className="w-full max-w-md mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12 lg:py-20 min-w-0 min-h-[calc(100vh-8rem)] flex flex-col justify-center"
      style={{
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left, 0.75rem))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right, 0.75rem))',
      }}
    >
      <div className="zenda-card p-4 sm:p-6 lg:p-8 w-full">
      <div className="flex justify-between items-center mb-4">
          <ZendaLogo size="md" priority />
          <LanguageSwitcher variant="product" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-zenda-navy mb-4 sm:mb-6 text-center">
          {isLogin ? t('auth.signIn') : t('auth.register')}
        </h1>

        {error && (
          <div className="px-4 py-3 rounded-lg mb-6 bg-red-50 border border-red-200 text-red-800">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <p className="font-semibold">
                  {/google|facebook|tiktok|social/i.test(error)
                    ? t('auth.socialFailed')
                    : isLogin ? t('auth.loginFailed') : t('auth.registerFailed')}
                </p>
                <div className="text-sm mt-1 whitespace-pre-line">
                  {error.split('\n').map((line, idx) => (
                    <p key={idx} className={idx > 0 ? 'mt-1' : ''}>{line}</p>
                  ))}
                </div>
                {/google|facebook|tiktok|social/i.test(error) ? (
                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => setError('')}
                      className="text-sm font-semibold underline"
                    >
                      {t('auth.tryAgain')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setError('')
                        document.getElementById('login-email')?.focus()
                      }}
                      className="text-sm font-semibold underline"
                    >
                      {t('auth.useEmail')}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {linkState && (
          <form onSubmit={handleLinkConfirm} className="mb-6 space-y-3 rounded-xl border border-zenda-border bg-zenda-container p-4">
            <p className="text-sm text-zenda-navy">
              {linkState.message || t('auth.linkExists')}
            </p>
            <p className="text-sm text-zenda-textSecondary">
              {t('auth.linkEmail')}: <strong>{linkState.email}</strong> · {t('auth.linkProvider')}: <strong>{linkState.provider}</strong>
            </p>
            <input
              type="password"
              required
              value={linkPassword}
              onChange={(e) => setLinkPassword(e.target.value)}
              placeholder={t('auth.linkPassword')}
              className="zenda-input text-sm"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 btn-zenda !py-2 text-sm disabled:opacity-50"
              >
                {t('auth.linkAndEnter')}
              </button>
              <button
                type="button"
                onClick={() => setLinkState(null)}
                className="px-3 py-2 text-sm text-zenda-navy"
              >
                {t('auth.cancel')}
              </button>
            </div>
          </form>
        )}

        <div className="mb-6">
          <SocialLoginButtons
            nextPath={nextPath}
            onError={setError}
            onLinkRequired={(payload) => {
              setLinkState({
                link_token: payload.link_token,
                email: payload.email,
                provider: payload.provider,
                message: payload.message,
              })
              setError('')
            }}
          />
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center" aria-hidden>
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-3 text-gray-500">{t('auth.or')}</span>
            </div>
          </div>
          <p className="text-center text-sm text-gray-600 mb-1">{t('auth.continueEmail')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('auth.username')}
                </label>
                <input
                  type="text"
                  required={!isLogin}
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 text-sm sm:text-base focus:ring-2 focus:ring-zenda-primary focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('auth.firstName')}
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 text-sm sm:text-base focus:ring-2 focus:ring-zenda-primary focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('auth.lastName')}
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 text-sm sm:text-base focus:ring-2 focus:ring-zenda-primary focus:border-transparent"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('auth.emailOrUsername')}
            </label>
            <input
              id="login-email"
              type="text"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={t('auth.emailPlaceholder')}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-zenda-primary focus:border-transparent"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.phone')}
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-zenda-primary focus:border-transparent"
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                {t('auth.password')}
              </label>
              {isLogin && (
                <Link href="/login/forgot-password" className="text-sm text-zenda-primary hover:text-zenda-dark">
                  {t('auth.forgotPassword')}
                </Link>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-zenda-primary focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none touch-target min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
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

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.passwordConfirm')}
              </label>
              <div className="relative">
                <input
                  type={showPasswordConfirm ? 'text' : 'password'}
                  required={!isLogin}
                  value={formData.password_confirm}
                  onChange={(e) => setFormData({ ...formData, password_confirm: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-10 focus:ring-2 focus:ring-zenda-primary focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none touch-target min-w-[44px] min-h-[44px] flex items-center justify-center"
                  aria-label={showPasswordConfirm ? t('auth.hideConfirm') : t('auth.showConfirm')}
                >
                  {showPasswordConfirm ? (
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
          )}

          <ZendaButton
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? t('auth.processing') : isLogin ? t('auth.signIn') : t('auth.register')}
          </ZendaButton>
        </form>

        <div className="mt-6 text-center space-y-2">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin)
              setError('')
            }}
            className="text-zenda-primary hover:text-zenda-dark font-semibold"
          >
            {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
          </button>
          <p className="text-xs text-gray-500">
            {t('auth.privacy')}{' '}
            <Link href="/privacy-policy" className="underline hover:text-gray-700">
              {t('auth.privacyPolicy')}
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
    </div>
  )
}

function LoginFallback() {
  const { t } = useLocale()
  return (
    <div className="flex justify-center py-20 bg-zenda-bg min-h-[50vh]">
      <ZendaLoader message={t('auth.loading')} />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageInner />
    </Suspense>
  )
}

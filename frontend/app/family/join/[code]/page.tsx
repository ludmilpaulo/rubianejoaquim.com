'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Cookies from 'js-cookie'
import { useAuthStore } from '@/lib/store'
import { useLocale } from '@/contexts/LocaleContext'
import { financeSpaceApi } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/types/api'
import ZendaLogo from '@/components/zenda/ZendaLogo'
import ZendaButton from '@/components/zenda/ZendaButton'
import ZendaLoader from '@/components/zenda/ZendaLoader'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import {
  ZENDA_APP_STORE_URL,
  ZENDA_PLAY_STORE_URL,
} from '@/lib/zenda-stores'

const COOKIE = 'pending_family_invite'

type Preview = {
  id: number
  name: string
  currency: string
  member_count: number
  require_approval: boolean
}

function interpolate(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, name: string) =>
    vars[name] !== undefined ? String(vars[name]) : `{{${name}}}`,
  )
}

export default function FamilyJoinPage() {
  const params = useParams<{ code: string }>()
  const code = String(params.code || '').trim().toUpperCase()
  const { t } = useLocale()
  const { user, token, checkAuth, isLoading: authLoading } = useAuthStore()
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    if (code) {
      Cookies.set(COOKIE, code, { expires: 14, sameSite: 'lax', path: '/' })
    }
    checkAuth()
  }, [code, checkAuth])

  useEffect(() => {
    if (!code) {
      setError(t('familyJoin.invalid'))
      setLoading(false)
      return
    }
    let cancelled = false
    financeSpaceApi
      .previewSpace(code)
      .then((data) => {
        if (!cancelled) setPreview(data)
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, t('familyJoin.invalid')))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [code, t])

  const join = async () => {
    setJoining(true)
    setStatus('')
    try {
      const result = (await financeSpaceApi.joinSpace(code)) as {
        status?: string
        code?: string
      }
      Cookies.remove(COOKIE, { path: '/' })
      if (result.status === 'pending') setStatus(t('familyJoin.pending'))
      else if (result.code === 'already_member') setStatus(t('familyJoin.already'))
      else setStatus(t('familyJoin.joined'))
    } catch (err) {
      setError(getApiErrorMessage(err, t('familyJoin.invalid')))
    } finally {
      setJoining(false)
    }
  }

  const next = `/family/join/${encodeURIComponent(code)}`
  const downloadHref = `/download?family=${encodeURIComponent(code)}`

  return (
    <main className="min-h-screen bg-zenda-bg text-zenda-navy flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-8">
          <ZendaLogo />
          <LanguageSwitcher variant="product" />
        </div>
        <h1 className="text-3xl font-bold mb-2">{t('familyJoin.title')}</h1>
        <p className="text-zenda-textSecondary mb-6">{t('familyJoin.subtitle')}</p>

        {loading || authLoading ? (
          <ZendaLoader />
        ) : error ? (
          <p className="text-zenda-expense mb-4">{error}</p>
        ) : preview ? (
          <div className="rounded-2xl bg-white/80 border border-zenda-primary/10 p-6 shadow-sm mb-6">
            <p className="text-lg font-semibold mb-2">
              {interpolate(t('familyJoin.invited'), { name: preview.name })}
            </p>
            <p className="text-sm text-zenda-textSecondary">
              {interpolate(t('familyJoin.members'), { count: preview.member_count })} · {t('familyJoin.currency')}: {preview.currency}
            </p>
            <p className="text-sm mt-2 font-mono">{t('familyJoin.code')}: {code}</p>
          </div>
        ) : null}

        {status ? <p className="mb-4 text-zenda-growth font-medium">{status}</p> : null}

        {user && token && preview && !status ? (
          <ZendaButton onClick={join} disabled={joining} className="w-full mb-4">
            {preview.require_approval ? t('familyJoin.request') : t('familyJoin.join')}
          </ZendaButton>
        ) : null}

        {!user || !token ? (
          <div className="flex flex-col gap-3 mb-6">
            <Link href={`/login?next=${encodeURIComponent(next)}`}>
              <ZendaButton className="w-full">{t('familyJoin.login')}</ZendaButton>
            </Link>
            <Link href={`/login?next=${encodeURIComponent(next)}&mode=register`}>
              <ZendaButton variant="outline" className="w-full">{t('familyJoin.register')}</ZendaButton>
            </Link>
          </div>
        ) : null}

        <p className="text-sm text-zenda-textSecondary mb-3">{t('familyJoin.download')}</p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a href={downloadHref} className="flex-1">
            <ZendaButton variant="secondary" className="w-full">{t('familyJoin.download')}</ZendaButton>
          </a>
          <a href={ZENDA_APP_STORE_URL} className="flex-1">
            <ZendaButton variant="outline" className="w-full">iOS</ZendaButton>
          </a>
          <a href={ZENDA_PLAY_STORE_URL} className="flex-1">
            <ZendaButton variant="outline" className="w-full">Android</ZendaButton>
          </a>
        </div>
      </div>
    </main>
  )
}

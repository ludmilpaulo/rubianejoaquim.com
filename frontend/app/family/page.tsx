'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { useLocale } from '@/contexts/LocaleContext'
import { financeSpaceApi, type FamilyDashboard, type FamilySpaceSummary } from '@/lib/api'
import { getApiErrorMessage } from '@/lib/types/api'
import ZendaLogo from '@/components/zenda/ZendaLogo'
import ZendaButton from '@/components/zenda/ZendaButton'
import ZendaLoader from '@/components/zenda/ZendaLoader'
import LanguageSwitcher from '@/components/LanguageSwitcher'

export default function FamilyDashboardPage() {
  const { t } = useLocale()
  const { user, token, checkAuth, isLoading: authLoading } = useAuthStore()
  const [spaces, setSpaces] = useState<FamilySpaceSummary[]>([])
  const [selected, setSelected] = useState<FamilySpaceSummary | null>(null)
  const [dashboard, setDashboard] = useState<FamilyDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (authLoading) return
    if (!token || !user) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    financeSpaceApi
      .listSpaces()
      .then((list) => {
        if (cancelled) return
        setSpaces(list)
        setSelected(list[0] || null)
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, t('familySpace.empty')))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [authLoading, token, user, t])

  useEffect(() => {
    if (!selected || !token) {
      setDashboard(null)
      return
    }
    let cancelled = false
    financeSpaceApi
      .getDashboard(selected.id)
      .then((data) => {
        if (!cancelled) setDashboard(data)
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, t('familySpace.empty')))
      })
    return () => {
      cancelled = true
    }
  }, [selected, token, t])

  const cards = dashboard
    ? [
        [t('familySpace.income'), dashboard.income],
        [t('familySpace.expenses'), dashboard.expenses],
        [t('familySpace.balance'), dashboard.balance],
        [t('familySpace.savings'), dashboard.savings],
        [t('familySpace.debts'), dashboard.debts],
        [t('familySpace.budget'), `${Math.round(dashboard.budget_pct)}%`],
      ]
    : []

  return (
    <main className="min-h-screen bg-zenda-bg text-zenda-navy px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <ZendaLogo />
          <LanguageSwitcher variant="product" />
        </div>
        <h1 className="text-3xl font-bold mb-2">{t('familySpace.title')}</h1>
        <p className="text-zenda-textSecondary mb-6">{t('familySpace.subtitle')}</p>

        {loading || authLoading ? (
          <ZendaLoader />
        ) : !user || !token ? (
          <Link href="/login?next=/family">
            <ZendaButton>{t('familySpace.login')}</ZendaButton>
          </Link>
        ) : error ? (
          <p className="text-zenda-expense mb-4">{error}</p>
        ) : spaces.length === 0 ? (
          <p className="text-zenda-textSecondary">{t('familySpace.empty')}</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-6">
              {spaces.map((space) => (
                <button
                  key={space.id}
                  type="button"
                  onClick={() => setSelected(space)}
                  className={`rounded-full px-4 py-2 text-sm border ${
                    selected?.id === space.id
                      ? 'bg-zenda-primary text-white border-zenda-primary'
                      : 'bg-white border-zenda-primary/20'
                  }`}
                >
                  {space.name}
                </button>
              ))}
            </div>
            {dashboard ? (
              <>
                <p className="text-sm text-zenda-textSecondary mb-4 font-mono">
                  {selected?.name} · {dashboard.currency}
                </p>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {cards.map(([label, value]) => (
                    <div key={label} className="rounded-2xl bg-white/80 border border-zenda-primary/10 p-4">
                      <p className="text-xs text-zenda-textSecondary">{label}</p>
                      <p className="text-xl font-semibold mt-1">
                        {label === t('familySpace.budget') ? value : `${value} ${dashboard.currency}`}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl bg-white/80 border border-zenda-primary/10 p-4 mb-4">
                  <p className="font-semibold mb-2">{t('familySpace.members')}</p>
                  {dashboard.members.map((m) => (
                    <p key={m.id} className="text-sm">
                      {m.display_name || m.user_email} · {m.role}
                    </p>
                  ))}
                </div>
                <div className="rounded-2xl bg-white/80 border border-zenda-primary/10 p-4 mb-4">
                  <p className="font-semibold mb-2">{t('familySpace.upcoming')}</p>
                  {dashboard.upcoming.length === 0 ? (
                    <p className="text-sm text-zenda-textSecondary">{t('familySpace.noActivity')}</p>
                  ) : (
                    dashboard.upcoming.map((item) => (
                      <p key={item.id} className="text-sm">
                        {item.title} · {item.amount} {item.currency}
                        {item.due_date ? ` · ${item.due_date}` : ''}
                      </p>
                    ))
                  )}
                </div>
                <div className="rounded-2xl bg-white/80 border border-zenda-primary/10 p-4 mb-6">
                  <p className="font-semibold mb-2">{t('familySpace.activity')}</p>
                  {dashboard.activity.length === 0 ? (
                    <p className="text-sm text-zenda-textSecondary">{t('familySpace.noActivity')}</p>
                  ) : (
                    dashboard.activity.slice(0, 8).map((a) => (
                      <p key={a.id} className="text-sm">{a.message}</p>
                    ))
                  )}
                </div>
              </>
            ) : (
              <ZendaLoader />
            )}
          </>
        )}

        <p className="text-sm text-zenda-textSecondary mt-8">{t('familySpace.openApp')}</p>
        <Link href="/download" className="inline-block mt-3">
          <ZendaButton variant="outline">{t('familyJoin.download')}</ZendaButton>
        </Link>
      </div>
    </main>
  )
}

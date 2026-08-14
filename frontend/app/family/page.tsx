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

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export default function FamilyDashboardPage() {
  const { t } = useLocale()
  const { user, token, checkAuth, isLoading: authLoading } = useAuthStore()
  const [spaces, setSpaces] = useState<FamilySpaceSummary[]>([])
  const [selected, setSelected] = useState<FamilySpaceSummary | null>(null)
  const [dashboard, setDashboard] = useState<FamilyDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('AOA')
  const [inviteCode, setInviteCode] = useState('')
  const [entryTitle, setEntryTitle] = useState('')
  const [entryAmount, setEntryAmount] = useState('')
  const [entryCurrency, setEntryCurrency] = useState('AOA')
  const [entryKind, setEntryKind] = useState<'expense' | 'income'>('expense')
  const [budgetName, setBudgetName] = useState('')
  const [budgetAmount, setBudgetAmount] = useState('')
  const [goalTitle, setGoalTitle] = useState('')
  const [goalAmount, setGoalAmount] = useState('')

  useEffect(() => {
    void checkAuth()
  }, [checkAuth])

  const refreshSpaces = async () => {
    const list = await financeSpaceApi.listSpaces()
    setSpaces(list)
    setSelected((current) => {
      if (current) return list.find((s) => s.id === current.id) || list[0] || null
      return list[0] || null
    })
  }

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
        if (!cancelled) {
          setDashboard(data)
          setEntryCurrency(data.currency)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err, t('familySpace.empty')))
      })
    return () => {
      cancelled = true
    }
  }, [selected, token, t])

  const run = async (fn: () => Promise<void>, successKey: string, failKey: string) => {
    setSaving(true)
    setError('')
    setStatus('')
    try {
      await fn()
      setStatus(t(successKey))
      if (selected) {
        const data = await financeSpaceApi.getDashboard(selected.id)
        setDashboard(data)
      }
      await refreshSpaces()
    } catch (err) {
      setError(getApiErrorMessage(err, t(failKey)))
    } finally {
      setSaving(false)
    }
  }

  const cards = dashboard
    ? [
        [t('familySpace.balance'), dashboard.balance],
        [t('familySpace.income'), dashboard.income],
        [t('familySpace.expenses'), dashboard.expenses],
        [t('familySpace.savings'), dashboard.savings],
        [t('familySpace.debts'), dashboard.debts],
        [t('familySpace.budget'), `${Math.round(dashboard.budget_pct)}%`],
      ]
    : []

  const hasSetup = Boolean(
    dashboard &&
      (Number(dashboard.income) !== 0 ||
        Number(dashboard.expenses) !== 0 ||
        (dashboard.budgets || []).length > 0 ||
        (dashboard.goals || []).length > 0 ||
        dashboard.activity.length > 0),
  )

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
        ) : (
          <>
            {error ? <p className="text-zenda-expense mb-4">{error}</p> : null}
            {status ? <p className="text-zenda-growth mb-4">{status}</p> : null}

            {spaces.length === 0 ? (
              <div className="rounded-2xl bg-white/80 border border-zenda-primary/10 p-6 mb-6">
                <p className="font-semibold mb-2">{t('familySpace.notSetUp')}</p>
                <p className="text-sm text-zenda-textSecondary mb-4">{t('familySpace.empty')}</p>
                <form
                  className="grid gap-3 mb-6"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!name.trim()) return
                    void run(async () => {
                      const space = await financeSpaceApi.createSpace({
                        name: name.trim(),
                        currency,
                        require_approval: true,
                      })
                      setName('')
                      setSelected(space)
                    }, 'familySpace.created', 'familySpace.createFailed')
                  }}
                >
                  <input
                    className="rounded-xl border border-zenda-primary/20 px-3 py-2"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('familySpace.familyName')}
                  />
                  <select
                    className="rounded-xl border border-zenda-primary/20 px-3 py-2"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                  >
                    {['AOA', 'ZAR', 'USD', 'EUR'].map((code) => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                  <ZendaButton type="submit" disabled={saving || !name.trim()}>
                    {saving ? t('familySpace.saving') : t('familySpace.create')}
                  </ZendaButton>
                </form>
                <form
                  className="grid gap-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!inviteCode.trim()) return
                    void run(async () => {
                      await financeSpaceApi.joinSpace(inviteCode.trim())
                      setInviteCode('')
                    }, 'familySpace.joined', 'familyJoin.invalid')
                  }}
                >
                  <input
                    className="rounded-xl border border-zenda-primary/20 px-3 py-2 font-mono uppercase"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder={t('familyJoin.code')}
                  />
                  <ZendaButton type="submit" variant="outline" disabled={saving || !inviteCode.trim()}>
                    {t('familyJoin.join')}
                  </ZendaButton>
                </form>
              </div>
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
                {dashboard && selected ? (
                  <>
                    <p className="text-sm text-zenda-textSecondary mb-4 font-mono">
                      {selected.name} · {dashboard.currency}
                      {selected.invite_code ? ` · ${t('familyJoin.code')}: ${selected.invite_code}` : ''}
                    </p>
                    {!hasSetup ? (
                      <p className="mb-4 text-zenda-textSecondary">{t('familySpace.notSetUp')}</p>
                    ) : null}
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
                    {(dashboard.budgets || []).map((b) => {
                      const pct = Number(b.amount) > 0 ? Math.min(100, Math.round((Number(b.spent) / Number(b.amount)) * 100)) : 0
                      return (
                        <div key={b.id} className="rounded-2xl bg-white/80 border border-zenda-primary/10 p-4 mb-4">
                          <p className="font-semibold">{b.name}</p>
                          <p className="text-sm">{b.spent} / {b.amount} {b.currency} · {pct}%</p>
                          <div className="h-2 rounded-full bg-zenda-primary/10 mt-2 overflow-hidden">
                            <div className="h-2 bg-zenda-primary" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                    {(dashboard.goals || []).map((g) => {
                      const pct = Math.round(g.progress_percentage ?? 0)
                      return (
                        <div key={g.id} className="rounded-2xl bg-white/80 border border-zenda-primary/10 p-4 mb-4">
                          <p className="font-semibold">{g.title}</p>
                          <p className="text-sm">
                            {g.current_amount} / {g.target_amount} {g.currency} · {pct}%
                          </p>
                          <div className="h-2 rounded-full bg-zenda-primary/10 mt-2 overflow-hidden">
                            <div className="h-2 bg-zenda-primary" style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                        </div>
                      )
                    })}
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
                    <div className="rounded-2xl bg-white/80 border border-zenda-primary/10 p-4 mb-4 grid gap-3">
                      <p className="font-semibold">{t('familySpace.addEntry')}</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className={`rounded-full px-3 py-1 text-sm border ${entryKind === 'expense' ? 'bg-zenda-primary text-white' : 'bg-white'}`}
                          onClick={() => setEntryKind('expense')}
                        >
                          {t('familySpace.addExpense')}
                        </button>
                        <button
                          type="button"
                          className={`rounded-full px-3 py-1 text-sm border ${entryKind === 'income' ? 'bg-zenda-primary text-white' : 'bg-white'}`}
                          onClick={() => setEntryKind('income')}
                        >
                          {t('familySpace.addIncome')}
                        </button>
                      </div>
                      <input className="rounded-xl border border-zenda-primary/20 px-3 py-2" value={entryTitle} onChange={(e) => setEntryTitle(e.target.value)} placeholder={t('familySpace.entryTitle')} />
                      <input className="rounded-xl border border-zenda-primary/20 px-3 py-2" value={entryAmount} onChange={(e) => setEntryAmount(e.target.value)} placeholder={t('familySpace.amount')} />
                      <select className="rounded-xl border border-zenda-primary/20 px-3 py-2" value={entryCurrency} onChange={(e) => setEntryCurrency(e.target.value)}>
                        {['AOA', 'ZAR', 'USD', 'EUR'].map((code) => (
                          <option key={code} value={code}>{code}</option>
                        ))}
                      </select>
                      <ZendaButton
                        disabled={saving || !entryTitle.trim() || !entryAmount}
                        onClick={() =>
                          void run(async () => {
                            await financeSpaceApi.createEntry({
                              space: selected.id,
                              kind: entryKind,
                              title: entryTitle.trim(),
                              amount: entryAmount,
                              currency: entryCurrency,
                              date: todayIso(),
                            })
                            setEntryTitle('')
                            setEntryAmount('')
                          }, entryKind === 'income' ? 'familySpace.savedIncome' : 'familySpace.savedExpense', entryKind === 'income' ? 'familySpace.addIncomeFailed' : 'familySpace.addExpenseFailed')
                        }
                      >
                        {saving ? t('familySpace.saving') : t('familySpace.save')}
                      </ZendaButton>
                      <input className="rounded-xl border border-zenda-primary/20 px-3 py-2" value={budgetName} onChange={(e) => setBudgetName(e.target.value)} placeholder={t('familySpace.addBudget')} />
                      <input className="rounded-xl border border-zenda-primary/20 px-3 py-2" value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} placeholder={t('familySpace.amount')} />
                      <ZendaButton
                        variant="outline"
                        disabled={saving || !budgetName.trim() || !budgetAmount}
                        onClick={() =>
                          void run(async () => {
                            await financeSpaceApi.createBudget({
                              space: selected.id,
                              name: budgetName.trim(),
                              amount: budgetAmount,
                              currency: entryCurrency,
                            })
                            setBudgetName('')
                            setBudgetAmount('')
                          }, 'familySpace.savedBudget', 'familySpace.addBudgetFailed')
                        }
                      >
                        {saving ? t('familySpace.saving') : t('familySpace.addBudget')}
                      </ZendaButton>
                      <input className="rounded-xl border border-zenda-primary/20 px-3 py-2" value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} placeholder={t('familySpace.addGoal')} />
                      <input className="rounded-xl border border-zenda-primary/20 px-3 py-2" value={goalAmount} onChange={(e) => setGoalAmount(e.target.value)} placeholder={t('familySpace.amount')} />
                      <ZendaButton
                        variant="outline"
                        disabled={saving || !goalTitle.trim() || !goalAmount}
                        onClick={() =>
                          void run(async () => {
                            await financeSpaceApi.createGoal({
                              space: selected.id,
                              title: goalTitle.trim(),
                              target_amount: goalAmount,
                              currency: entryCurrency,
                            })
                            setGoalTitle('')
                            setGoalAmount('')
                          }, 'familySpace.savedGoal', 'familySpace.addGoalFailed')
                        }
                      >
                        {saving ? t('familySpace.saving') : t('familySpace.addGoal')}
                      </ZendaButton>
                    </div>
                  </>
                ) : (
                  <ZendaLoader />
                )}
              </>
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

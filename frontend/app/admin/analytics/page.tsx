'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { adminApi } from '@/lib/api'
import { logger } from '@/lib/logger'
import ZendaPageLoading from '@/components/zenda/ZendaPageLoading'
import type { SubscriptionAnalytics } from '@/lib/types/subscriptions'

interface CourseStats {
  total_courses: number
  active_courses: number
  total_lessons: number
  free_lessons: number
  total_enrollments: number
  active_enrollments: number
  pending_enrollments: number
  total_users: number
  total_mentorship_requests: number
  pending_payments: number
  approved_payments: number
  rejected_payments: number
  total_progress: number
  pending_mobile_subscription_proofs?: number
}

function isAdminUser(user: {
  is_admin?: boolean
  is_staff?: boolean
  is_superuser?: boolean
} | null) {
  return Boolean(user?.is_admin || user?.is_staff || user?.is_superuser)
}

function pct(part: number, total: number) {
  if (!total) return 0
  return Math.min(100, Math.round((part / total) * 100))
}

function MetricCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: number | string
  hint?: string
  tone?: 'default' | 'warn' | 'growth'
}) {
  const toneClass =
    tone === 'warn'
      ? 'from-amber-50/80 to-white border-amber-200/70'
      : tone === 'growth'
        ? 'from-emerald-50/70 to-white border-emerald-200/60'
        : 'from-white to-zenda-container/40 border-zenda-border'

  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-5 sm:p-6 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zenda-textSecondary">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-zenda-navy tabular-nums">
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-zenda-textSecondary">{hint}</p> : null}
    </div>
  )
}

function AnalyticsBar({
  label,
  value,
  total,
  color = 'bg-zenda-primary',
}: {
  label: string
  value: number
  total: number
  color?: string
}) {
  const width = pct(value, total)
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
        <span className="text-zenda-textSecondary">{label}</span>
        <span className="font-semibold tabular-nums text-zenda-navy">
          {value}
          <span className="ml-1.5 text-xs font-medium text-zenda-textSecondary">{width}%</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-zenda-bg">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

function Panel({
  title,
  children,
  action,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-zenda-border bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-zenda-navy">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  )
}

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const { user, checkAuth, isLoading } = useAuthStore()
  const [mounted, setMounted] = useState(false)
  const [stats, setStats] = useState<CourseStats | null>(null)
  const [subAnalytics, setSubAnalytics] = useState<SubscriptionAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [range, setRange] = useState('6m')

  useEffect(() => {
    setMounted(true)
    checkAuth().then(() => {
      const currentUser = useAuthStore.getState().user
      if (!isAdminUser(currentUser)) {
        router.push('/login')
      }
    })
  }, [checkAuth, router])

  useEffect(() => {
    if (!mounted || !isAdminUser(user)) return
    void fetchAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch when range changes
  }, [mounted, user, range])

  const fetchAll = async () => {
    try {
      setLoading(true)
      setLoadError(false)
      const [statsRes, subRes] = await Promise.all([
        adminApi.stats(),
        adminApi.subscriptions.analytics(range).catch((error: unknown) => {
          logger.error('Error fetching subscription analytics:', error)
          return null
        }),
      ])
      setStats(statsRes.data as CourseStats)
      setSubAnalytics(subRes?.data ? (subRes.data as SubscriptionAnalytics) : null)
    } catch (error: unknown) {
      logger.error('Error fetching analytics:', error)
      setLoadError(true)
      setStats(null)
    } finally {
      setLoading(false)
    }
  }

  if (!mounted || isLoading) {
    return <ZendaPageLoading />
  }

  if (!isAdminUser(user)) {
    return null
  }

  if (loading && !stats) {
    return <ZendaPageLoading message="A carregar analytics…" />
  }

  if (loadError || !stats) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zenda-bg px-4 text-center">
        <p className="mb-4 text-zenda-navy">Não foi possível carregar as estatísticas.</p>
        <button
          type="button"
          onClick={() => void fetchAll()}
          className="rounded-xl bg-zenda-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zenda-dark"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  const paymentTotal = Math.max(
    1,
    stats.approved_payments + stats.pending_payments + stats.rejected_payments,
  )
  const maxRevenue = Math.max(
    1,
    ...(subAnalytics?.revenue_series.map((p) => p.amount) ?? [1]),
  )

  return (
    <div className="min-h-screen bg-zenda-bg">
      <div className="relative overflow-hidden border-b border-zenda-border bg-gradient-to-br from-zenda-navy via-[#1e1b4b] to-zenda-primary">
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <Link
            href="/admin"
            className="text-sm font-medium text-white/70 transition hover:text-white"
          >
            ← Consola admin
          </Link>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Analytics
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/70 sm:text-base">
            Visão completa de cursos, matrículas, pagamentos e subscrições da app Zenda.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {[
              { href: '/admin/subscriptions', label: 'Subscrições' },
              { href: '/admin/cms/analytics', label: 'CMS' },
              { href: '/admin/payments', label: 'Pagamentos' },
              { href: '/admin/enrollments', label: 'Matrículas' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Utilizadores"
            value={stats.total_users}
            hint="Contas registadas"
            tone="growth"
          />
          <MetricCard
            label="Cursos"
            value={stats.total_courses}
            hint={`${stats.active_courses} activos`}
          />
          <MetricCard
            label="Matrículas activas"
            value={stats.active_enrollments}
            hint={`${stats.pending_enrollments} pendentes`}
          />
          <MetricCard
            label="Aulas concluídas"
            value={stats.total_progress}
            hint="Progresso total"
          />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-3">
          <Panel title="Cursos e aulas">
            <div className="space-y-4">
              <AnalyticsBar
                label="Cursos activos"
                value={stats.active_courses}
                total={stats.total_courses || 1}
              />
              <AnalyticsBar
                label="Aulas grátis"
                value={stats.free_lessons}
                total={stats.total_lessons || 1}
                color="bg-emerald-500"
              />
              <div className="flex justify-between border-t border-zenda-border pt-3 text-sm">
                <span className="text-zenda-textSecondary">Total de aulas</span>
                <span className="font-semibold tabular-nums text-zenda-navy">{stats.total_lessons}</span>
              </div>
            </div>
          </Panel>

          <Panel title="Matrículas">
            <div className="space-y-4">
              <AnalyticsBar
                label="Activas"
                value={stats.active_enrollments}
                total={stats.total_enrollments || 1}
                color="bg-emerald-500"
              />
              <AnalyticsBar
                label="Pendentes"
                value={stats.pending_enrollments}
                total={stats.total_enrollments || 1}
                color="bg-amber-500"
              />
              <div className="flex justify-between border-t border-zenda-border pt-3 text-sm">
                <span className="text-zenda-textSecondary">Total</span>
                <span className="font-semibold tabular-nums text-zenda-navy">
                  {stats.total_enrollments}
                </span>
              </div>
            </div>
          </Panel>

          <Panel title="Pagamentos (cursos)">
            <div className="space-y-4">
              <AnalyticsBar
                label="Aprovados"
                value={stats.approved_payments}
                total={paymentTotal}
                color="bg-emerald-500"
              />
              <AnalyticsBar
                label="Pendentes"
                value={stats.pending_payments}
                total={paymentTotal}
                color="bg-amber-500"
              />
              <AnalyticsBar
                label="Rejeitados"
                value={stats.rejected_payments}
                total={paymentTotal}
                color="bg-rose-500"
              />
            </div>
          </Panel>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Panel title="Mentoria e app">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zenda-textSecondary">Pedidos de mentoria</span>
                <span className="font-semibold tabular-nums text-zenda-navy">
                  {stats.total_mentorship_requests}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zenda-textSecondary">Comprovativos app pendentes</span>
                <span className="font-semibold tabular-nums text-zenda-navy">
                  {stats.pending_mobile_subscription_proofs ?? 0}
                </span>
              </div>
            </div>
          </Panel>

          <Panel
            title="Receita app (subscrições)"
            action={
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="rounded-lg border border-zenda-border bg-zenda-bg px-2.5 py-1.5 text-xs font-medium text-zenda-navy"
                aria-label="Intervalo de receita"
              >
                <option value="30d">30 dias</option>
                <option value="6m">6 meses</option>
                <option value="12m">12 meses</option>
              </select>
            }
          >
            {subAnalytics ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-zenda-textSecondary">Utilizadores</p>
                    <p className="mt-1 font-display text-xl font-semibold tabular-nums text-zenda-navy">
                      {subAnalytics.kpis.total_users.value}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zenda-textSecondary">Activas</p>
                    <p className="mt-1 font-display text-xl font-semibold tabular-nums text-zenda-navy">
                      {subAnalytics.kpis.active_subscriptions.value}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zenda-textSecondary">Mês actual</p>
                    <p className="mt-1 font-display text-xl font-semibold tabular-nums text-zenda-navy">
                      {Math.round(subAnalytics.kpis.monthly_revenue.value).toLocaleString('pt-PT')}
                      <span className="ml-1 text-xs font-medium text-zenda-textSecondary">
                        {subAnalytics.kpis.monthly_revenue.currency ??
                          subAnalytics.pricing?.currency ??
                          'AOA'}
                      </span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zenda-textSecondary">A expirar</p>
                    <p className="mt-1 font-display text-xl font-semibold tabular-nums text-zenda-navy">
                      {subAnalytics.kpis.expiring_soon.value}
                    </p>
                  </div>
                </div>
                {subAnalytics.revenue_series.length > 0 ? (
                  <div className="flex h-28 items-end gap-1">
                    {subAnalytics.revenue_series.map((point) => (
                      <div
                        key={point.period}
                        className="group relative flex min-w-0 flex-1 flex-col items-center justify-end"
                        title={`${point.label}: ${point.amount}`}
                      >
                        <div
                          className="w-full max-w-[28px] rounded-t-md bg-zenda-primary/80 transition group-hover:bg-zenda-primary"
                          style={{
                            height: `${Math.max(4, (point.amount / maxRevenue) * 100)}%`,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zenda-textSecondary">Sem dados de receita neste período.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-zenda-textSecondary">
                Não foi possível carregar analytics de subscrições.
              </p>
            )}
          </Panel>
        </div>

        {subAnalytics?.plan_performance?.length ? (
          <Panel
            title="Planos da app"
            action={
              <Link href="/admin/subscriptions" className="text-xs font-semibold text-zenda-primary hover:underline">
                Ver subscrições
              </Link>
            }
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {subAnalytics.plan_performance.map((plan) => (
                <div key={plan.plan} className="rounded-xl bg-zenda-bg px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zenda-textSecondary">
                    {plan.plan}
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-zenda-navy">
                    {plan.users}
                  </p>
                  <p className="text-xs text-zenda-textSecondary">{plan.pct}%</p>
                </div>
              ))}
            </div>
          </Panel>
        ) : null}

        {subAnalytics?.users_by_country?.length ? (
          <div className="mt-8">
            <Panel
              title="Utilizadores da app por país"
              action={
                <Link
                  href="/admin/subscriptions"
                  className="text-xs font-semibold text-zenda-primary hover:underline"
                >
                  Ver subscrições
                </Link>
              }
            >
              <div className="space-y-4">
                {subAnalytics.users_by_country.map((row) => {
                  const code = (row.country || '').toUpperCase()
                  const label =
                    !code || code === 'UNKNOWN'
                      ? 'Desconhecido'
                      : new Intl.DisplayNames(['pt-PT'], { type: 'region' }).of(code) || code
                  return (
                    <div key={code || 'unknown'}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                        <span className="text-zenda-textSecondary">
                          {label}
                          {code && code !== 'UNKNOWN' ? (
                            <span className="ml-1.5 text-xs text-zenda-textSecondary/80">{code}</span>
                          ) : null}
                        </span>
                        <span className="font-semibold tabular-nums text-zenda-navy">
                          {row.users}
                          <span className="ml-1.5 text-xs font-medium text-zenda-textSecondary">
                            {row.pct}% · {row.active} activos
                          </span>
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-zenda-bg">
                        <div
                          className="h-full rounded-full bg-zenda-primary"
                          style={{ width: `${row.pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </Panel>
          </div>
        ) : null}
      </div>
    </div>
  )
}

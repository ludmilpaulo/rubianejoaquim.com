'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { adminApi, getFullUrl } from '@/lib/api'
import { logger } from '@/lib/logger'
import { useLocale, useTranslations } from '@/contexts/LocaleContext'
import {
  downloadBlob,
  formatMoney,
  formatOpsDate,
  formatOpsDateTime,
  interpolate,
  METHOD_LABEL_KEYS,
  PLAN_LABEL_KEYS,
} from '@/lib/admin-subs-format'
import type {
  AdminPaymentProof,
  AdminSubscription,
  AdminUserSearchResult,
  PlanTier,
  ProofStatus,
  SubscriptionAnalytics,
  SubscriptionListParams,
} from '@/lib/types/subscriptions'
import { unwrapList } from '@/lib/types/subscriptions'
import OpsShell from './OpsShell'
import PaymentsLedger from './PaymentsLedger'
import { ConfirmModal, EmptyState, ErrorState, Skeleton, Sparkline, StatusBadge } from './OpsUi'

type ConfirmKind = 'cancel' | 'reject' | 'refund' | 'pause'

export default function SubscriptionsDashboard() {
  const t = useTranslations()
  const { locale } = useLocale()
  const router = useRouter()

  const [analytics, setAnalytics] = useState<SubscriptionAnalytics | null>(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [analyticsError, setAnalyticsError] = useState(false)
  const [revenueRange, setRevenueRange] = useState('6m')

  const [subs, setSubs] = useState<AdminSubscription[]>([])
  const [subCount, setSubCount] = useState(0)
  const [subsLoading, setSubsLoading] = useState(true)
  const [subsError, setSubsError] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [status, setStatus] = useState('')
  const [plan, setPlan] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [currency, setCurrency] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [dateField, setDateField] = useState<'created' | 'renewal' | 'payment'>('created')
  const [expiring, setExpiring] = useState('')
  const [failedToday, setFailedToday] = useState('')

  const [proofs, setProofs] = useState<AdminPaymentProof[]>([])
  const [proofsLoading, setProofsLoading] = useState(true)
  const [proofStatus, setProofStatus] = useState<ProofStatus | ''>('pending')
  const [receipt, setReceipt] = useState<AdminPaymentProof | null>(null)

  const [openMenu, setOpenMenu] = useState<number | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [actingId, setActingId] = useState<number | null>(null)
  const [confirm, setConfirm] = useState<{ kind: ConfirmKind; id: number } | { kind: null; id: null }>({
    kind: null,
    id: null,
  })

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(q), 280)
    return () => window.clearTimeout(timer)
  }, [q])

  const listParams = useMemo<SubscriptionListParams>(
    () => ({
      q: debouncedQ || undefined,
      status: status || undefined,
      plan: plan || undefined,
      payment_status: paymentStatus || undefined,
      currency: currency || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      date_field: dateField,
      page,
      page_size: pageSize,
      expiring: expiring || undefined,
      failed_today: failedToday || undefined,
    }),
    [debouncedQ, status, plan, paymentStatus, currency, dateFrom, dateTo, dateField, page, pageSize, expiring, failedToday],
  )

  const loadAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true)
      setAnalyticsError(false)
      const res = await adminApi.subscriptions.analytics(revenueRange)
      setAnalytics(res.data)
    } catch (err) {
      logger.error('Failed to load subscription analytics', err)
      setAnalyticsError(true)
    } finally {
      setAnalyticsLoading(false)
    }
  }, [revenueRange])

  const loadSubs = useCallback(async () => {
    try {
      setSubsLoading(true)
      setSubsError(false)
      const res = await adminApi.subscriptions.list(listParams)
      const { results, count } = unwrapList<AdminSubscription>(res.data)
      setSubs(results)
      setSubCount(count)
    } catch (err) {
      logger.error('Failed to load subscriptions', err)
      setSubsError(true)
      setSubs([])
    } finally {
      setSubsLoading(false)
    }
  }, [listParams])

  const loadProofs = useCallback(async () => {
    try {
      setProofsLoading(true)
      const res = await adminApi.subscriptions.paymentProofs.list({
        status: proofStatus || undefined,
        page_size: 50,
      })
      const { results } = unwrapList<AdminPaymentProof>(res.data)
      setProofs(results)
    } catch (err) {
      logger.error('Failed to load payment proofs', err)
      setProofs([])
    } finally {
      setProofsLoading(false)
    }
  }, [proofStatus])

  useEffect(() => {
    void loadAnalytics()
  }, [loadAnalytics])

  useEffect(() => {
    void loadSubs()
  }, [loadSubs])

  useEffect(() => {
    void loadProofs()
  }, [loadProofs])

  const refreshAll = () => {
    void loadAnalytics()
    void loadSubs()
    void loadProofs()
  }

  const clearFilters = () => {
    setQ('')
    setDebouncedQ('')
    setStatus('')
    setPlan('')
    setPaymentStatus('')
    setCurrency('')
    setDateFrom('')
    setDateTo('')
    setDateField('created')
    setExpiring('')
    setFailedToday('')
    setPage(1)
  }

  const runAction = async (id: number, fn: () => Promise<unknown>) => {
    try {
      setActingId(id)
      await fn()
      refreshAll()
    } catch (err) {
      logger.error('Subscription admin action failed', err)
    } finally {
      setActingId(null)
      setOpenMenu(null)
    }
  }

  const confirmCopy = {
    cancel: t('adminSubs.confirmCancel'),
    reject: t('adminSubs.confirmReject'),
    refund: t('adminSubs.confirmRefund'),
    pause: t('adminSubs.confirmPause'),
  }

  const onConfirm = async () => {
    if (!confirm.kind || !confirm.id) return
    const id = confirm.id
    const kind = confirm.kind
    setConfirm({ kind: null, id: null })
    if (kind === 'cancel') await runAction(id, () => adminApi.subscriptions.deactivate(id))
    if (kind === 'pause') await runAction(id, () => adminApi.subscriptions.pause(id))
    if (kind === 'refund') await runAction(id, () => adminApi.subscriptions.refund(id))
    if (kind === 'reject') await runAction(id, () => adminApi.subscriptions.paymentProofs.reject(id))
  }

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    setExportOpen(false)
    try {
      const res = await adminApi.subscriptions.export({ ...listParams, export_format: format })
      const ext = format === 'xlsx' ? 'xls' : format === 'pdf' ? 'txt' : 'csv'
      downloadBlob(res.data as Blob, `zenda-subscriptions.${ext}`)
    } catch (err) {
      logger.error('Export failed', err)
    }
  }

  const from = subCount === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, subCount)
  const pages = Math.max(1, Math.ceil(subCount / pageSize))
  const notificationCount = analytics?.proofs.pending ?? 0

  return (
    <OpsShell notificationCount={notificationCount}>
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <p className="text-sm mb-2" style={{ color: 'var(--ops-muted)' }}>
            {t('adminSubs.breadcrumbHome')} / {t('adminSubs.breadcrumbSubs')}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t('adminSubs.title')}</h1>
          <p className="mt-1" style={{ color: 'var(--ops-muted)' }}>
            {t('adminSubs.subtitle')}
          </p>
        </div>
        <button type="button" className="ops-btn ops-btn-primary" onClick={() => setCreateOpen(true)}>
          + {t('adminSubs.create')}
        </button>
      </div>

      {analyticsError && (
        <div className="mb-6">
          <ErrorState
            title={t('adminSubs.errorTitle')}
            body={t('adminSubs.errorBody')}
            retryLabel={t('adminSubs.tryAgain')}
            onRetry={loadAnalytics}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {analyticsLoading || !analytics ? (
          [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)
        ) : (
          <>
            <KpiCard
              label={t('adminSubs.kpiTotalUsers')}
              value={analytics.kpis.total_users.value.toLocaleString()}
              change={analytics.kpis.total_users.change_pct}
              spark={analytics.kpis.total_users.sparkline}
              icon="users"
            />
            <KpiCard
              label={t('adminSubs.kpiActive')}
              value={analytics.kpis.active_subscriptions.value.toLocaleString()}
              change={analytics.kpis.active_subscriptions.change_pct}
              spark={analytics.kpis.active_subscriptions.sparkline}
              icon="active"
            />
            <KpiCard
              label={t('adminSubs.kpiRevenue')}
              value={formatMoney(
                analytics.kpis.monthly_revenue.value,
                analytics.kpis.monthly_revenue.currency || analytics.pricing.currency,
                locale,
              )}
              change={analytics.kpis.monthly_revenue.change_pct}
              spark={analytics.kpis.monthly_revenue.sparkline}
              icon="revenue"
            />
            <KpiCard
              label={t('adminSubs.kpiExpiring')}
              value={String(analytics.kpis.expiring_soon.value)}
              hint={t('adminSubs.requiresAction')}
              spark={[]}
              icon="alert"
            />
          </>
        )}
      </div>

      {analytics && (analytics.alerts.expiring_7_days > 0 || analytics.alerts.failed_payments_today > 0 || analytics.alerts.expired > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          {analytics.alerts.expiring_7_days > 0 && (
            <AlertCard
              tone="warning"
              text={interpolate(t('adminSubs.alertsExpiring'), { count: analytics.alerts.expiring_7_days })}
              action={t('adminSubs.viewExpiring')}
              onClick={() => {
                setExpiring('1')
                setFailedToday('')
                setStatus('')
                setPage(1)
              }}
            />
          )}
          {analytics.alerts.failed_payments_today > 0 && (
            <AlertCard
              tone="danger"
              text={interpolate(t('adminSubs.alertsFailed'), { count: analytics.alerts.failed_payments_today })}
              action={t('adminSubs.viewFailed')}
              onClick={() => {
                setFailedToday('1')
                setExpiring('')
                setPage(1)
              }}
            />
          )}
          {analytics.alerts.expired > 0 && (
            <AlertCard
              tone="muted"
              text={interpolate(t('adminSubs.alertsExpired'), { count: analytics.alerts.expired })}
              action={t('adminSubs.viewExpired')}
              onClick={() => {
                setStatus('expired')
                setExpiring('')
                setFailedToday('')
                setPage(1)
              }}
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-8">
        <div className="ops-card p-5 xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold">{t('adminSubs.revenueTitle')}</h2>
            <div className="flex flex-wrap gap-1">
              {(['7d', '30d', '3m', '6m', '12m'] as const).map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setRevenueRange(range)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={{
                    background: revenueRange === range ? 'var(--ops-primary)' : 'var(--ops-soft)',
                    color: revenueRange === range ? '#fff' : 'var(--ops-text)',
                  }}
                >
                  {t(`adminSubs.range${range}`)}
                </button>
              ))}
            </div>
          </div>
          {analyticsLoading || !analytics ? (
            <Skeleton className="h-48" />
          ) : (
            <RevenueChart series={analytics.revenue_series} locale={locale} currency={analytics.pricing.currency} />
          )}
        </div>
        <div className="ops-card p-5">
          <h2 className="text-lg font-semibold mb-4">{t('adminSubs.plansTitle')}</h2>
          {analyticsLoading || !analytics ? (
            <Skeleton className="h-48" />
          ) : (
            <div className="space-y-4">
              {analytics.plan_performance.map((row) => (
                <div key={row.plan}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{t(PLAN_LABEL_KEYS[row.plan])}</span>
                    <span style={{ color: 'var(--ops-muted)' }}>
                      {interpolate(t('adminSubs.planUsers'), { count: row.users })} · {row.pct}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: 'var(--ops-soft)' }}>
                    <div
                      className="h-2 rounded-full"
                      style={{ width: `${row.pct}%`, background: 'var(--ops-primary)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <PaymentsLedger />

      <section id="verification" className="ops-card overflow-hidden mb-8">
        <div className="px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3" style={{ borderColor: 'var(--ops-border)' }}>
          <h2 className="text-lg font-semibold">{t('adminSubs.verification')}</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            {(['pending', 'approved', 'rejected'] as const).map((s) => (
              <button key={s} type="button" onClick={() => setProofStatus(s)} className="text-left">
                <div style={{ color: 'var(--ops-muted)' }}>{t(`adminSubs.${s}`)}</div>
                <div className="text-xl font-bold" style={{ color: proofStatus === s ? 'var(--ops-primary)' : 'var(--ops-text)' }}>
                  {analytics?.proofs[s] ?? 0}
                </div>
              </button>
            ))}
          </div>
        </div>
        {proofsLoading ? (
          <div className="p-5 space-y-3">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : proofs.length === 0 ? (
          <EmptyState title={t('adminSubs.emptyProofs')} body="" />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead style={{ background: 'var(--ops-soft)' }}>
                  <tr className="text-left text-xs uppercase tracking-wider" style={{ color: 'var(--ops-muted)' }}>
                    <th className="px-5 py-3">{t('adminSubs.customer')}</th>
                    <th className="px-5 py-3">{t('adminSubs.amount')}</th>
                    <th className="px-5 py-3">{t('adminSubs.method')}</th>
                    <th className="px-5 py-3">{t('adminSubs.submitted')}</th>
                    <th className="px-5 py-3">{t('adminSubs.status')}</th>
                    <th className="px-5 py-3">{t('adminSubs.reviewer')}</th>
                    <th className="px-5 py-3 text-right">{t('adminSubs.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {proofs.map((proof) => (
                    <tr key={proof.id} className="border-t" style={{ borderColor: 'var(--ops-border)' }}>
                      <td className="px-5 py-4">
                        <div className="font-medium">{proof.user_name}</div>
                        <div className="text-xs" style={{ color: 'var(--ops-muted)' }}>{proof.user_email}</div>
                      </td>
                      <td className="px-5 py-4">{formatMoney(proof.amount, proof.currency, locale)}</td>
                      <td className="px-5 py-4">{t(METHOD_LABEL_KEYS[proof.payment_method] || 'adminSubs.methodOther')}</td>
                      <td className="px-5 py-4">{formatOpsDateTime(proof.created_at, locale)}</td>
                      <td className="px-5 py-4"><StatusBadge status={proof.status} t={t} /></td>
                      <td className="px-5 py-4 text-xs">{proof.reviewed_by_name || '—'}</td>
                      <td className="px-5 py-4 text-right space-x-2 whitespace-nowrap">
                        <button type="button" className="font-medium" style={{ color: 'var(--ops-primary)' }} onClick={() => setReceipt(proof)}>
                          {t('adminSubs.view')}
                        </button>
                        {(proof.status === 'pending' || proof.status === 'info_requested') && (
                          <>
                            <button type="button" className="font-medium text-emerald-600" disabled={actingId === proof.id} onClick={() => runAction(proof.id, () => adminApi.subscriptions.paymentProofs.approve(proof.id))}>
                              {t('adminSubs.approve')}
                            </button>
                            <button type="button" className="font-medium" style={{ color: 'var(--ops-danger)' }} onClick={() => setConfirm({ kind: 'reject', id: proof.id })}>
                              {t('adminSubs.reject')}
                            </button>
                            <RequestInfoButton acting={actingId === proof.id} onSubmit={(message) => runAction(proof.id, () => adminApi.subscriptions.paymentProofs.requestInfo(proof.id, message))} t={t} />
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="md:hidden p-4 space-y-3">
              {proofs.map((proof) => (
                <div key={proof.id} className="rounded-xl border p-4" style={{ borderColor: 'var(--ops-border)' }}>
                  <div className="font-semibold">{proof.user_name}</div>
                  <div className="text-xs mb-2" style={{ color: 'var(--ops-muted)' }}>{proof.user_email}</div>
                  <div className="flex items-center justify-between mb-3">
                    <span>{formatMoney(proof.amount, proof.currency, locale)}</span>
                    <StatusBadge status={proof.status} t={t} />
                  </div>
                  <button type="button" className="ops-btn ops-btn-primary w-full mb-2" onClick={() => setReceipt(proof)}>
                    {t('adminSubs.viewReceipt')}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      <section className="ops-card overflow-hidden">
        <div className="p-5 border-b space-y-4" style={{ borderColor: 'var(--ops-border)' }}>
          <div className="flex flex-col lg:flex-row gap-3">
            <input
              className="ops-input flex-1"
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
              placeholder={`🔍 ${t('adminSubs.searchPlaceholder')}`}
            />
            <div className="relative">
              <button type="button" className="ops-btn ops-btn-ghost" onClick={() => setExportOpen((v) => !v)}>
                {t('adminSubs.export')} ▾
              </button>
              {exportOpen && (
                <div className="ops-card absolute right-0 mt-2 w-44 p-2 z-20">
                  {(['csv', 'xlsx', 'pdf'] as const).map((fmt) => (
                    <button key={fmt} type="button" className="block w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--ops-soft)]" onClick={() => handleExport(fmt)}>
                      {t(fmt === 'csv' ? 'adminSubs.exportCsv' : fmt === 'xlsx' ? 'adminSubs.exportExcel' : 'adminSubs.exportPdf')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            <select className="ops-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
              <option value="">{t('adminSubs.allStatuses')}</option>
              <option value="active">{t('adminSubs.statusActive')}</option>
              <option value="trial">{t('adminSubs.statusTrial')}</option>
              <option value="paused">{t('adminSubs.statusPaused')}</option>
              <option value="expired">{t('adminSubs.statusExpired')}</option>
              <option value="cancelled">{t('adminSubs.statusCancelled')}</option>
              <option value="payment_failed">{t('adminSubs.statusPaymentFailed')}</option>
            </select>
            <select className="ops-select" value={plan} onChange={(e) => { setPlan(e.target.value); setPage(1) }}>
              <option value="">{t('adminSubs.allPlans')}</option>
              {(['free', 'premium', 'business', 'family'] as PlanTier[]).map((p) => (
                <option key={p} value={p}>{t(PLAN_LABEL_KEYS[p])}</option>
              ))}
            </select>
            <select className="ops-select" value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1) }}>
              <option value="">{t('adminSubs.allPayments')}</option>
              <option value="paid">{t('adminSubs.paid')}</option>
              <option value="pending">{t('adminSubs.pending')}</option>
              <option value="failed">{t('adminSubs.failed')}</option>
              <option value="none">{t('adminSubs.none')}</option>
            </select>
            <select className="ops-select" value={currency} onChange={(e) => { setCurrency(e.target.value); setPage(1) }}>
              <option value="">{t('adminSubs.allCurrencies')}</option>
              <option value="AOA">AOA</option>
            </select>
            <select className="ops-select" value={dateField} onChange={(e) => setDateField(e.target.value as typeof dateField)}>
              <option value="created">{t('adminSubs.dateCreated')}</option>
              <option value="renewal">{t('adminSubs.dateRenewal')}</option>
              <option value="payment">{t('adminSubs.datePayment')}</option>
            </select>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-xs" style={{ color: 'var(--ops-muted)' }}>
              {t('adminSubs.from')}
              <input type="date" className="ops-input mt-1 block" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </label>
            <label className="text-xs" style={{ color: 'var(--ops-muted)' }}>
              {t('adminSubs.to')}
              <input type="date" className="ops-input mt-1 block" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </label>
            <button type="button" className="ops-btn ops-btn-primary" onClick={() => setPage(1)}>{t('adminSubs.apply')}</button>
            <button type="button" className="ops-btn ops-btn-ghost" onClick={clearFilters}>{t('adminSubs.clearFilters')}</button>
          </div>
        </div>

        {subsError ? (
          <div className="p-6">
            <ErrorState title={t('adminSubs.errorTitle')} body={t('adminSubs.errorBody')} retryLabel={t('adminSubs.tryAgain')} onRetry={loadSubs} />
          </div>
        ) : subsLoading ? (
          <div className="p-5 space-y-3">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </div>
        ) : subs.length === 0 ? (
          <EmptyState
            title={t('adminSubs.emptyTitle')}
            body={t('adminSubs.emptyBody')}
            action={<button type="button" className="ops-btn ops-btn-primary" onClick={() => setCreateOpen(true)}>{t('adminSubs.create')}</button>}
          />
        ) : (
          <>
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead style={{ background: 'var(--ops-soft)' }}>
                  <tr className="text-left text-xs uppercase tracking-wider" style={{ color: 'var(--ops-muted)' }}>
                    <th className="px-5 py-3">{t('adminSubs.customer')}</th>
                    <th className="px-5 py-3">{t('adminSubs.plan')}</th>
                    <th className="px-5 py-3">{t('adminSubs.amount')}</th>
                    <th className="px-5 py-3">{t('adminSubs.startDate')}</th>
                    <th className="px-5 py-3">{t('adminSubs.renewalDate')}</th>
                    <th className="px-5 py-3">{t('adminSubs.status')}</th>
                    <th className="px-5 py-3">{t('adminSubs.payment')}</th>
                    <th className="px-5 py-3 text-right">{t('adminSubs.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map((sub) => (
                    <tr key={sub.id} className="border-t hover:bg-[var(--ops-soft)]/50" style={{ borderColor: 'var(--ops-border)' }}>
                      <td className="px-5 py-4">
                        <Link href={`/admin/subscriptions/${sub.id}`} className="font-medium hover:underline">{sub.user_name}</Link>
                        <div className="text-xs" style={{ color: 'var(--ops-muted)' }}>{sub.user_email}</div>
                      </td>
                      <td className="px-5 py-4">{t(PLAN_LABEL_KEYS[sub.plan_tier])}</td>
                      <td className="px-5 py-4">{formatMoney(sub.amount, sub.currency, locale)}</td>
                      <td className="px-5 py-4">{formatOpsDate(sub.start_date, locale)}</td>
                      <td className="px-5 py-4">{formatOpsDate(sub.renewal_date, locale)}</td>
                      <td className="px-5 py-4"><StatusBadge status={sub.display_status} t={t} /></td>
                      <td className="px-5 py-4">{t(`adminSubs.${sub.payment_status === 'paid' ? 'paid' : sub.payment_status === 'failed' ? 'failed' : sub.payment_status === 'pending' ? 'pending' : 'none'}`)}</td>
                      <td className="px-5 py-4 text-right relative">
                        <button type="button" className="ops-btn ops-btn-ghost px-2" onClick={() => setOpenMenu(openMenu === sub.id ? null : sub.id)}>⋮</button>
                        {openMenu === sub.id && (
                          <ActionMenu
                            sub={sub}
                            t={t}
                            onClose={() => setOpenMenu(null)}
                            onView={() => router.push(`/admin/subscriptions/${sub.id}`)}
                            onExtend={() => runAction(sub.id, () => adminApi.subscriptions.extend30Days(sub.id))}
                            onPause={() => setConfirm({ kind: 'pause', id: sub.id })}
                            onResume={() => runAction(sub.id, () => adminApi.subscriptions.resume(sub.id))}
                            onCancel={() => setConfirm({ kind: 'cancel', id: sub.id })}
                            onRefund={() => setConfirm({ kind: 'refund', id: sub.id })}
                            onNotify={() => runAction(sub.id, () => adminApi.subscriptions.sendReminder(sub.id, { channels: ['email', 'push', 'sms', 'whatsapp'], days: 3 }))}
                            onChangePlan={(tier) => runAction(sub.id, () => adminApi.subscriptions.changePlan(sub.id, tier))}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="lg:hidden p-4 space-y-3">
              {subs.map((sub) => (
                <div key={sub.id} className="rounded-2xl border p-4" style={{ borderColor: 'var(--ops-border)' }}>
                  <div className="flex justify-between gap-2">
                    <div>
                      <div className="font-semibold">{sub.user_name}</div>
                      <div className="text-xs" style={{ color: 'var(--ops-muted)' }}>{sub.user_email}</div>
                    </div>
                    <StatusBadge status={sub.display_status} t={t} />
                  </div>
                  <div className="mt-3 text-sm">
                    <div>{t(PLAN_LABEL_KEYS[sub.plan_tier])}</div>
                    <div className="font-semibold">{formatMoney(sub.amount, sub.currency, locale)} / {t('adminSubs.monthly').toLowerCase()}</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--ops-muted)' }}>
                      {t('adminSubs.renewal')}: {formatOpsDate(sub.renewal_date, locale)}
                    </div>
                  </div>
                  <Link href={`/admin/subscriptions/${sub.id}`} className="ops-btn ops-btn-primary w-full mt-4">
                    {t('adminSubs.viewSubscription')}
                  </Link>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t flex flex-wrap items-center justify-between gap-3" style={{ borderColor: 'var(--ops-border)' }}>
              <p className="text-sm" style={{ color: 'var(--ops-muted)' }}>
                {interpolate(t('adminSubs.showing'), { from, to, total: subCount.toLocaleString() })}
              </p>
              <div className="flex items-center gap-2">
                <select className="ops-select" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}>
                  {[25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <button type="button" className="ops-btn ops-btn-ghost" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  ‹ {t('adminSubs.previous')}
                </button>
                <span className="text-sm">{page} / {pages}</span>
                <button type="button" className="ops-btn ops-btn-ghost" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                  {t('adminSubs.next')} ›
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <ConfirmModal
        open={Boolean(confirm.kind)}
        title={t('adminSubs.confirmAction')}
        body={confirm.kind ? confirmCopy[confirm.kind] : ''}
        confirmLabel={t('adminSubs.confirmAction')}
        cancelLabel={t('adminSubs.close')}
        danger={confirm.kind === 'cancel' || confirm.kind === 'reject'}
        onClose={() => setConfirm({ kind: null, id: null })}
        onConfirm={onConfirm}
      />

      {receipt && (
        <ReceiptModal proof={receipt} t={t} locale={locale} onClose={() => setReceipt(null)} />
      )}
      {createOpen && (
        <CreateModal t={t} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); refreshAll() }} />
      )}
    </OpsShell>
  )
}

function KpiCard({
  label,
  value,
  change,
  hint,
  spark,
  icon,
}: {
  label: string
  value: string
  change?: number | null
  hint?: string
  spark: number[]
  icon: 'users' | 'active' | 'revenue' | 'alert'
}) {
  const colors = {
    users: '#3734D0',
    active: '#4CAF3D',
    revenue: '#211F78',
    alert: '#F2A900',
  }
  return (
    <div className="ops-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm" style={{ color: 'var(--ops-muted)' }}>{label}</p>
          <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
          {typeof change === 'number' ? (
            <p className="text-xs mt-1 font-medium" style={{ color: change >= 0 ? 'var(--ops-success)' : 'var(--ops-danger)' }}>
              {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
            </p>
          ) : hint ? (
            <p className="text-xs mt-1" style={{ color: 'var(--ops-warning)' }}>{hint}</p>
          ) : null}
        </div>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: colors[icon] }}>
          {icon === 'users' && '👤'}
          {icon === 'active' && '●'}
          {icon === 'revenue' && '◈'}
          {icon === 'alert' && '!'}
        </div>
      </div>
      {spark.length > 0 && (
        <div className="mt-3">
          <Sparkline values={spark} color={colors[icon]} />
        </div>
      )}
    </div>
  )
}

function AlertCard({
  tone,
  text,
  action,
  onClick,
}: {
  tone: 'warning' | 'danger' | 'muted'
  text: string
  action: string
  onClick: () => void
}) {
  const color = tone === 'warning' ? '#F2A900' : tone === 'danger' ? '#E53935' : '#6B7280'
  return (
    <div className="ops-card p-4 flex items-center justify-between gap-3">
      <p className="text-sm">
        <span className="mr-1">{tone === 'danger' ? '🔴' : '⚠️'}</span>
        {text}
      </p>
      <button type="button" className="text-sm font-semibold whitespace-nowrap" style={{ color }} onClick={onClick}>
        {action}
      </button>
    </div>
  )
}

function RevenueChart({
  series,
  locale,
  currency,
}: {
  series: SubscriptionAnalytics['revenue_series']
  locale: string
  currency: string
}) {
  const max = Math.max(...series.map((s) => s.amount), 1)
  if (!series.length) {
    return <div className="h-48 flex items-center justify-center text-sm" style={{ color: 'var(--ops-muted)' }}>—</div>
  }
  const w = 640
  const h = 180
  const points = series.map((s, i) => {
    const x = (i / Math.max(series.length - 1, 1)) * (w - 40) + 20
    const y = h - 24 - (s.amount / max) * (h - 40)
    return { x, y, s }
  })
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ')
  const ticks = points.filter((_, i) => i === 0 || i === points.length - 1 || i % Math.ceil(points.length / 6) === 0)
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-48">
        <path d={`${d} L ${points[points.length - 1].x} ${h - 24} L ${points[0].x} ${h - 24} Z`} fill="rgba(55,52,208,0.12)" />
        <path d={d} fill="none" stroke="#3734D0" strokeWidth="2.5" />
        {ticks.map((p) => (
          <text key={p.s.period} x={p.x} y={h - 6} textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.6">
            {p.s.label}
          </text>
        ))}
      </svg>
      <p className="text-xs mt-1" style={{ color: 'var(--ops-muted)' }}>
        {formatMoney(series[series.length - 1]?.amount ?? 0, currency, locale)}
      </p>
    </div>
  )
}

function ActionMenu({
  sub,
  t,
  onClose,
  onView,
  onExtend,
  onPause,
  onResume,
  onCancel,
  onRefund,
  onNotify,
  onChangePlan,
}: {
  sub: AdminSubscription
  t: (k: string) => string
  onClose: () => void
  onView: () => void
  onExtend: () => void
  onPause: () => void
  onResume: () => void
  onCancel: () => void
  onRefund: () => void
  onNotify: () => void
  onChangePlan: (tier: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])
  return (
    <div ref={ref} className="ops-card absolute right-4 mt-1 w-56 p-2 z-30 text-left">
      <MenuItem onClick={onView}>{t('adminSubs.viewSubscription')}</MenuItem>
      <Link href={`/admin/users`} className="block px-3 py-2 rounded-lg text-sm hover:bg-[var(--ops-soft)]">{t('adminSubs.viewCustomer')}</Link>
      <Link href={`/admin/subscriptions/${sub.id}#payments`} className="block px-3 py-2 rounded-lg text-sm hover:bg-[var(--ops-soft)]">{t('adminSubs.viewPayments')}</Link>
      <Link href={`/admin/subscriptions/${sub.id}#payments`} className="block px-3 py-2 rounded-lg text-sm hover:bg-[var(--ops-soft)]">{t('adminSubs.viewInvoices')}</Link>
      <div className="px-3 py-2 text-xs" style={{ color: 'var(--ops-muted)' }}>{t('adminSubs.changePlan')}</div>
      {(['free', 'premium', 'business', 'family'] as PlanTier[]).map((p) => (
        <button key={p} type="button" className="block w-full text-left px-3 py-1.5 rounded-lg text-sm hover:bg-[var(--ops-soft)]" onClick={() => onChangePlan(p)}>
          {t(PLAN_LABEL_KEYS[p])}
        </button>
      ))}
      <MenuItem onClick={onExtend}>{t('adminSubs.extend')}</MenuItem>
      {sub.status === 'paused' ? (
        <MenuItem onClick={onResume}>{t('adminSubs.resume')}</MenuItem>
      ) : (
        <MenuItem onClick={onPause}>{t('adminSubs.pause')}</MenuItem>
      )}
      <MenuItem onClick={onNotify}>{t('adminSubs.sendNotification')}</MenuItem>
      <MenuItem onClick={onRefund}>{t('adminSubs.refund')}</MenuItem>
      {sub.status !== 'cancelled' && (
        <button type="button" className="block w-full text-left px-3 py-2 rounded-lg text-sm" style={{ color: 'var(--ops-danger)' }} onClick={onCancel}>
          {t('adminSubs.cancel')}
        </button>
      )}
    </div>
  )
}

function MenuItem({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="block w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--ops-soft)]" onClick={onClick}>
      {children}
    </button>
  )
}

function RequestInfoButton({
  acting,
  onSubmit,
  t,
}: {
  acting: boolean
  onSubmit: (message: string) => void
  t: (k: string) => string
}) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  return (
    <>
      <button type="button" className="font-medium" style={{ color: 'var(--ops-warning)' }} disabled={acting} onClick={() => setOpen(true)}>
        {t('adminSubs.requestInfo')}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(8,11,36,0.55)' }}>
          <div className="ops-card max-w-md w-full p-6">
            <h3 className="font-bold mb-3">{t('adminSubs.requestInfo')}</h3>
            <textarea className="ops-input w-full h-28" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('adminSubs.requestInfoPrompt')} />
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" className="ops-btn ops-btn-ghost" onClick={() => setOpen(false)}>{t('adminSubs.close')}</button>
              <button type="button" className="ops-btn ops-btn-primary" onClick={() => { onSubmit(message); setOpen(false) }}>{t('adminSubs.send')}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ReceiptModal({
  proof,
  t,
  locale,
  onClose,
}: {
  proof: AdminPaymentProof
  t: (k: string) => string
  locale: string
  onClose: () => void
}) {
  const src = proof.file_url || getFullUrl(proof.file)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(8,11,36,0.55)' }}>
      <div className="ops-card max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold">{t('adminSubs.viewReceipt')}</h3>
          <button type="button" className="ops-btn ops-btn-ghost" onClick={onClose}>{t('adminSubs.close')}</button>
        </div>
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="w-full rounded-xl mb-4 max-h-80 object-contain bg-[var(--ops-soft)]" />
        )}
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div><dt style={{ color: 'var(--ops-muted)' }}>{t('adminSubs.customer')}</dt><dd className="font-medium">{proof.user_name}</dd></div>
          <div><dt style={{ color: 'var(--ops-muted)' }}>{t('adminSubs.email')}</dt><dd>{proof.user_email}</dd></div>
          <div><dt style={{ color: 'var(--ops-muted)' }}>{t('adminSubs.amount')}</dt><dd>{formatMoney(proof.amount, proof.currency, locale)}</dd></div>
          <div><dt style={{ color: 'var(--ops-muted)' }}>{t('adminSubs.currency')}</dt><dd>{proof.currency}</dd></div>
          <div><dt style={{ color: 'var(--ops-muted)' }}>{t('adminSubs.reference')}</dt><dd>{proof.payment_reference || proof.transaction_id}</dd></div>
          <div><dt style={{ color: 'var(--ops-muted)' }}>{t('adminSubs.submitted')}</dt><dd>{formatOpsDateTime(proof.created_at, locale)}</dd></div>
          <div><dt style={{ color: 'var(--ops-muted)' }}>{t('adminSubs.method')}</dt><dd>{t(METHOD_LABEL_KEYS[proof.payment_method] || 'adminSubs.methodOther')}</dd></div>
          <div><dt style={{ color: 'var(--ops-muted)' }}>{t('adminSubs.status')}</dt><dd><StatusBadge status={proof.status} t={t} /></dd></div>
        </dl>
      </div>
    </div>
  )
}

function CreateModal({
  t,
  onClose,
  onCreated,
}: {
  t: (k: string) => string
  onClose: () => void
  onCreated: () => void
}) {
  const [q, setQ] = useState('')
  const [users, setUsers] = useState<AdminUserSearchResult[]>([])
  const [selected, setSelected] = useState<AdminUserSearchResult | null>(null)
  const [plan, setPlan] = useState<PlanTier>('premium')
  const [trial, setTrial] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      if (!q.trim()) {
        setUsers([])
        return
      }
      try {
        const res = await adminApi.subscriptions.searchUsers(q.trim())
        setUsers((res.data as { results: AdminUserSearchResult[] }).results || [])
      } catch (err) {
        logger.error('User search failed', err)
      }
    }, 250)
    return () => window.clearTimeout(timer)
  }, [q])

  const submit = async () => {
    if (!selected) return
    try {
      setSaving(true)
      await adminApi.subscriptions.create({ user_id: selected.id, plan_tier: plan, start_trial: trial })
      onCreated()
    } catch (err) {
      logger.error('Create subscription failed', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(8,11,36,0.55)' }}>
      <div className="ops-card max-w-lg w-full p-6">
        <h3 className="text-lg font-bold mb-4">{t('adminSubs.create')}</h3>
        <input className="ops-input w-full mb-3" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('adminSubs.selectUser')} />
        <div className="max-h-40 overflow-y-auto mb-3 space-y-1">
          {users.map((u) => (
            <button
              key={u.id}
              type="button"
              className="w-full text-left px-3 py-2 rounded-lg text-sm"
              style={{ background: selected?.id === u.id ? 'var(--ops-soft)' : 'transparent' }}
              onClick={() => setSelected(u)}
              disabled={u.has_subscription}
            >
              <div className="font-medium">{u.name}</div>
              <div className="text-xs" style={{ color: 'var(--ops-muted)' }}>{u.email}{u.has_subscription ? ' · ✓' : ''}</div>
            </button>
          ))}
        </div>
        <select className="ops-select w-full mb-3" value={plan} onChange={(e) => setPlan(e.target.value as PlanTier)}>
          {(['free', 'premium', 'business', 'family'] as PlanTier[]).map((p) => (
            <option key={p} value={p}>{t(PLAN_LABEL_KEYS[p])}</option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm mb-5">
          <input type="checkbox" checked={trial} onChange={(e) => setTrial(e.target.checked)} />
          {t('adminSubs.startTrial')}
        </label>
        <div className="flex justify-end gap-2">
          <button type="button" className="ops-btn ops-btn-ghost" onClick={onClose}>{t('adminSubs.close')}</button>
          <button type="button" className="ops-btn ops-btn-primary" disabled={!selected || saving} onClick={submit}>
            {t('adminSubs.create')}
          </button>
        </div>
      </div>
    </div>
  )
}

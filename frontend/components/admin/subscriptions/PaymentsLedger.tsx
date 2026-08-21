'use client'

import { useCallback, useEffect, useState } from 'react'
import { adminApi } from '@/lib/api'
import { logger } from '@/lib/logger'
import { formatMoney, formatOpsDateTime } from '@/lib/admin-subs-format'
import { useLocale, useTranslations } from '@/contexts/LocaleContext'
import type { PaymentSummary, SubscriptionPaymentRecord } from '@/lib/types/subscriptions'
import { unwrapList } from '@/lib/types/subscriptions'
import { EmptyState, ErrorState, Skeleton, StatusBadge } from './OpsUi'

export default function PaymentsLedger() {
  const t = useTranslations()
  const { locale } = useLocale()
  const [summary, setSummary] = useState<PaymentSummary | null>(null)
  const [rows, setRows] = useState<SubscriptionPaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [status, setStatus] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(false)
      const [sumRes, listRes] = await Promise.all([
        adminApi.subscriptions.payments.summary(),
        adminApi.subscriptions.payments.list({ status: status || undefined, page_size: 25 }),
      ])
      setSummary(sumRes.data as PaymentSummary)
      const { results } = unwrapList<SubscriptionPaymentRecord>(listRes.data)
      setRows(results)
    } catch (err) {
      logger.error('Failed to load payments ledger', err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    void load()
  }, [load])

  const kpis: Array<{ key: keyof PaymentSummary; label: string }> = [
    { key: 'total', label: t('adminSubs.payTotal') },
    { key: 'pending', label: t('adminSubs.payPending') },
    { key: 'paid', label: t('adminSubs.paid') },
    { key: 'failed', label: t('adminSubs.failed') },
    { key: 'refunded', label: t('adminSubs.payRefunded') },
    { key: 'rejected', label: t('adminSubs.rejected') },
  ]

  return (
    <section id="payments-ledger" className="ops-card overflow-hidden mb-8">
      <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--ops-border)' }}>
        <h2 className="text-lg font-semibold">{t('adminSubs.paymentsTitle')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mt-4">
          {kpis.map((kpi) => (
            <button
              key={kpi.key}
              type="button"
              className="text-left"
              onClick={() => setStatus(kpi.key === 'total' ? '' : kpi.key === 'pending' ? 'pending_verification' : kpi.key)}
            >
              <div className="text-xs" style={{ color: 'var(--ops-muted)' }}>{kpi.label}</div>
              <div className="text-xl font-bold">{summary?.[kpi.key] ?? 0}</div>
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="p-5 space-y-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      ) : error ? (
        <div className="p-5">
          <ErrorState
            title={t('adminSubs.loadError')}
            body=""
            retryLabel={t('adminSubs.tryAgain')}
            onRetry={load}
          />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title={t('adminSubs.emptyPayments')} body="" />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead style={{ background: 'var(--ops-soft)' }}>
              <tr className="text-left text-xs uppercase tracking-wider" style={{ color: 'var(--ops-muted)' }}>
                <th className="px-5 py-3">{t('adminSubs.transactionId')}</th>
                <th className="px-5 py-3">{t('adminSubs.customer')}</th>
                <th className="px-5 py-3">{t('adminSubs.country')}</th>
                <th className="px-5 py-3">{t('adminSubs.amount')}</th>
                <th className="px-5 py-3">{t('adminSubs.method')}</th>
                <th className="px-5 py-3">{t('adminSubs.gateway')}</th>
                <th className="px-5 py-3">{t('adminSubs.status')}</th>
                <th className="px-5 py-3">{t('adminSubs.submitted')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t" style={{ borderColor: 'var(--ops-border)' }}>
                  <td className="px-5 py-3 font-mono text-xs">{row.transaction_id}</td>
                  <td className="px-5 py-3">
                    <div className="font-medium">{row.user_name}</div>
                    <div className="text-xs" style={{ color: 'var(--ops-muted)' }}>{row.user_email}</div>
                  </td>
                  <td className="px-5 py-3">{row.country || '—'}</td>
                  <td className="px-5 py-3">{formatMoney(Number(row.amount), row.currency, locale)}</td>
                  <td className="px-5 py-3">{row.method_label}</td>
                  <td className="px-5 py-3">{row.gateway_label || '—'}</td>
                  <td className="px-5 py-3"><StatusBadge status={row.status} t={t} /></td>
                  <td className="px-5 py-3">{formatOpsDateTime(row.created_at, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

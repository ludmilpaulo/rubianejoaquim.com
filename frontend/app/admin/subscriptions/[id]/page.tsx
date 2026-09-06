'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { adminApi, getFullUrl } from '@/lib/api'
import { logger } from '@/lib/logger'
import { getApiErrorMessage } from '@/lib/types/api'
import { useLocale, useTranslations } from '@/contexts/LocaleContext'
import {
  countryDisplayName,
  formatMoney,
  formatOpsDate,
  METHOD_LABEL_KEYS,
  PLAN_LABEL_KEYS,
} from '@/lib/admin-subs-format'
import type { AdminSubscriptionDetail, PlanTier } from '@/lib/types/subscriptions'
import OpsShell from '@/components/admin/subscriptions/OpsShell'
import { ConfirmModal, ErrorState, Skeleton, StatusBadge } from '@/components/admin/subscriptions/OpsUi'

export default function SubscriptionDetailPage() {
  const params = useParams<{ id: string }>()
  const rawId = params?.id
  const id = typeof rawId === 'string' ? Number(rawId) : Number.NaN
  const t = useTranslations()
  const { locale } = useLocale()
  const [sub, setSub] = useState<AdminSubscriptionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [errorDetail, setErrorDetail] = useState('')
  const [acting, setActing] = useState(false)
  const [confirm, setConfirm] = useState<'cancel' | 'pause' | 'refund' | null>(null)
  const [plan, setPlan] = useState<PlanTier>('premium')

  const load = useCallback(async () => {
    if (!Number.isFinite(id) || id <= 0) {
      setLoading(false)
      setError(true)
      setErrorDetail(t('adminSubs.errorNotFound'))
      setSub(null)
      return
    }
    try {
      setLoading(true)
      setError(false)
      setErrorDetail('')
      const res = await adminApi.subscriptions.get(id)
      const data = res.data as AdminSubscriptionDetail
      if (!data?.id) {
        setSub(null)
        setError(true)
        setErrorDetail(t('adminSubs.errorNotFound'))
        return
      }
      setSub({
        ...data,
        payment_proofs: Array.isArray(data.payment_proofs) ? data.payment_proofs : [],
        audit_logs: Array.isArray(data.audit_logs) ? data.audit_logs : [],
      })
      setPlan((data.plan_tier as PlanTier) || 'premium')
    } catch (err) {
      logger.error('Failed to load subscription detail', err)
      setError(true)
      setErrorDetail(getApiErrorMessage(err, t('adminSubs.errorBody')))
      setSub(null)
    } finally {
      setLoading(false)
    }
  }, [id, t])

  useEffect(() => {
    void load()
  }, [load])

  const run = async (fn: () => Promise<unknown>) => {
    try {
      setActing(true)
      await fn()
      await load()
    } catch (err) {
      logger.error('Subscription detail action failed', err)
    } finally {
      setActing(false)
      setConfirm(null)
    }
  }

  const planLabel = t(PLAN_LABEL_KEYS[sub?.plan_tier || plan] || 'adminSubs.planPremium')
  const countryCode = (sub?.user_country || '').trim().toUpperCase()
  const countryLabel = countryCode
    ? countryDisplayName(countryCode, locale) || countryCode
    : t('adminSubs.countryUnknown')
  const proofs = sub?.payment_proofs ?? []
  const auditLogs = sub?.audit_logs ?? []

  return (
    <OpsShell>
      <Link href="/admin/subscriptions" className="inline-flex items-center text-sm mb-4" style={{ color: 'var(--ops-muted)' }}>
        ← {t('adminSubs.back')}
      </Link>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48" />
        </div>
      ) : error || !sub ? (
        <ErrorState
          title={t('adminSubs.errorTitle')}
          body={errorDetail || t('adminSubs.errorBody')}
          retryLabel={t('adminSubs.tryAgain')}
          onRetry={load}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold">{planLabel}</h1>
            <StatusBadge status={sub.display_status || sub.status} t={t} />
          </div>

          <div className="ops-card p-6">
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--ops-muted)' }}>
              {t('adminSubs.customer')}
            </p>
            <p className="text-lg font-semibold">{sub.user_name || '—'}</p>
            <p style={{ color: 'var(--ops-muted)' }}>{sub.user_email || '—'}</p>
            {sub.user_phone ? <p className="text-sm mt-1">{sub.user_phone}</p> : null}
            <p className="text-sm mt-2">
              <span style={{ color: 'var(--ops-muted)' }}>{t('adminSubs.country')}: </span>
              <span className="font-medium">
                {countryLabel}
                {countryCode ? ` (${countryCode})` : ''}
              </span>
            </p>
          </div>

          <div className="ops-card p-6">
            <h2 className="font-semibold mb-4">{t('adminSubs.breadcrumbSubs')}</h2>
            <dl className="grid sm:grid-cols-2 gap-4 text-sm">
              <Row label={t('adminSubs.plan')} value={planLabel} />
              <Row label={t('adminSubs.amount')} value={formatMoney(sub.amount, sub.currency, locale)} />
              <Row label={t('adminSubs.billingCycle')} value={t('adminSubs.monthly')} />
              <Row label={t('adminSubs.started')} value={formatOpsDate(sub.start_date, locale)} />
              <Row label={t('adminSubs.nextRenewal')} value={formatOpsDate(sub.renewal_date, locale)} />
              <Row label={t('adminSubs.transactionId')} value={sub.transaction_id || '—'} />
            </dl>
          </div>

          <div className="ops-card p-6">
            <h2 className="font-semibold mb-4">{t('adminSubs.payment')}</h2>
            <dl className="grid sm:grid-cols-2 gap-4 text-sm">
              <Row
                label={t('adminSubs.status')}
                value={t(
                  `adminSubs.${
                    sub.payment_status === 'paid'
                      ? 'paid'
                      : sub.payment_status === 'failed'
                        ? 'failed'
                        : sub.payment_status === 'pending'
                          ? 'pending'
                          : 'none'
                  }`,
                )}
              />
              <Row
                label={t('adminSubs.method')}
                value={
                  sub.payment_method
                    ? t(METHOD_LABEL_KEYS[sub.payment_method] || 'adminSubs.methodOther')
                    : '—'
                }
              />
              <Row label={t('adminSubs.transactionId')} value={sub.transaction_id || '—'} />
            </dl>
          </div>

          <div id="payments" className="ops-card p-6">
            <h2 className="font-semibold mb-4">{t('adminSubs.viewPayments')}</h2>
            {proofs.length === 0 ? (
              <p style={{ color: 'var(--ops-muted)' }}>{t('adminSubs.emptyProofs')}</p>
            ) : (
              <div className="space-y-3">
                {proofs.map((proof) => (
                  <div
                    key={proof.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3"
                    style={{ borderColor: 'var(--ops-border)' }}
                  >
                    <div>
                      <div className="font-medium">{formatMoney(proof.amount, proof.currency, locale)}</div>
                      <div className="text-xs" style={{ color: 'var(--ops-muted)' }}>
                        {proof.transaction_id} · {formatOpsDate(proof.created_at, locale)}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={proof.status} t={t} />
                      {(proof.file_url || proof.file) && (
                        <a
                          href={proof.file_url || getFullUrl(proof.file)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium"
                          style={{ color: 'var(--ops-primary)' }}
                        >
                          {t('adminSubs.viewReceipt')}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="ops-card p-6">
            <h2 className="font-semibold mb-4">{t('adminSubs.actions')}</h2>
            <div className="flex flex-wrap gap-2 mb-4">
              <select
                className="ops-select"
                value={plan}
                onChange={(e) => setPlan(e.target.value as PlanTier)}
                disabled={acting}
              >
                {(['free', 'premium', 'business', 'family'] as PlanTier[]).map((p) => (
                  <option key={p} value={p}>
                    {t(PLAN_LABEL_KEYS[p])}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="ops-btn ops-btn-primary"
                disabled={acting || plan === sub.plan_tier}
                onClick={() => run(() => adminApi.subscriptions.changePlan(sub.id, plan))}
              >
                {t('adminSubs.changePlan')}
              </button>
              <button
                type="button"
                className="ops-btn ops-btn-ghost"
                disabled={acting}
                onClick={() => run(() => adminApi.subscriptions.extend30Days(sub.id))}
              >
                {t('adminSubs.extendDays')}
              </button>
              {sub.status === 'paused' ? (
                <button
                  type="button"
                  className="ops-btn ops-btn-ghost"
                  disabled={acting}
                  onClick={() => run(() => adminApi.subscriptions.resume(sub.id))}
                >
                  {t('adminSubs.resume')}
                </button>
              ) : (
                <button
                  type="button"
                  className="ops-btn ops-btn-ghost"
                  disabled={acting}
                  onClick={() => setConfirm('pause')}
                >
                  {t('adminSubs.pause')}
                </button>
              )}
              <button
                type="button"
                className="ops-btn ops-btn-ghost"
                disabled={acting}
                onClick={() =>
                  run(() =>
                    adminApi.subscriptions.sendReminder(sub.id, {
                      channels: ['email', 'push', 'sms', 'whatsapp'],
                      days: 3,
                    }),
                  )
                }
              >
                {t('adminSubs.sendNotification')}
              </button>
              <button
                type="button"
                className="ops-btn ops-btn-ghost"
                disabled={acting}
                onClick={() => setConfirm('refund')}
              >
                {t('adminSubs.refund')}
              </button>
              {sub.status !== 'cancelled' && (
                <button
                  type="button"
                  className="ops-btn ops-btn-danger"
                  disabled={acting}
                  onClick={() => setConfirm('cancel')}
                >
                  {t('adminSubs.cancel')}
                </button>
              )}
            </div>
          </div>

          <div className="ops-card p-6">
            <h2 className="font-semibold mb-4">{t('adminSubs.audit')}</h2>
            {auditLogs.length === 0 ? (
              <p style={{ color: 'var(--ops-muted)' }}>{t('adminSubs.noAudit')}</p>
            ) : (
              <div className="space-y-2 text-sm">
                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex flex-wrap justify-between gap-2 border-b py-2"
                    style={{ borderColor: 'var(--ops-border)' }}
                  >
                    <div>
                      <span className="font-medium">{log.action}</span>
                      <span className="ml-2" style={{ color: 'var(--ops-muted)' }}>
                        {log.admin_name || log.admin_email}
                      </span>
                    </div>
                    <div style={{ color: 'var(--ops-muted)' }}>
                      {formatOpsDate(log.created_at, locale)} {log.ip_address ? `· ${log.ip_address}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirm)}
        title={t('adminSubs.confirmAction')}
        body={
          confirm === 'cancel'
            ? t('adminSubs.confirmCancel')
            : confirm === 'pause'
              ? t('adminSubs.confirmPause')
              : t('adminSubs.confirmRefund')
        }
        confirmLabel={t('adminSubs.confirmAction')}
        cancelLabel={t('adminSubs.close')}
        danger={confirm === 'cancel'}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (!sub || !confirm) return
          if (confirm === 'cancel') void run(() => adminApi.subscriptions.deactivate(sub.id))
          if (confirm === 'pause') void run(() => adminApi.subscriptions.pause(sub.id))
          if (confirm === 'refund') void run(() => adminApi.subscriptions.refund(sub.id))
        }}
      />
    </OpsShell>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt style={{ color: 'var(--ops-muted)' }}>{label}</dt>
      <dd className="font-medium mt-0.5">{value}</dd>
    </div>
  )
}

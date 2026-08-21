'use client'

import type { ReactNode } from 'react'
import type { SubscriptionStatus } from '@/lib/types/subscriptions'
import { STATUS_LABEL_KEYS } from '@/lib/admin-subs-format'

export function StatusBadge({
  status,
  t,
}: {
  status: SubscriptionStatus | string
  t: (key: string) => string
}) {
  const styles: Record<string, { bg: string; dot: string }> = {
    active: { bg: 'rgba(76,175,61,0.14)', dot: '#4CAF3D' },
    trial: { bg: 'rgba(242,169,0,0.16)', dot: '#F2A900' },
    pending: { bg: 'rgba(242,169,0,0.16)', dot: '#F2A900' },
    expired: { bg: 'rgba(107,114,128,0.16)', dot: '#9CA3AF' },
    cancelled: { bg: 'rgba(229,57,53,0.14)', dot: '#E53935' },
    paused: { bg: 'rgba(55,52,208,0.12)', dot: '#3734D0' },
    payment_failed: { bg: 'rgba(229,57,53,0.14)', dot: '#E53935' },
    paid: { bg: 'rgba(76,175,61,0.14)', dot: '#4CAF3D' },
    processing: { bg: 'rgba(55,52,208,0.12)', dot: '#3734D0' },
    pending_verification: { bg: 'rgba(242,169,0,0.16)', dot: '#F2A900' },
    failed: { bg: 'rgba(229,57,53,0.14)', dot: '#E53935' },
    refunded: { bg: 'rgba(107,114,128,0.16)', dot: '#9CA3AF' },
    rejected: { bg: 'rgba(229,57,53,0.14)', dot: '#E53935' },
    info_requested: { bg: 'rgba(242,169,0,0.16)', dot: '#F2A900' },
  }
  const look = styles[status] || styles.expired
  const labelKey = STATUS_LABEL_KEYS[status]
  const label = labelKey
    ? t(labelKey)
    : status === 'approved'
      ? t('adminSubs.approved')
      : status === 'rejected'
        ? t('adminSubs.rejected')
        : status === 'info_requested'
          ? t('adminSubs.infoRequested')
          : status
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: look.bg, color: 'var(--ops-text)' }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: look.dot }} />
      {label}
    </span>
  )
}

export function Sparkline({ values, color = '#3734D0' }: { values: number[]; color?: string }) {
  if (!values.length) return null
  const max = Math.max(...values, 1)
  const w = 88
  const h = 28
  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * w
      const y = h - (v / max) * (h - 4) - 2
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="2" points={pts} />
    </svg>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`ops-skeleton ${className}`} />
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="px-6 py-16 text-center">
      <div
        className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
        style={{ background: 'var(--ops-soft)', color: 'var(--ops-primary)' }}
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7h18M3 12h18M3 17h18" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm max-w-md mx-auto mb-4" style={{ color: 'var(--ops-muted)' }}>
        {body}
      </p>
      {action}
    </div>
  )
}

export function ErrorState({
  title,
  body,
  retryLabel,
  onRetry,
}: {
  title: string
  body: string
  retryLabel: string
  onRetry: () => void
}) {
  return (
    <div className="ops-card p-8 text-center">
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm mb-4" style={{ color: 'var(--ops-muted)' }}>
        {body}
      </p>
      <button type="button" className="ops-btn ops-btn-primary" onClick={onRetry}>
        {retryLabel}
      </button>
    </div>
  )
}

export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel,
  danger,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(8,11,36,0.55)' }}>
      <div className="ops-card max-w-md w-full p-6">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-sm mb-5" style={{ color: 'var(--ops-muted)' }}>
          {body}
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" className="ops-btn ops-btn-ghost" onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`ops-btn ${danger ? 'ops-btn-danger' : 'ops-btn-primary'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

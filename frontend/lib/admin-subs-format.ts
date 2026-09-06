export function interpolate(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] === undefined ? `{${key}}` : String(vars[key]),
  )
}

const localeTags: Record<string, string> = {
  pt: 'pt-PT',
  en: 'en-GB',
  fr: 'fr-FR',
  es: 'es-ES',
}

export function formatOpsDate(value: string | null | undefined, locale: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(localeTags[locale] || 'pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

export function formatOpsDateTime(value: string | null | undefined, locale: string): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(localeTags[locale] || 'pt-PT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatMoney(amount: number | null | undefined, currency: string, locale: string): string {
  const safeAmount = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0
  const formatted = new Intl.NumberFormat(localeTags[locale] || 'pt-PT', {
    maximumFractionDigits: 0,
  }).format(safeAmount)
  if (currency === 'AOA') return `${formatted} Kz`
  return `${formatted} ${currency || ''}`.trim()
}

export function countryDisplayName(code: string, locale: string): string {
  const normalized = (code || '').trim().toUpperCase()
  if (!normalized || normalized === 'UNKNOWN') return ''
  try {
    const display = new Intl.DisplayNames([localeTags[locale] || 'pt-PT'], { type: 'region' })
    return display.of(normalized) || normalized
  } catch {
    return normalized
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const PLAN_LABEL_KEYS: Record<string, string> = {
  free: 'adminSubs.planFree',
  premium: 'adminSubs.planPremium',
  business: 'adminSubs.planBusiness',
  family: 'adminSubs.planFamily',
}

export const STATUS_LABEL_KEYS: Record<string, string> = {
  active: 'adminSubs.statusActive',
  trial: 'adminSubs.statusTrial',
  pending: 'adminSubs.statusPending',
  processing: 'adminSubs.statusPending',
  pending_verification: 'adminSubs.statusPending',
  expired: 'adminSubs.statusExpired',
  cancelled: 'adminSubs.statusCancelled',
  paused: 'adminSubs.statusPaused',
  payment_failed: 'adminSubs.statusPaymentFailed',
  paid: 'adminSubs.paid',
  failed: 'adminSubs.failed',
  rejected: 'adminSubs.rejected',
  refunded: 'adminSubs.payRefunded',
  refund_requested: 'adminSubs.payRefunded',
}

export const METHOD_LABEL_KEYS: Record<string, string> = {
  bank_transfer: 'adminSubs.methodBank',
  apple_iap: 'adminSubs.methodIap',
  card: 'adminSubs.methodCard',
  other: 'adminSubs.methodOther',
}

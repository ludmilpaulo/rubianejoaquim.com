/** Client FX helpers. Conversion math lives on the backend; this only parses input and labels. */

export const WEB_FX_CURRENCIES = ['AOA', 'USD', 'EUR', 'GBP', 'BRL', 'ZAR', 'MZN', 'CAD'] as const
export type WebFxCurrency = (typeof WEB_FX_CURRENCIES)[number]

export function currencyDisplayName(code: string, locale = 'pt'): string {
  try {
    return new Intl.DisplayNames([locale], { type: 'currency' }).of(code) || code
  } catch {
    return code
  }
}

export function formatFxAmount(amount: number, currency: string, locale = 'pt-PT'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

/** Parse 1,000 / 1.000 / 1,250.75 / 1.250,75 / 0.50 */
export function parseFxAmount(raw: string): number | null {
  const text = raw.trim().replace(/\s/g, '')
  if (!text) return null
  const lastComma = text.lastIndexOf(',')
  const lastDot = text.lastIndexOf('.')
  let normalized = text
  if (lastComma >= 0 && lastDot >= 0) {
    normalized =
      lastComma > lastDot ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '')
  } else if (lastComma >= 0) {
    const frac = text.slice(lastComma + 1)
    normalized = frac.length <= 2 ? text.replace(',', '.') : text.replace(/,/g, '')
  } else if (lastDot >= 0) {
    const frac = text.slice(lastDot + 1)
    if (frac.length === 3 && /^\d+$/.test(frac) && text.split('.').length <= 3) {
      normalized = text.replace(/\./g, '')
    }
  }
  const num = Number(normalized)
  if (!Number.isFinite(num) || num < 0) return null
  return num
}

export function minutesSince(iso: string | null): number | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 60000))
}

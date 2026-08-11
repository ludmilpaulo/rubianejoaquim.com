import { isDeviceInAngola } from './deviceRegion'

/** Multi-currency formatting for Zenda — never hardcode AOA at call sites. */
export const CURRENCY_LABEL = 'AOA'

/** Angola uses AOA; all other regions default to USD. */
export function getDefaultCurrency(): CurrencyCode {
  return isDeviceInAngola() ? 'AOA' : 'USD'
}

/** Resolve display/API currency: profile value or device-based default. */
export function resolveUserCurrency(preferred?: string | null): CurrencyCode {
  if (preferred && SUPPORTED_CURRENCIES.includes(preferred as CurrencyCode)) {
    return preferred as CurrencyCode
  }
  return getDefaultCurrency()
}

const LOCALE_MAP: Record<string, string> = {
  AOA: 'pt-AO',
  EUR: 'de-DE',
  USD: 'en-US',
  GBP: 'en-GB',
  BRL: 'pt-BR',
  ZAR: 'en-ZA',
  MZN: 'pt-MZ',
  CAD: 'en-CA',
}

export const SUPPORTED_CURRENCIES = ['AOA', 'USD', 'EUR', 'GBP', 'BRL', 'ZAR', 'MZN', 'CAD'] as const
export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]

/** Human-readable names (English keys; UI translates via currencyNames.*). */
export const CURRENCY_META: Record<
  CurrencyCode,
  { code: CurrencyCode; symbolHint: string; flag: string; nameKey: string }
> = {
  AOA: { code: 'AOA', symbolHint: 'Kz', flag: '🇦🇴', nameKey: 'currencyNames.AOA' },
  USD: { code: 'USD', symbolHint: '$', flag: '🇺🇸', nameKey: 'currencyNames.USD' },
  EUR: { code: 'EUR', symbolHint: '€', flag: '🇪🇺', nameKey: 'currencyNames.EUR' },
  GBP: { code: 'GBP', symbolHint: '£', flag: '🇬🇧', nameKey: 'currencyNames.GBP' },
  BRL: { code: 'BRL', symbolHint: 'R$', flag: '🇧🇷', nameKey: 'currencyNames.BRL' },
  ZAR: { code: 'ZAR', symbolHint: 'R', flag: '🇿🇦', nameKey: 'currencyNames.ZAR' },
  MZN: { code: 'MZN', symbolHint: 'MT', flag: '🇲🇿', nameKey: 'currencyNames.MZN' },
  CAD: { code: 'CAD', symbolHint: 'C$', flag: '🇨🇦', nameKey: 'currencyNames.CAD' },
}

export function currencyLabel(code: CurrencyCode, name?: string): string {
  const meta = CURRENCY_META[code]
  return name ? `${meta.flag} ${code} — ${name}` : `${meta.flag} ${code}`
}

/**
 * Format an amount in its original currency.
 * Prefer `useCurrency().format(amount)` or pass an explicit currency code —
 * never rely on the AOA default for user-facing money.
 */
export const formatCurrency = (amount: number | string, currencyCode: string = 'AOA'): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numAmount)) return `0,00 ${currencyCode}`

  const locale = LOCALE_MAP[currencyCode] || 'en-US'
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numAmount)
  } catch {
    return (
      new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numAmount) +
      ` ${currencyCode}`
    )
  }
}

export const formatCurrencyAOA = (amount: number | string): string => formatCurrency(amount, 'AOA')

/** Dual-line display: original amount + optional converted approx. */
export function formatAmountWithConversion(params: {
  amount: number | string
  currency: string
  convertedAmount?: number | string | null
  displayCurrency?: string | null
  approxLabel?: string
}): { primary: string; secondary: string | null } {
  const primary = formatCurrency(params.amount, params.currency)
  if (
    params.convertedAmount == null ||
    !params.displayCurrency ||
    params.displayCurrency.toUpperCase() === params.currency.toUpperCase()
  ) {
    return { primary, secondary: null }
  }
  const approx = params.approxLabel || '≈'
  return {
    primary,
    secondary: `${approx} ${formatCurrency(params.convertedAmount, params.displayCurrency)}`,
  }
}

/** Multi-currency formatting for Zenda */
export const CURRENCY_LABEL = 'AOA'

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

export const formatCurrency = (amount: number | string, currencyCode = 'AOA'): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numAmount)) return `0,00 ${currencyCode}`

  const locale = LOCALE_MAP[currencyCode] || 'pt-AO'
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

/** App currency: Angolan Kwanza (AOA) - ISO 4217 for Google Play compliance */
export const CURRENCY_LABEL = 'AOA'

export const formatCurrency = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numAmount)) return '0,00 AOA'
  
  return new Intl.NumberFormat('pt-AO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount) + ' AOA'
}

export const formatCurrencyAOA = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(numAmount)) return '0,00 AOA'
  
  return new Intl.NumberFormat('pt-AO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numAmount) + ' AOA'
}

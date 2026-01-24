/**
 * Formata um valor numérico como moeda Kwanza (KZ/AOA)
 * @param value - Valor numérico ou string numérica
 * @returns String formatada como "X.XXX KZ" ou "X.XXX AOA"
 */
export function formatCurrency(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numValue)) return '0 KZ'
  
  // Formatar com separador de milhares e 2 casas decimais
  const formatted = numValue.toLocaleString('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  
  return `${formatted} KZ`
}

/**
 * Formata um valor numérico como moeda Kwanza com símbolo AOA
 * @param value - Valor numérico ou string numérica
 * @returns String formatada como "X.XXX AOA"
 */
export function formatCurrencyAOA(value: number | string): string {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numValue)) return '0 AOA'
  
  const formatted = numValue.toLocaleString('pt-PT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  
  return `${formatted} AOA`
}

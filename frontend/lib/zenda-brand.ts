/**
 * Zenda design system — single source of truth for web product UI.
 *
 * Colors are extracted from the official logo SVG (`assets/zenda_logo.svg` /
 * `public/zenda_logo.svg`). Keep in sync with `mobile/src/theme/colors.ts`.
 *
 * Semantic meaning (same on web and mobile):
 * - Growth green = income, savings, profit, success
 * - Primary blue = brand actions, navigation, budgets
 * - Expense red = expenses, errors
 * - Debt orange = debt, warnings
 *
 * Tailwind: `zenda.primary`, `zenda.growth`, …  |  CSS: `--zenda-primary`, …
 */

export const zendaColors = {
  primary: '#3534C9',
  primaryDark: '#1E2070',
  primaryDeep: '#030412',
  primaryLight: '#5B5AD6',
  primaryMuted: '#3C3BD4',
  primaryContainer: '#E8E8FA',
  growth: '#4DB83D',
  growthDark: '#2D9B3A',
  growthLight: '#6BC962',
  growthContainer: '#E8F8E6',
  navy: '#05050B',
  navyMid: '#11145A',
  background: '#F7F7FA',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  textPrimary: '#05050B',
  textSecondary: '#5B6178',
  textMuted: '#8B91A8',
  textInverse: '#F7F7FA',
  border: '#E2E4EF',
  borderStrong: '#C8CCDC',
  expense: '#E53935',
  debt: '#E67E22',
  warning: '#E67E22',
  success: '#4DB83D',
  error: '#E53935',
  info: '#5B5AD6',
} as const

/** @deprecated Use zendaColors — kept so existing imports keep working. */
export const zendaBrand = {
  primary: zendaColors.primary,
  primaryDark: zendaColors.primaryDark,
  primaryDeep: zendaColors.primaryDeep,
  primaryLight: zendaColors.primaryLight,
  primaryMuted: zendaColors.primaryMuted,
  primaryContainer: zendaColors.primaryContainer,
  growth: zendaColors.growth,
  growthDark: zendaColors.growthDark,
  growthLight: zendaColors.growthLight,
  growthContainer: zendaColors.growthContainer,
  navy: zendaColors.navy,
  navyMid: zendaColors.navyMid,
  background: zendaColors.background,
  expense: zendaColors.expense,
  debt: zendaColors.debt,
  warning: zendaColors.warning,
  text: zendaColors.textPrimary,
  textSecondary: zendaColors.textSecondary,
  border: zendaColors.border,
  chart: [
    zendaColors.primary,
    zendaColors.growth,
    zendaColors.primaryDark,
    zendaColors.primaryMuted,
    zendaColors.expense,
    zendaColors.debt,
    zendaColors.primaryLight,
    zendaColors.growthDark,
  ],
} as const

export const zendaSemantic = {
  income: zendaColors.growth,
  profit: zendaColors.growth,
  savings: zendaColors.growth,
  success: zendaColors.growth,
  budget: zendaColors.primary,
  currency: zendaColors.primaryLight,
  goals: zendaColors.primaryMuted,
  expense: zendaColors.expense,
  debt: zendaColors.debt,
  warning: zendaColors.warning,
  error: zendaColors.error,
  info: zendaColors.info,
} as const

export const zendaDark = {
  background: zendaColors.primaryDeep,
  surface: '#0B0C24',
  elevated: '#15163A',
  primary: zendaColors.primaryLight,
  primaryContainer: zendaColors.navyMid,
  secondary: zendaColors.growthLight,
  text: zendaColors.textInverse,
  textSecondary: '#A8ADC4',
  textMuted: '#7A8099',
  border: '#2A2D4A',
} as const

export const zendaChart = [
  zendaColors.primary,
  zendaColors.growth,
  zendaColors.primaryDark,
  zendaColors.primaryMuted,
  zendaColors.expense,
  zendaColors.debt,
  zendaColors.primaryLight,
  zendaColors.growthDark,
] as const

export const zendaTypography = {
  display: { fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 },
  h1: { fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.25 },
  h2: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.3 },
  h3: { fontSize: '1.0625rem', fontWeight: 600, lineHeight: 1.3 },
  body: { fontSize: '0.9375rem', fontWeight: 400, lineHeight: 1.5 },
  caption: { fontSize: '0.8125rem', fontWeight: 400, lineHeight: 1.4 },
  label: { fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.04em', lineHeight: 1.3 },
  button: { fontSize: '0.9375rem', fontWeight: 700, letterSpacing: '0.01em' },
  figure: { fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' },
} as const

export const zendaSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const

export const zendaRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const

export const zendaShadows = {
  sm: '0 2px 6px rgba(5, 5, 11, 0.06)',
  card: '0 4px 12px rgba(5, 5, 11, 0.08)',
  elevated: '0 8px 20px rgba(30, 32, 112, 0.14)',
} as const

export const zendaButtons = {
  height: 44,
  radius: zendaRadius.md,
  primary: { background: zendaColors.primary, color: '#FFFFFF' },
  secondary: { background: zendaColors.primaryContainer, color: zendaColors.primary },
  success: { background: zendaColors.growth, color: '#FFFFFF' },
  danger: { background: zendaColors.error, color: '#FFFFFF' },
} as const

export type ZendaBrand = typeof zendaBrand
export type ZendaColors = typeof zendaColors

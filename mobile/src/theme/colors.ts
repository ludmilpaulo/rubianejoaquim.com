/**
 * Zenda brand tokens — extracted from official logo SVG (`assets/zenda_logo.svg`).
 *
 * Logo stops:
 * - Primary blue/indigo: #3534C9
 * - Mid navy: #1E2070
 * - Deep navy: #030412 / #05050B / #11145A
 * - Wordmark blue: #3C3BD4
 * - Growth green: #4DB83D
 */

export const brandPalette = {
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
} as const

export const colors = {
  primary: brandPalette.primary,
  primaryDark: brandPalette.primaryDark,
  primaryLight: brandPalette.primaryLight,
  secondary: brandPalette.growth,
  success: brandPalette.growth,
  warning: '#E67E22',
  danger: '#E53935',
  info: brandPalette.primaryLight,
  background: brandPalette.background,
  surface: '#FFFFFF',
  text: brandPalette.navy,
  muted: '#5B6178',
  border: '#E2E4EF',
  brand: {
    primary: brandPalette.primary,
    primaryDark: brandPalette.primaryDark,
    primaryLight: brandPalette.primaryLight,
    primaryContainer: brandPalette.primaryContainer,
    secondary: brandPalette.growth,
    growth: brandPalette.growth,
    growthDark: brandPalette.growthDark,
    accent: '#E67E22',
    ai: brandPalette.primaryMuted,
    danger: '#E53935',
    navy: brandPalette.navy,
    navyMid: brandPalette.navyMid,
  },
  semantic: {
    income: brandPalette.growth,
    profit: brandPalette.growth,
    savings: brandPalette.growth,
    success: brandPalette.growth,
    expense: '#E53935',
    debt: '#E67E22',
    warning: '#E67E22',
    error: '#E53935',
    info: brandPalette.primaryLight,
  },
  gradient: {
    hero: [brandPalette.primary, brandPalette.primaryDark, brandPalette.primaryDeep] as const,
    card: ['#FFFFFF', brandPalette.background] as const,
    ai: [brandPalette.primaryMuted, brandPalette.primary] as const,
    success: [brandPalette.growth, brandPalette.growthDark] as const,
    splash: [brandPalette.primary, brandPalette.primaryDark, brandPalette.primaryDeep] as const,
  },
  backgroundTokens: {
    default: brandPalette.background,
    paper: '#FFFFFF',
    elevated: '#FFFFFF',
    dark: brandPalette.primaryDeep,
    darkSurface: '#0B0C24',
    darkElevated: '#15163A',
    glass: 'rgba(255, 255, 255, 0.78)',
    glassBorder: 'rgba(255, 255, 255, 0.35)',
  },
  textTokens: {
    primary: brandPalette.navy,
    secondary: '#5B6178',
    muted: '#8B91A8',
    inverse: '#F7F7FA',
  },
  borderTokens: {
    light: '#E2E4EF',
    medium: '#C8CCDC',
  },
  status: {
    success: brandPalette.growth,
    warning: '#E67E22',
    error: '#E53935',
    info: brandPalette.primaryLight,
  },
  /** Brand-safe chart series — blues, greens, then semantic accents */
  chart: [
    brandPalette.primary,
    brandPalette.growth,
    brandPalette.primaryDark,
    brandPalette.primaryMuted,
    '#E53935',
    '#E67E22',
    brandPalette.primaryLight,
    brandPalette.growthDark,
  ] as const,
  dark: {
    background: brandPalette.primaryDeep,
    surface: '#0B0C24',
    elevated: '#15163A',
    primary: brandPalette.primaryLight,
    primaryContainer: brandPalette.navyMid,
    secondary: brandPalette.growthLight,
    text: '#F7F7FA',
    textSecondary: '#A8ADC4',
    textMuted: '#7A8099',
    border: '#2A2D4A',
    glass: 'rgba(11, 12, 36, 0.85)',
    glassBorder: 'rgba(91, 90, 214, 0.25)',
  },
} as const

/** Legacy alias used across screens */
export const legacyColors = {
  background: colors.backgroundTokens,
  text: colors.textTokens,
  border: colors.borderTokens,
}

/**
 * Zenda brand tokens — extracted from official logo SVG (`assets/zenda_logo.svg`).
 * Keep in sync with `mobile/src/theme/colors.ts`.
 */
export const zendaBrand = {
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
  expense: '#E53935',
  debt: '#E67E22',
  warning: '#E67E22',
  text: '#05050B',
  textSecondary: '#5B6178',
  border: '#E2E4EF',
  chart: [
    '#3534C9',
    '#4DB83D',
    '#1E2070',
    '#3C3BD4',
    '#E53935',
    '#E67E22',
    '#5B5AD6',
    '#2D9B3A',
  ],
} as const

export type ZendaBrand = typeof zendaBrand

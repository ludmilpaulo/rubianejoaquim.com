import { brandPalette } from './colors'

export const shadows = {
  sm: {
    shadowColor: brandPalette.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  card: {
    shadowColor: brandPalette.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  elevated: {
    shadowColor: brandPalette.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 8,
  },
  glass: {
    shadowColor: brandPalette.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
} as const

export const motion = {
  fast: 150,
  normal: 280,
  slow: 420,
} as const

/** Radius scale: 8 / 12 / 16 / 20 */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const

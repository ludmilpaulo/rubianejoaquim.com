import { spacing } from './spacing'
import { typography } from './typography'
import { shadows, motion, radius } from './shadows'
import { components } from './components'
import { colors as colorTokens, brandPalette, legacyColors } from './colors'

export { spacing, typography, shadows, motion, radius, components, brandPalette, legacyColors }

/** Central Zenda palette — use these tokens in all screens */
export const colors = {
  primary: colorTokens.primary,
  secondary: colorTokens.secondary,
  success: colorTokens.success,
  warning: colorTokens.warning,
  danger: colorTokens.danger,
  info: colorTokens.info,
  surface: colorTokens.surface,
  brand: colorTokens.brand,
  semantic: colorTokens.semantic,
  gradient: colorTokens.gradient,
  background: {
    default: colorTokens.backgroundTokens.default,
    paper: colorTokens.backgroundTokens.paper,
    elevated: colorTokens.backgroundTokens.elevated,
    dark: colorTokens.backgroundTokens.dark,
    darkSurface: colorTokens.backgroundTokens.darkSurface,
    darkElevated: colorTokens.backgroundTokens.darkElevated,
    glass: colorTokens.backgroundTokens.glass,
    glassBorder: colorTokens.backgroundTokens.glassBorder,
  },
  text: colorTokens.textTokens,
  border: colorTokens.borderTokens,
  status: colorTokens.status,
  chart: colorTokens.chart,
  dark: colorTokens.dark,
} as const

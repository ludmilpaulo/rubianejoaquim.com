import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper'
import { colors } from './index'
import { brandPalette } from './colors'

const fontConfig = configureFonts({ config: { fontFamily: 'System' } })

export const zendaLightTheme = {
  ...MD3LightTheme,
  fonts: fontConfig,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.brand.primary,
    primaryContainer: brandPalette.primaryContainer,
    secondary: colors.brand.secondary,
    secondaryContainer: brandPalette.growthContainer,
    tertiary: colors.brand.ai,
    background: colors.background.default,
    surface: colors.background.paper,
    surfaceVariant: brandPalette.background,
    error: colors.brand.danger,
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onSurface: colors.text.primary,
    onSurfaceVariant: colors.text.secondary,
    outline: colors.border.light,
  },
  roundness: 16,
}

export const zendaDarkTheme = {
  ...MD3DarkTheme,
  fonts: fontConfig,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.dark.primary,
    primaryContainer: colors.dark.primaryContainer,
    secondary: colors.dark.secondary,
    secondaryContainer: '#1A3D1A',
    tertiary: brandPalette.primaryMuted,
    background: colors.dark.background,
    surface: colors.dark.surface,
    surfaceVariant: colors.dark.elevated,
    error: colors.brand.danger,
    onPrimary: '#FFFFFF',
    onSecondary: colors.dark.background,
    onSurface: colors.dark.text,
    onSurfaceVariant: colors.dark.textSecondary,
    outline: colors.dark.border,
  },
  roundness: 16,
}

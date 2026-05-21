import { MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper'
import { colors } from './index'

const fontConfig = configureFonts({ config: { fontFamily: 'System' } })

export const zendaLightTheme = {
  ...MD3LightTheme,
  fonts: fontConfig,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.brand.primary,
    primaryContainer: '#EEF2FF',
    secondary: colors.brand.secondary,
    secondaryContainer: '#D1FAE5',
    tertiary: colors.brand.ai,
    background: colors.background.default,
    surface: colors.background.paper,
    surfaceVariant: '#F8FAFC',
    error: colors.brand.danger,
    onPrimary: '#FFFFFF',
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
    primary: colors.brand.primaryLight,
    primaryContainer: '#312E81',
    secondary: colors.brand.secondary,
    background: colors.background.dark,
    surface: '#1E293B',
    onSurface: colors.text.inverse,
  },
  roundness: 16,
}

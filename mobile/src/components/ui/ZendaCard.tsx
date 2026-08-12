import React, { type ReactNode } from 'react'
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native'
import { colors, radius, shadows, spacing } from '../../theme'

interface ZendaCardProps {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  accentColor?: string
  variant?: 'default' | 'glass' | 'elevated'
}

export default function ZendaCard({ children, style, accentColor, variant = 'default' }: ZendaCardProps) {
  const variantStyle =
    variant === 'glass'
      ? styles.glass
      : variant === 'elevated'
        ? styles.elevated
        : styles.card

  return (
    <View
      style={[
        variantStyle,
        accentColor ? { borderLeftColor: accentColor, borderLeftWidth: 4 } : null,
        style,
      ]}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.paper,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.card,
  },
  glass: {
    backgroundColor: colors.background.glass,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.background.glassBorder,
    ...shadows.glass,
  },
  elevated: {
    backgroundColor: colors.background.paper,
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.elevated,
  },
})

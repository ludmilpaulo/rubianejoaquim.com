import React, { type ReactNode } from 'react'
import { StyleSheet, View, type ViewStyle } from 'react-native'
import { colors, radius, shadows, spacing } from '../../theme'

interface ZendaCardProps {
  children: ReactNode
  style?: ViewStyle
  accentColor?: string
}

export default function ZendaCard({ children, style, accentColor }: ZendaCardProps) {
  return (
    <View style={[styles.card, accentColor ? { borderLeftColor: accentColor, borderLeftWidth: 4 } : null, style]}>
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
    ...shadows.card,
  },
})

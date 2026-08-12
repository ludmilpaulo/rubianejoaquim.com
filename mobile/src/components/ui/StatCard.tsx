import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { colors, radius, spacing, typography, shadows } from '../../theme'

interface StatCardProps {
  label: string
  value: string
  icon?: keyof typeof MaterialCommunityIcons.glyphMap
  tone?: 'primary' | 'income' | 'expense' | 'debt' | 'neutral'
}

const TONE: Record<NonNullable<StatCardProps['tone']>, string> = {
  primary: colors.brand.primary,
  income: colors.semantic.income,
  expense: colors.semantic.expense,
  debt: colors.semantic.debt,
  neutral: colors.text.secondary,
}

export default function StatCard({ label, value, icon = 'chart-line', tone = 'primary' }: StatCardProps) {
  const accent = TONE[tone]
  return (
    <View style={[styles.card, { borderLeftColor: accent }]}>
      <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>
        <MaterialCommunityIcons name={icon} size={20} color={accent} />
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
      <Text style={[styles.value, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.background.paper,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderLeftWidth: 4,
    ...shadows.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.text.secondary,
    flexShrink: 1,
  },
  value: {
    ...typography.h3,
    marginTop: spacing.xs,
  },
})

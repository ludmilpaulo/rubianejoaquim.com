import React from 'react'
import { StyleSheet, TouchableOpacity, View } from 'react-native'
import { Text } from 'react-native-paper'
import type { FinancialHealth } from '../../types/dashboard'
import { useI18n } from '../../contexts/I18nContext'
import ZendaCard from '../ui/ZendaCard'
import ProgressRing from '../ui/ProgressRing'
import { colors, spacing } from '../../theme'

const GRADE_COLORS: Record<string, string> = {
  excellent: colors.brand.secondary,
  good: colors.brand.primary,
  fair: colors.brand.accent,
  needs_attention: '#F97316',
  critical: colors.brand.danger,
}

interface FinancialHealthCardProps {
  health: FinancialHealth
  onPress?: () => void
}

export default function FinancialHealthCard({ health, onPress }: FinancialHealthCardProps) {
  const { t } = useI18n()
  const gradeKey = `health.${health.grade}` as const
  const gradeLabel = t(gradeKey)
  const ringColor = GRADE_COLORS[health.grade] ?? colors.brand.primary

  const content = (
    <ZendaCard style={styles.card}>
      <View style={styles.row}>
        <View style={styles.textCol}>
          <Text variant="labelMedium" style={styles.label}>
            {t('home.healthScore')}
          </Text>
          <Text variant="titleLarge" style={[styles.grade, { color: ringColor }]}>
            {gradeLabel}
          </Text>
          {health.tips.length > 0 && (
            <Text variant="bodySmall" style={styles.tip} numberOfLines={2}>
              {t(`health.tip_${health.tips[0]}`)}
            </Text>
          )}
        </View>
        <ProgressRing progress={health.score} color={ringColor} label="/100" />
      </View>
    </ZendaCard>
  )

  if (onPress) {
    return <TouchableOpacity activeOpacity={0.85} onPress={onPress}>{content}</TouchableOpacity>
  }
  return content
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#E8E8FA' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  textCol: { flex: 1, paddingRight: spacing.md },
  label: { color: colors.text.secondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  grade: { fontWeight: '700', marginTop: 4 },
  tip: { color: colors.text.secondary, marginTop: 8 },
})

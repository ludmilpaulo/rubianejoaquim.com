import React, { useCallback, useEffect, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { aiCopilotApi } from '../services/api'
import { useI18n } from '../contexts/I18nContext'
import { useCurrency } from '../contexts/CurrencyContext'
import ZendaLoader from '../components/ui/ZendaLoader'
import ErrorState from '../components/ui/ErrorState'
import ZendaCard from '../components/ui/ZendaCard'
import { colors, spacing, typography } from '../theme'

interface HealthSummary {
  income?: string
  expenses?: string
  savings?: string
  debt_payments?: string
  available?: string
  currency?: string
  health_score?: number
  health_grade?: string
  disclaimer?: string
}

interface Pattern {
  type?: string
  message?: string
}

export default function FinancialHealthScreen() {
  const { t } = useI18n()
  const { format } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)
  const [summary, setSummary] = useState<HealthSummary | null>(null)
  const [patterns, setPatterns] = useState<Pattern[]>([])
  const [narrative, setNarrative] = useState('')

  const load = useCallback(async () => {
    try {
      setError(false)
      const data = await aiCopilotApi.getFinancialHealth()
      setSummary(data.summary || null)
      setPatterns(data.patterns || [])
      setNarrative(data.narrative || '')
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <ZendaLoader message={t('financialHealth.loading')} />
  if (error) {
    return (
      <ErrorState title={t('common.error')} retryLabel={t('common.retry')} onRetry={load} />
    )
  }

  const ccy = summary?.currency || 'AOA'

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
        contentContainerStyle={styles.scroll}
      >
        <Text style={styles.title}>{t('financialHealth.title')}</Text>
        <ZendaCard style={styles.card}>
          <Row label={t('financialHealth.income')} value={format(Number(summary?.income || 0), ccy)} />
          <Row label={t('financialHealth.expenses')} value={format(Number(summary?.expenses || 0), ccy)} />
          <Row label={t('financialHealth.savings')} value={format(Number(summary?.savings || 0), ccy)} />
          <Row label={t('financialHealth.debtPayments')} value={format(Number(summary?.debt_payments || 0), ccy)} />
          <Row label={t('financialHealth.available')} value={format(Number(summary?.available || 0), ccy)} highlight />
        </ZendaCard>

        {summary?.health_score != null ? (
          <Text style={styles.score}>
            {t('financialHealth.score')}: {summary.health_score}/100 ({summary.health_grade})
          </Text>
        ) : null}

        {patterns.length > 0 ? (
          <>
            <Text style={styles.section}>{t('financialHealth.insights')}</Text>
            {patterns.map((p, i) => (
              <ZendaCard key={`${p.type}-${i}`} style={styles.patternCard}>
                <Text style={styles.patternText}>{p.message}</Text>
              </ZendaCard>
            ))}
          </>
        ) : null}

        {narrative ? <Text style={styles.disclaimer}>{narrative}</Text> : null}
        <Text style={styles.disclaimer}>{summary?.disclaimer}</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && styles.highlight]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.default },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { ...typography.h2, marginBottom: spacing.md },
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  rowLabel: { ...typography.body, color: colors.text.secondary },
  rowValue: { ...typography.h3 },
  highlight: { color: colors.brand.primary },
  score: { ...typography.body, marginBottom: spacing.md },
  section: { ...typography.h3, marginBottom: spacing.sm },
  patternCard: { marginBottom: spacing.sm },
  patternText: { ...typography.body },
  disclaimer: { ...typography.caption, color: colors.text.secondary, marginTop: spacing.md },
})

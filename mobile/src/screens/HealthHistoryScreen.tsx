import React, { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, View, Dimensions } from 'react-native'
import { Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BarChart } from 'react-native-chart-kit'
import { personalFinanceApi } from '../services/api'
import { useI18n } from '../contexts/I18nContext'
import ZendaCard from '../components/ui/ZendaCard'
import EmptyState from '../components/ui/EmptyState'
import { colors, spacing, typography } from '../theme'

const chartWidth = Dimensions.get('window').width - spacing.md * 2

export default function HealthHistoryScreen() {
  const { t } = useI18n()
  const [history, setHistory] = useState<{ month: number; year: number; score: number; grade: string }[]>([])

  useEffect(() => {
    personalFinanceApi.getHealthHistory(6).then(setHistory).catch(() => setHistory([]))
  }, [])

  const labels = history.map((h) => `${h.month}/${String(h.year).slice(-2)}`)
  const data = history.map((h) => h.score)

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('analytics.healthHistory')}</Text>
        {history.length === 0 ? (
          <EmptyState icon="chart-timeline-variant" title={t('analytics.noHistory')} />
        ) : (
          <>
            <ZendaCard variant="elevated">
              <BarChart
                data={{ labels, datasets: [{ data: data.length ? data : [0] }] }}
                width={chartWidth - spacing.md * 2}
                height={200}
                chartConfig={{
                  backgroundColor: colors.background.paper,
                  backgroundGradientFrom: '#EEF2FF',
                  backgroundGradientTo: colors.background.paper,
                  color: () => colors.brand.primary,
                  labelColor: () => colors.text.secondary,
                }}
                style={{ borderRadius: 12 }}
                fromZero
                yAxisLabel=""
                yAxisSuffix=""
                showValuesOnTopOfBars
              />
            </ZendaCard>
            {history.map((h) => (
              <ZendaCard key={`${h.year}-${h.month}`}>
                <View style={styles.row}>
                  <Text style={styles.month}>{h.month}/{h.year}</Text>
                  <Text style={styles.score}>{h.score}/100</Text>
                  <Text style={styles.grade}>{t(`health.${h.grade}` as 'health.excellent')}</Text>
                </View>
              </ZendaCard>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.default },
  content: { padding: spacing.md },
  title: { ...typography.h1, color: colors.text.primary, marginBottom: spacing.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  month: { ...typography.body, color: colors.text.primary },
  score: { ...typography.h3, color: colors.brand.primary },
  grade: { ...typography.caption, color: colors.text.secondary },
})

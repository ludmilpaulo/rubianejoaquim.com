import React, { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { personalFinanceApi } from '../services/api'
import { useI18n } from '../contexts/I18nContext'
import ZendaCard from '../components/ui/ZendaCard'
import { colors, spacing, typography } from '../theme'

export default function AnalyticsScreen() {
  const { t } = useI18n()
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    personalFinanceApi.getAnalytics().then(setData).catch(() => setData(null))
  }, [])

  if (!data) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>{t('analytics.title')}</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('analytics.title')}</Text>
        <Text style={styles.sub}>{t('analytics.subtitle')}</Text>

        <Text style={styles.section}>{t('analytics.debtPayoff')}</Text>
        {(data.debt_payoff || []).map((d: any) => (
          <ZendaCard key={d.id} accentColor={colors.brand.danger}>
            <Text style={styles.cardTitle}>{d.creditor}</Text>
            <Text style={styles.meta}>
              {t('analytics.remaining')}: {d.remaining} · ~{d.months_to_payoff} {t('analytics.months')}
            </Text>
          </ZendaCard>
        ))}

        <Text style={styles.section}>{t('analytics.savingsProjection')}</Text>
        {(data.savings_projection || []).map((g: any) => (
          <ZendaCard key={g.id} accentColor={colors.brand.secondary}>
            <Text style={styles.cardTitle}>{g.title}</Text>
            <Text style={styles.meta}>
              {t('analytics.suggestedMonthly')}: {g.suggested_monthly}
            </Text>
          </ZendaCard>
        ))}

        <Text style={styles.section}>{t('analytics.spendingForecast')}</Text>
        {(data.spending_forecast || []).map((f: any, i: number) => (
          <ZendaCard key={i}>
            <View style={styles.row}>
              <Text>{f.month}/{f.year}</Text>
              <Text style={styles.forecastVal}>{f.projected_expenses}</Text>
            </View>
          </ZendaCard>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.default },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  title: { ...typography.h1, color: colors.text.primary },
  sub: { ...typography.body, color: colors.text.secondary, marginBottom: spacing.lg },
  section: { ...typography.label, color: colors.brand.primary, marginTop: spacing.lg, marginBottom: spacing.sm },
  cardTitle: { ...typography.h3, color: colors.text.primary },
  meta: { ...typography.caption, color: colors.text.secondary, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  forecastVal: { fontWeight: '700', color: colors.brand.primary },
})

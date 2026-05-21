import React, { useCallback, useEffect, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native'
import { ActivityIndicator, Button, Text } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { personalFinanceApi } from '../services/api'
import { useI18n } from '../contexts/I18nContext'
import ZendaCard from '../components/ui/ZendaCard'
import { colors, radius, spacing, typography } from '../theme'
import type { AnalyticsPayload } from '../types/api'

type Navigation = { navigate: (name: string) => void }

function EmptySection({ icon, text }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; text: string }) {
  return (
    <ZendaCard style={styles.emptySection}>
      <MaterialCommunityIcons name={icon} size={24} color={colors.text.muted} />
      <Text style={styles.emptyText}>{text}</Text>
    </ZendaCard>
  )
}

export default function AnalyticsScreen() {
  const { t } = useI18n()
  const navigation = useNavigation<Navigation>()
  const [data, setData] = useState<AnalyticsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      setError(false)
      const response = await personalFinanceApi.getAnalytics()
      setData(response)
    } catch {
      setError(true)
      setData(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const debtPlan = data?.debt_payoff || []
  const savingsProjection = data?.savings_projection || []
  const spendingForecast = data?.spending_forecast || []

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              load()
            }}
            tintColor={colors.brand.primary}
          />
        }
      >
        <ZendaCard variant="elevated" style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroIcon}>
              <MaterialCommunityIcons name="chart-timeline-variant" size={34} color={colors.brand.ai} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.title}>{t('analytics.title')}</Text>
              <Text style={styles.sub}>{t('analytics.subtitle')}</Text>
            </View>
          </View>
          <View style={styles.metricRow}>
            <View style={styles.metricPill}>
              <Text style={styles.metricValue}>{debtPlan.length}</Text>
              <Text style={styles.metricLabel}>{t('analytics.debtPayoff')}</Text>
            </View>
            <View style={styles.metricPill}>
              <Text style={styles.metricValue}>{savingsProjection.length}</Text>
              <Text style={styles.metricLabel}>{t('analytics.savingsProjection')}</Text>
            </View>
            <View style={styles.metricPill}>
              <Text style={styles.metricValue}>{spendingForecast.length}</Text>
              <Text style={styles.metricLabel}>{t('analytics.spendingForecast')}</Text>
            </View>
          </View>
          <Button
            mode="contained"
            icon="robot-outline"
            onPress={() => navigation.navigate('AICopilot')}
            style={styles.heroBtn}
          >
            {t('analytics.openAiReport')}
          </Button>
        </ZendaCard>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.brand.primary} />
            <Text style={styles.centerText}>{t('common.loading')}</Text>
          </View>
        ) : error ? (
          <ZendaCard style={styles.errorCard}>
            <Text style={styles.errorText}>{t('common.error')}</Text>
            <Button mode="text" onPress={load}>
              {t('common.retry')}
            </Button>
          </ZendaCard>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.section}>{t('analytics.debtPayoff')}</Text>
              <MaterialCommunityIcons name="credit-card-clock-outline" size={22} color={colors.brand.danger} />
            </View>
            {debtPlan.length ? (
              debtPlan.map((debt, index) => (
                <ZendaCard key={debt.id || index} accentColor={colors.brand.danger}>
                  <Text style={styles.cardTitle}>{debt.creditor || t('analytics.debtPayoff')}</Text>
                  <Text style={styles.meta}>
                    {t('analytics.remaining')}: {debt.remaining || 0} - {debt.months_to_payoff || 0} {t('analytics.months')}
                  </Text>
                  {debt.message ? <Text style={styles.message}>{debt.message}</Text> : null}
                </ZendaCard>
              ))
            ) : (
              <EmptySection icon="credit-card-outline" text={t('analytics.noDebtPlan')} />
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.section}>{t('analytics.savingsProjection')}</Text>
              <MaterialCommunityIcons name="piggy-bank-outline" size={22} color={colors.brand.secondary} />
            </View>
            {savingsProjection.length ? (
              savingsProjection.map((goal, index) => (
                <ZendaCard key={goal.id || index} accentColor={colors.brand.secondary}>
                  <Text style={styles.cardTitle}>{goal.title || goal.goal_title || t('analytics.savingsProjection')}</Text>
                  <Text style={styles.meta}>
                    {t('analytics.suggestedMonthly')}: {goal.suggested_monthly || 0}
                  </Text>
                  {goal.projected_date ? <Text style={styles.message}>{goal.projected_date}</Text> : null}
                  {goal.message ? <Text style={styles.message}>{goal.message}</Text> : null}
                </ZendaCard>
              ))
            ) : (
              <EmptySection icon="piggy-bank-outline" text={t('analytics.noSavingsProjection')} />
            )}

            <View style={styles.sectionHeader}>
              <Text style={styles.section}>{t('analytics.spendingForecast')}</Text>
              <MaterialCommunityIcons name="chart-line-variant" size={22} color={colors.brand.primary} />
            </View>
            {spendingForecast.length ? (
              spendingForecast.map((forecast, index) => (
                <ZendaCard key={`${forecast.month || forecast.category || index}-${forecast.year || index}`}>
                  <View style={styles.row}>
                    <View>
                      <Text style={styles.cardTitle}>
                        {forecast.category || `${forecast.month}/${forecast.year}`}
                      </Text>
                      {forecast.message ? <Text style={styles.message}>{forecast.message}</Text> : null}
                    </View>
                    <Text style={styles.forecastVal}>
                      {forecast.projected_expenses || forecast.forecast_amount || 0}
                    </Text>
                  </View>
                </ZendaCard>
              ))
            ) : (
              <EmptySection icon="chart-line-variant" text={t('analytics.noSpendingForecast')} />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.default },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  heroCard: { backgroundColor: '#FFFFFF' },
  heroHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  heroIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F3FF',
  },
  heroCopy: { flex: 1 },
  title: { ...typography.h1, color: colors.text.primary },
  sub: { ...typography.body, color: colors.text.secondary, marginTop: 4 },
  metricRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  metricPill: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  metricValue: { color: colors.text.primary, fontSize: 18, fontWeight: '800' },
  metricLabel: { color: colors.text.secondary, fontSize: 10, textAlign: 'center', marginTop: 2 },
  heroBtn: { borderRadius: radius.md },
  centerState: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  centerText: { color: colors.text.secondary },
  errorCard: { backgroundColor: '#FEF2F2', alignItems: 'center' },
  errorText: { color: colors.brand.danger, fontWeight: '700' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  section: { ...typography.label, color: colors.brand.primary, textTransform: 'uppercase', letterSpacing: 0 },
  cardTitle: { ...typography.h3, color: colors.text.primary },
  meta: { ...typography.caption, color: colors.text.secondary, marginTop: 4 },
  message: { ...typography.caption, color: colors.text.secondary, marginTop: 8, lineHeight: 18 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  forecastVal: { fontWeight: '800', color: colors.brand.primary },
  emptySection: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: '#FFFFFF' },
  emptyText: { flex: 1, color: colors.text.secondary, lineHeight: 20 },
})

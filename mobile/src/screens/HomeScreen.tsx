import React, { useCallback, useEffect, useState } from 'react'
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import { Text, Badge } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAppSelector } from '../hooks/redux'
import { personalFinanceApi } from '../services/api'
import type { DashboardData } from '../types/dashboard'
import { useI18n } from '../contexts/I18nContext'
import FinancialHealthCard from '../components/dashboard/FinancialHealthCard'
import ZendaCard from '../components/ui/ZendaCard'
import { DashboardSkeleton } from '../components/ui/Skeleton'
import { ZendaLoader } from '../components/ui/ZendaLoader'
import { colors, spacing, radius } from '../theme'
import { formatCurrency, resolveUserCurrency } from '../utils/currency'
import { fetchWithCache } from '../utils/apiCache'
import { flushOfflineQueue, getQueueCount } from '../utils/offlineQueue'
import { shareZendaApp } from '../utils/shareZenda'
import { useActionFeedback } from '../hooks/useActionFeedback'

export default function HomeScreen() {
  const { user } = useAppSelector((state) => state.auth)
  const navigation = useNavigation<{
    navigate: (name: string) => void
    getParent: () =>
      | { navigate: (tab: string, params?: { screen: string }) => void }
      | undefined
  }>()
  const { t, tw, messages } = useI18n()
  const { run, isPending } = useActionFeedback()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)
  const [offlineCount, setOfflineCount] = useState(0)
  const [syncingOffline, setSyncingOffline] = useState(false)
  const [lastSyncedCount, setLastSyncedCount] = useState(0)

  const currency = resolveUserCurrency(user?.preferred_currency || dashboard?.currency)

  const syncQueuedExpenses = useCallback(async () => {
    try {
      const count = await getQueueCount()
      setOfflineCount(count)
      if (!count) return 0

      setSyncingOffline(true)
      const synced = await flushOfflineQueue()
      const remaining = await getQueueCount()
      setOfflineCount(remaining)
      setLastSyncedCount(synced)
      return synced
    } catch {
      return 0
    } finally {
      setSyncingOffline(false)
    }
  }, [])

  const loadDashboard = useCallback(async () => {
    try {
      setError(false)
      const data = await fetchWithCache('dashboard', () => personalFinanceApi.getDashboard(), 120000)
      setDashboard(data as DashboardData)
      const synced = await syncQueuedExpenses()
      if (synced > 0) {
        const freshData = await personalFinanceApi.getDashboard()
        setDashboard(freshData as DashboardData)
      }
    } catch {
      setError(true)
      getQueueCount().then(setOfflineCount).catch(() => {})
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [syncQueuedExpenses])

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      loadDashboard()
    }, [loadDashboard]),
  )

  const onRefresh = () => {
    setRefreshing(true)
    loadDashboard()
  }

  const navigateToTab = (tabName: string) => {
    const parent = navigation.getParent()
    parent?.navigate(tabName)
  }

  const tipIndex = new Date().getDate() % messages.tips.length
  const dailyTip = messages.tips[tipIndex]

  const topCategory = dashboard?.expenses_by_category?.[0]
  const budgetPressure = dashboard?.budgets
    ?.slice()
    .sort((a, b) => Number(b.percentage_used || 0) - Number(a.percentage_used || 0))[0]
  const highestDebt = dashboard?.debts
    ?.slice()
    .sort((a, b) => Number(b.remaining_amount || 0) - Number(a.remaining_amount || 0))[0]
  const leadingGoal = dashboard?.goals
    ?.slice()
    .sort((a, b) => Number(b.progress_percentage || 0) - Number(a.progress_percentage || 0))[0]

  const commandInsights = dashboard
    ? [
        {
          icon: 'chart-donut' as const,
          label: t('home.topCategory'),
          value: topCategory
            ? `${topCategory.name}: ${formatCurrency(topCategory.total, currency)}`
            : t('home.noCategoryData'),
          color: topCategory?.color || colors.brand.primary,
        },
        {
          icon: 'wallet-outline' as const,
          label: t('home.budgetWatch'),
          value: budgetPressure
            ? `${budgetPressure.category || t('home.remainingBudget')}: ${tw('home.budgetUsed', {
                percent: Math.round(Number(budgetPressure.percentage_used || 0)),
              })}`
            : t('home.noBudgetRisk'),
          color: Number(budgetPressure?.percentage_used || 0) >= 90 ? colors.brand.danger : colors.brand.accent,
        },
        {
          icon: 'credit-card-clock-outline' as const,
          label: t('home.debtFocus'),
          value: highestDebt
            ? `${highestDebt.creditor}: ${formatCurrency(highestDebt.remaining_amount, currency)}`
            : t('home.noDebtFocus'),
          color: colors.brand.danger,
        },
        {
          icon: 'flag-checkered' as const,
          label: t('home.goalFocus'),
          value: leadingGoal
            ? `${leadingGoal.title}: ${Math.round(Number(leadingGoal.progress_percentage || 0))}%`
            : t('home.noGoalFocus'),
          color: colors.brand.secondary,
        },
      ]
    : []

  type QuickAction =
    | { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; color: string; tab: string }
    | { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; color: string; route: string }
    | { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; color: string; personalScreen: string }
    | { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; color: string; shareZenda: true }

  const quickActions: QuickAction[] = [
    { icon: 'minus-circle-outline', label: t('home.addExpense'), color: colors.brand.danger, tab: 'Personal' },
    { icon: 'plus-circle-outline', label: t('home.addIncome'), color: colors.brand.secondary, tab: 'Personal' },
    { icon: 'calendar-month', label: t('home.monthlyPlan'), color: colors.brand.primary, personalScreen: 'MonthlyPlan' },
    { icon: 'chart-pie', label: t('home.createBudget'), color: colors.brand.primary, tab: 'Personal' },
    { icon: 'flag-checkered', label: t('home.createGoal'), color: colors.brand.accent, tab: 'Personal' },
    { icon: 'share-variant', label: t('home.shareZenda'), color: colors.brand.secondary, shareZenda: true },
    { icon: 'robot-outline', label: t('home.askAi'), color: colors.brand.ai, route: 'AICopilot' },
    { icon: 'chart-areaspline', label: t('home.viewAnalytics'), color: colors.brand.ai, route: 'Analytics' },
    { icon: 'receipt', label: t('home.scanReceipt'), color: colors.brand.secondary, route: 'ReceiptScanner' },
    { icon: 'school-outline', label: t('home.viewCourses'), color: colors.brand.accent, tab: 'Education' },
  ]

  if (loading && !dashboard) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ZendaLoader message={t('loading.dashboard')} size="lg" />
        <DashboardSkeleton />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView testID="home-screen" style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
      >
        <View style={styles.header}>
          <View>
            <Text variant="headlineSmall" style={styles.greeting}>
              {t('home.greeting')}, {user?.first_name || 'Zenda'}
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              {t('home.subtitle')}
            </Text>
          </View>
          <View style={styles.logoBadge}>
            <MaterialCommunityIcons name="shield-check" size={28} color={colors.brand.primary} />
          </View>
        </View>

        {error && (
          <ZendaCard style={styles.errorCard}>
            <Text style={styles.errorText}>{t('common.error')}</Text>
            <TouchableOpacity onPress={loadDashboard}>
              <Text style={styles.retryLink}>{t('common.retry')}</Text>
            </TouchableOpacity>
          </ZendaCard>
        )}

        {(syncingOffline || offlineCount > 0 || lastSyncedCount > 0) && (
          <ZendaCard style={styles.offlineCard} accentColor={offlineCount > 0 ? colors.brand.accent : colors.brand.secondary}>
            <View style={styles.offlineRow}>
              <View style={styles.offlineIcon}>
                <MaterialCommunityIcons
                  name={offlineCount > 0 ? 'cloud-sync-outline' : 'cloud-check-outline'}
                  size={22}
                  color={offlineCount > 0 ? colors.brand.accent : colors.brand.secondary}
                />
              </View>
              <View style={styles.offlineTextWrap}>
                <Text variant="labelMedium" style={styles.offlineTitle}>
                  {syncingOffline ? t('home.offlineSyncing') : t('home.offlineStatus')}
                </Text>
                <Text variant="bodySmall" style={styles.offlineBody}>
                  {syncingOffline
                    ? t('home.offlineSyncingBody')
                    : offlineCount > 0
                      ? tw('home.offlineQueue', { count: offlineCount })
                      : tw('home.offlineSynced', { count: lastSyncedCount })}
                </Text>
              </View>
              {offlineCount > 0 && (
                <TouchableOpacity
                  style={styles.offlineAction}
                  onPress={async () => {
                    const synced = await syncQueuedExpenses()
                    if (synced > 0) loadDashboard()
                  }}
                  disabled={syncingOffline}
                >
                  <Text style={styles.offlineActionText}>{t('home.syncNow')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </ZendaCard>
        )}

        {dashboard && (
          <>
            <FinancialHealthCard
              health={dashboard.health}
              onPress={() => navigation.navigate('HealthHistory')}
            />

            <Text variant="labelLarge" style={styles.sectionTitle}>
              {t('home.thisMonth')}
            </Text>
            <View style={styles.summaryRow}>
              <ZendaCard style={[styles.summaryCard, { flex: 1 }]}>
                <MaterialCommunityIcons name="arrow-down-circle" size={22} color={colors.brand.secondary} />
                <Text variant="labelSmall" style={styles.summaryLabel}>{t('home.income')}</Text>
                <Text variant="titleMedium" style={styles.summaryValue}>
                  {formatCurrency(dashboard.summary.income, currency)}
                </Text>
              </ZendaCard>
              <ZendaCard style={[styles.summaryCard, { flex: 1 }]}>
                <MaterialCommunityIcons name="arrow-up-circle" size={22} color={colors.brand.danger} />
                <Text variant="labelSmall" style={styles.summaryLabel}>{t('home.expenses')}</Text>
                <Text variant="titleMedium" style={styles.summaryValue}>
                  {formatCurrency(dashboard.summary.expenses, currency)}
                </Text>
              </ZendaCard>
            </View>

            <ZendaCard accentColor={dashboard.summary.balance >= 0 ? colors.brand.secondary : colors.brand.danger}>
              <Text variant="labelMedium" style={styles.summaryLabel}>{t('home.balance')}</Text>
              <Text variant="headlineSmall" style={styles.balanceValue}>
                {formatCurrency(dashboard.summary.balance, currency)}
              </Text>
              {dashboard.summary.business_profit !== 0 && (
                <Text variant="bodySmall" style={styles.businessLine}>
                  {t('home.businessProfit')}: {formatCurrency(dashboard.summary.business_profit, currency)}
                </Text>
              )}
            </ZendaCard>

            <ZendaCard variant="elevated" style={styles.commandCard}>
              <View style={styles.commandHeader}>
                <View style={styles.commandTitleWrap}>
                  <Text variant="labelLarge" style={styles.commandEyebrow}>{t('home.commandCenter')}</Text>
                  <Text variant="bodySmall" style={styles.commandSubtitle}>{t('home.commandSubtitle')}</Text>
                </View>
                <View style={styles.healthPill}>
                  <MaterialCommunityIcons name="pulse" size={16} color={colors.brand.secondary} />
                  <Text style={styles.healthPillText}>{dashboard.health.score}/100</Text>
                </View>
              </View>
              <View style={styles.insightGrid}>
                {commandInsights.map((item) => (
                  <View key={item.label} style={styles.insightItem}>
                    <View style={[styles.insightIcon, { backgroundColor: `${item.color}18` }]}>
                      <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
                    </View>
                    <View style={styles.insightCopy}>
                      <Text variant="labelSmall" style={styles.insightLabel}>{item.label}</Text>
                      <Text variant="bodySmall" style={styles.insightValue} numberOfLines={2}>{item.value}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <View style={styles.commandActions}>
                <TouchableOpacity style={styles.commandBtn} onPress={() => navigation.navigate('Analytics')}>
                  <MaterialCommunityIcons name="chart-line" size={18} color="#fff" />
                  <Text style={styles.commandBtnText}>{t('home.viewAnalytics')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.commandBtn, styles.commandBtnAlt]} onPress={() => navigation.navigate('AICopilot')}>
                  <MaterialCommunityIcons name="robot-outline" size={18} color={colors.brand.ai} />
                  <Text style={styles.commandBtnAltText}>{t('home.openReports')}</Text>
                </TouchableOpacity>
              </View>
            </ZendaCard>

            <Text variant="labelLarge" style={styles.sectionTitle}>{t('home.quickActions')}</Text>
            <View style={styles.quickGrid}>
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  style={styles.quickItem}
                  activeOpacity={0.75}
                  disabled={'shareZenda' in action && isPending('share')}
                  onPress={() => {
                    if ('shareZenda' in action) {
                      if (isPending('share')) return
                      run(
                        async () => {
                          await shareZendaApp({ user, t, tw })
                        },
                        {
                          pendingKey: 'share',
                          pendingMessage: 'feedback.preparingShare',
                          silentSuccess: true,
                          silentError: true,
                        },
                      ).catch(() => {})
                      return
                    }
                    if ('personalScreen' in action) {
                      navigation.getParent()?.navigate('Personal', { screen: action.personalScreen })
                      return
                    }
                    if ('route' in action) {
                      navigation.navigate(action.route)
                    } else {
                      navigateToTab(action.tab)
                    }
                  }}
                >
                  <View style={[styles.quickIcon, { backgroundColor: `${action.color}18` }]}>
                    <MaterialCommunityIcons name={action.icon} size={26} color={action.color} />
                  </View>
                  <Text variant="labelSmall" style={styles.quickLabel} numberOfLines={2}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.statsRow}>
              <TouchableOpacity style={styles.statChip} onPress={() => navigation.navigate('ToDoList')}>
                <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={20} color={colors.brand.primary} />
                <Text variant="bodySmall">{dashboard.tasks_today} {t('home.tasksToday')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statChip} onPress={() => navigation.navigate('Notifications')}>
                <MaterialCommunityIcons name="bell-outline" size={20} color={colors.brand.accent} />
                <Text variant="bodySmall">{t('home.notifications')}</Text>
                {dashboard.unread_notifications > 0 && (
                  <Badge style={styles.badge}>{dashboard.unread_notifications}</Badge>
                )}
              </TouchableOpacity>
            </View>

            {dashboard.goals.length > 0 && (
              <>
                <Text variant="labelLarge" style={styles.sectionTitle}>{t('home.savings')}</Text>
                {dashboard.goals.map((goal) => (
                  <ZendaCard key={goal.id}>
                    <View style={styles.goalRow}>
                      <Text variant="titleSmall" style={styles.goalTitle}>{goal.title}</Text>
                      <Text variant="labelSmall">{Math.round(goal.progress_percentage)}%</Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${Math.min(100, goal.progress_percentage)}%` }]} />
                    </View>
                  </ZendaCard>
                ))}
              </>
            )}

            <ZendaCard style={styles.aiCard}>
              <View style={styles.aiHeader}>
                <MaterialCommunityIcons name="robot" size={24} color={colors.brand.ai} />
                <Text variant="titleSmall" style={styles.aiTitle}>{t('home.aiInsight')}</Text>
              </View>
              <Text variant="bodySmall" style={styles.aiBody} numberOfLines={3}>
                {dashboard.health.tips[0] ? t(`health.tip_${dashboard.health.tips[0]}`) : dailyTip}
              </Text>
              <TouchableOpacity style={styles.aiBtn} onPress={() => navigation.navigate('AICopilot')}>
                <Text style={styles.aiBtnText}>{t('home.askAi')}</Text>
              </TouchableOpacity>
            </ZendaCard>

            <ZendaCard style={styles.tipCard}>
              <Text variant="labelMedium" style={styles.tipLabel}>{t('home.tipOfDay')}</Text>
              <Text variant="bodyMedium" style={styles.tipText}>{dailyTip}</Text>
            </ZendaCard>
          </>
        )}

        <View style={styles.hubSection}>
          <Text variant="labelLarge" style={styles.sectionTitle}>{t('finance.personal')}</Text>
          {(
            [
              { tab: 'Personal', icon: 'wallet', title: t('finance.personal'), color: colors.brand.primary },
              { tab: 'Business', icon: 'store', title: t('finance.business'), color: colors.brand.secondary },
              { tab: 'Education', icon: 'school', title: t('finance.education'), color: colors.brand.accent },
            ] as const
          ).map((item) => (
            <TouchableOpacity key={item.tab} onPress={() => navigateToTab(item.tab)} activeOpacity={0.8}>
              <ZendaCard accentColor={item.color}>
                <View style={styles.hubRow}>
                  <MaterialCommunityIcons name={item.icon} size={28} color={item.color} />
                  <Text variant="titleMedium" style={styles.hubTitle}>{item.title}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={24} color={colors.text.muted} />
                </View>
              </ZendaCard>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => navigation.navigate('Analytics')} activeOpacity={0.8}>
            <ZendaCard accentColor={colors.brand.ai}>
              <View style={styles.hubRow}>
                <MaterialCommunityIcons name="chart-areaspline" size={28} color={colors.brand.ai} />
                <Text variant="titleMedium" style={styles.hubTitle}>{t('analytics.title')}</Text>
                <MaterialCommunityIcons name="chevron-right" size={24} color={colors.text.muted} />
              </View>
            </ZendaCard>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('FamilyFinance')} activeOpacity={0.8}>
            <ZendaCard accentColor={colors.brand.accent}>
              <View style={styles.hubRow}>
                <MaterialCommunityIcons name="account-group" size={28} color={colors.brand.accent} />
                <Text variant="titleMedium" style={styles.hubTitle}>{t('family.title')}</Text>
                <MaterialCommunityIcons name="chevron-right" size={24} color={colors.text.muted} />
              </View>
            </ZendaCard>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('ReceiptScanner')} activeOpacity={0.8}>
            <ZendaCard accentColor={colors.brand.secondary}>
              <View style={styles.hubRow}>
                <MaterialCommunityIcons name="receipt" size={28} color={colors.brand.secondary} />
                <Text variant="titleMedium" style={styles.hubTitle}>{t('receipt.title')}</Text>
                <MaterialCommunityIcons name="chevron-right" size={24} color={colors.text.muted} />
              </View>
            </ZendaCard>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Market')} activeOpacity={0.8}>
            <ZendaCard accentColor={colors.brand.danger}>
              <View style={styles.hubRow}>
                <MaterialCommunityIcons name="chart-line" size={28} color={colors.brand.danger} />
                <Text variant="titleMedium" style={styles.hubTitle}>{t('finance.market')}</Text>
                <MaterialCommunityIcons name="chevron-right" size={24} color={colors.text.muted} />
              </View>
            </ZendaCard>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.default },
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  greeting: { fontWeight: '700', color: colors.text.primary },
  subtitle: { color: colors.text.secondary, marginTop: 4 },
  logoBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: colors.text.secondary,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  summaryCard: { alignItems: 'flex-start', gap: 4 },
  summaryLabel: { color: colors.text.muted, marginTop: 4 },
  summaryValue: { fontWeight: '700', color: colors.text.primary },
  balanceValue: { fontWeight: '700', color: colors.text.primary, marginTop: 4 },
  businessLine: { color: colors.text.secondary, marginTop: 8 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  quickItem: {
    width: '30%',
    minWidth: 100,
    backgroundColor: colors.background.paper,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickLabel: { textAlign: 'center', color: colors.text.primary, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.background.paper,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  badge: { backgroundColor: colors.brand.danger },
  goalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  goalTitle: { fontWeight: '600', flex: 1 },
  progressTrack: { height: 8, backgroundColor: colors.border.light, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.brand.primary, borderRadius: 4 },
  aiCard: { backgroundColor: '#F5F3FF' },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  aiTitle: { fontWeight: '600' },
  aiBody: { color: colors.text.secondary, lineHeight: 20 },
  aiBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.brand.ai,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  aiBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  tipCard: { backgroundColor: '#FFFBEB' },
  tipLabel: { color: colors.brand.accent, marginBottom: 4 },
  tipText: { color: colors.text.primary, lineHeight: 22 },
  hubSection: { marginTop: spacing.md },
  hubRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  hubTitle: { flex: 1, fontWeight: '600' },
  errorCard: { backgroundColor: '#FEF2F2', alignItems: 'center' },
  errorText: { color: colors.brand.danger },
  retryLink: { color: colors.brand.primary, fontWeight: '600', marginTop: 8 },
  offlineCard: {
    backgroundColor: '#FFFFFF',
  },
  offlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  offlineIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineTextWrap: {
    flex: 1,
  },
  offlineTitle: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  offlineBody: {
    color: colors.text.secondary,
    marginTop: 2,
  },
  offlineAction: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: '#FFF7ED',
  },
  offlineActionText: {
    color: colors.brand.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  commandCard: {
    backgroundColor: '#FFFFFF',
  },
  commandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  commandTitleWrap: {
    flex: 1,
  },
  commandEyebrow: {
    color: colors.text.primary,
    fontWeight: '800',
  },
  commandSubtitle: {
    color: colors.text.secondary,
    marginTop: 2,
  },
  healthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
    backgroundColor: '#ECFDF5',
  },
  healthPillText: {
    color: colors.brand.secondary,
    fontWeight: '800',
    fontSize: 12,
  },
  insightGrid: {
    gap: spacing.sm,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#F8FAFC',
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightCopy: {
    flex: 1,
  },
  insightLabel: {
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0,
  },
  insightValue: {
    color: colors.text.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  commandActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  commandBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.brand.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: spacing.sm,
  },
  commandBtnAlt: {
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  commandBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  commandBtnAltText: {
    color: colors.brand.ai,
    fontSize: 12,
    fontWeight: '700',
  },
})

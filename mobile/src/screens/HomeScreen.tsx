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
import { colors, spacing, radius } from '../theme'
import { formatCurrency } from '../utils/currency'

export default function HomeScreen() {
  const { user } = useAppSelector((state) => state.auth)
  const navigation = useNavigation<{ navigate: (name: string) => void; getParent: () => { navigate: (tab: string) => void } | undefined }>()
  const { t, locale, messages } = useI18n()
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)

  const currency = user?.preferred_currency || dashboard?.currency || 'AOA'

  const loadDashboard = useCallback(async () => {
    try {
      setError(false)
      const data = await personalFinanceApi.getDashboard()
      setDashboard(data as DashboardData)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

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

  const quickActions = [
    { icon: 'minus-circle-outline' as const, label: t('home.addExpense'), color: colors.brand.danger, tab: 'Personal' },
    { icon: 'plus-circle-outline' as const, label: t('home.addIncome'), color: colors.brand.secondary, tab: 'Personal' },
    { icon: 'chart-pie' as const, label: t('home.createBudget'), color: colors.brand.primary, tab: 'Personal' },
    { icon: 'flag-checkered' as const, label: t('home.createGoal'), color: colors.brand.accent, tab: 'Personal' },
    { icon: 'robot-outline' as const, label: t('home.askAi'), color: colors.brand.ai, route: 'AICopilot' },
    { icon: 'school-outline' as const, label: t('home.viewCourses'), color: colors.brand.accent, tab: 'Education' },
  ]

  if (loading && !dashboard) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <DashboardSkeleton />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />}
      >
        <View style={styles.header}>
          <View>
            <Text variant="headlineSmall" style={styles.greeting}>
              {t('home.greeting')}, {user?.first_name || 'Zenda'} 👋
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

        {dashboard && (
          <>
            <FinancialHealthCard health={dashboard.health} />

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

            <Text variant="labelLarge" style={styles.sectionTitle}>{t('home.quickActions')}</Text>
            <View style={styles.quickGrid}>
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  style={styles.quickItem}
                  activeOpacity={0.75}
                  onPress={() => {
                    if ('route' in action && action.route) {
                      navigation.navigate(action.route)
                    } else if ('tab' in action) {
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
          {[
            { tab: 'Personal', icon: 'wallet', title: t('finance.personal'), color: colors.brand.primary },
            { tab: 'Business', icon: 'store', title: t('finance.business'), color: colors.brand.secondary },
            { tab: 'Education', icon: 'school', title: t('finance.education'), color: colors.brand.accent },
          ].map((item) => (
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
    letterSpacing: 0.6,
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
})

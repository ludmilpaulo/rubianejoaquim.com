import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import { Button, Card, Chip, Text, TextInput } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { personalFinanceApi } from '../services/api'
import CurrencyPicker from '../components/CurrencyPicker'
import { useCurrency } from '../contexts/CurrencyContext'
import type { CurrencyCode } from '../utils/currency'
import { useI18n } from '../contexts/I18nContext'
import { formatDate } from '../i18n/format'
import { getApiErrorMessage } from '../types/api'
import type {
  MonthlyPlanDashboard,
  MonthlyPlanItem,
  PlanBucket,
  PlanItemKey,
  PlanProgressStatus,
} from '../types/api'
import { colors, spacing, radius } from '../theme'
import { useActionFeedback } from '../hooks/useActionFeedback'
import { ZendaLoading } from '../components/ui/ZendaLoader'

const PLAN_ITEM_KEYS: PlanItemKey[] = [
  'rent',
  'transport',
  'food',
  'electricity',
  'internet',
  'school',
  'family',
  'debt',
  'savings',
  'entertainment',
  'other',
]

const DEFAULT_BUCKETS: Record<PlanItemKey, PlanBucket> = {
  rent: 'needs',
  transport: 'needs',
  food: 'needs',
  electricity: 'needs',
  internet: 'needs',
  school: 'needs',
  family: 'needs',
  debt: 'debt',
  savings: 'savings',
  entertainment: 'wants',
  other: 'needs',
}

const BUCKET_OPTIONS: PlanBucket[] = ['needs', 'wants', 'savings', 'debt']

type EditableItem = {
  key: PlanItemKey
  amount: string
  bucket: PlanBucket
}

function parseAmount(value: string | number | undefined): number {
  if (value === undefined || value === null) return 0
  const normalized = String(value).replace(',', '.')
  const parsed = parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function defaultItems(existing: MonthlyPlanItem[] | undefined): EditableItem[] {
  const byKey = new Map<string, MonthlyPlanItem>()
  for (const item of existing ?? []) {
    byKey.set(String(item.key), item)
  }
  return PLAN_ITEM_KEYS.map((key) => {
    const found = byKey.get(key)
    return {
      key,
      amount: found ? String(found.amount ?? '') : '',
      bucket: (found?.bucket as PlanBucket) || DEFAULT_BUCKETS[key],
    }
  })
}

function statusColor(status: PlanProgressStatus): string {
  if (status === 'exceeded' || status === 'at_limit') return colors.brand.danger
  if (status === 'warning') return colors.brand.accent
  return colors.brand.secondary
}

export default function MonthlyPlanScreen() {
  const { t, tw, locale } = useI18n()
  const { currency: preferredCurrency, format } = useCurrency()
  const alert = useAlert()
  const feedback = useActionFeedback()

  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dashboard, setDashboard] = useState<MonthlyPlanDashboard | null>(null)
  const [salary, setSalary] = useState('')
  const [spendingLimit, setSpendingLimit] = useState('')
  const [savingsTarget, setSavingsTarget] = useState('')
  const [planCurrency, setPlanCurrency] = useState<CurrencyCode>(preferredCurrency)
  const [items, setItems] = useState<EditableItem[]>(() => defaultItems([]))

  const monthLabel = formatDate(locale, new Date(year, month - 1, 1), {
    month: 'long',
    year: 'numeric',
  })

  const isEmptyPlan = useMemo(() => {
    if (!dashboard) return false
    return (
      !dashboard.has_plan &&
      parseAmount(dashboard.salary) === 0 &&
      parseAmount(dashboard.spending_limit) === 0
    )
  }, [dashboard])

  const loadPlan = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [planRes, dashRes] = await Promise.all([
        personalFinanceApi.getMonthlyPlanCurrent(month, year),
        personalFinanceApi.getMonthlyPlanDashboard(month, year),
      ])
      setDashboard(dashRes)
      setSalary(String(planRes.salary ?? ''))
      setSpendingLimit(String(planRes.spending_limit ?? ''))
      setSavingsTarget(String(planRes.savings_target ?? ''))
      setPlanCurrency((planRes.currency || preferredCurrency) as CurrencyCode)
      setItems(defaultItems(planRes.items))
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'plan.loadFailed'))
      setDashboard(null)
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => {
    loadPlan()
  }, [loadPlan])

  const shiftMonth = (delta: number) => {
    const date = new Date(year, month - 1 + delta, 1)
    setMonth(date.getMonth() + 1)
    setYear(date.getFullYear())
  }

  const goToCurrentMonth = () => {
    const today = new Date()
    setMonth(today.getMonth() + 1)
    setYear(today.getFullYear())
  }

  const updateItemAmount = (key: PlanItemKey, amount: string) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, amount } : item)))
  }

  const cycleItemBucket = (key: PlanItemKey) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.key !== key) return item
        const idx = BUCKET_OPTIONS.indexOf(item.bucket)
        const next = BUCKET_OPTIONS[(idx + 1) % BUCKET_OPTIONS.length]
        return { ...item, bucket: next }
      }),
    )
  }

  const progress = dashboard
  const percentUsed = parseAmount(progress?.percent_used)
  const progressWidth = Math.min(Math.max(percentUsed, 0), 100)
  const progressStatus = progress?.status ?? 'ok'

  const statusMessage = useMemo(() => {
    if (!progress) return ''
    if (progress.status === 'exceeded') {
      return t('plan.statusExceeded')
    }
    if (progress.status === 'at_limit') {
      return t('plan.statusAtLimit')
    }
    if (progress.status === 'warning') {
      return t('plan.statusWarning')
    }
    return tw('plan.statusRemaining', {
      amount: format(parseAmount(progress.remaining)),
    })
  }, [progress, t, tw, format])

  const handleSave = () => {
    void feedback.run(
      async () => {
        const payload = {
          salary: parseAmount(salary).toFixed(2),
          spending_limit: parseAmount(spendingLimit).toFixed(2),
          savings_target: parseAmount(savingsTarget).toFixed(2),
          currency: planCurrency,
          items: items.map((item, index) => ({
            key: item.key,
            label: t(`plan.items.${item.key}`),
            amount: parseAmount(item.amount).toFixed(2),
            bucket: item.bucket,
            sort_order: index,
          })),
        }
        await personalFinanceApi.saveMonthlyPlanCurrent(payload, month, year)
        await loadPlan()
      },
      {
        pendingKey: 'savePlan',
        pendingMessage: 'feedback.savingPlan',
        successMessage: 'plan.saveSuccess',
        errorFallback: 'plan.saveFailed',
      },
    )
  }

  const dashboardCards = progress
    ? [
        { label: t('plan.income'), value: format(parseAmount(progress.salary)), icon: 'cash-plus' as const },
        {
          label: t('plan.plannedExpenses'),
          value: format(parseAmount(progress.planned_expenses)),
          icon: 'clipboard-list-outline' as const,
        },
        {
          label: t('plan.actualExpenses'),
          value: format(parseAmount(progress.actual_expenses)),
          icon: 'cash-minus' as const,
        },
        {
          label: t('plan.savingsTarget'),
          value: format(parseAmount(progress.savings_target)),
          icon: 'piggy-bank-outline' as const,
        },
        {
          label: t('plan.actualSavings'),
          value: format(parseAmount(progress.actual_savings)),
          icon: 'chart-line' as const,
        },
        {
          label: t('plan.remaining'),
          value: format(parseAmount(progress.remaining)),
          icon: 'wallet-outline' as const,
        },
      ]
    : []

  if (loading && !dashboard) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ZendaLoading visible fill message={t('loading.plan')} />
      </SafeAreaView>
    )
  }

  if (error && !dashboard) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.centered}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={colors.brand.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <Button mode="contained" onPress={loadPlan}>
            {t('common.retry')}
          </Button>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.monthSwitcher}>
          <TouchableOpacity style={styles.monthBtn} onPress={() => shiftMonth(-1)}>
            <MaterialCommunityIcons name="chevron-left" size={28} color={colors.brand.primary} />
          </TouchableOpacity>
          <View style={styles.monthCenter}>
            <Text variant="titleMedium" style={styles.monthTitle}>
              {monthLabel}
            </Text>
            <Button compact mode="text" onPress={goToCurrentMonth}>
              {t('plan.thisMonth')}
            </Button>
          </View>
          <TouchableOpacity style={styles.monthBtn} onPress={() => shiftMonth(1)}>
            <MaterialCommunityIcons name="chevron-right" size={28} color={colors.brand.primary} />
          </TouchableOpacity>
        </View>

        {isEmptyPlan && (
          <Card style={styles.emptyCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.emptyTitle}>
                {t('plan.emptyTitle')}
              </Text>
              <Text variant="bodyMedium" style={styles.emptyBody}>
                {t('plan.emptyBody')}
              </Text>
            </Card.Content>
          </Card>
        )}

        {progress && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                {t('plan.dashboard')}
              </Text>
              <View style={styles.dashboardGrid}>
                {dashboardCards.map((card) => (
                  <View key={card.label} style={styles.dashboardItem}>
                    <MaterialCommunityIcons name={card.icon} size={20} color={colors.brand.primary} />
                    <Text variant="labelSmall" style={styles.dashboardLabel}>
                      {card.label}
                    </Text>
                    <Text variant="titleSmall" style={styles.dashboardValue}>
                      {card.value}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.progressHeader}>
                <Text variant="labelLarge">{t('plan.spendingProgress')}</Text>
                <Text variant="labelMedium" style={{ color: statusColor(progressStatus) }}>
                  {tw('plan.percentUsed', { percent: Math.round(percentUsed) })}
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progressWidth}%`,
                      backgroundColor: statusColor(progressStatus),
                    },
                  ]}
                />
              </View>
              <Text variant="bodySmall" style={[styles.statusMessage, { color: statusColor(progressStatus) }]}>
                {statusMessage}
              </Text>
            </Card.Content>
          </Card>
        )}

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('plan.salarySection')}
            </Text>
            <CurrencyPicker
              value={planCurrency}
              onChange={setPlanCurrency}
              label={t('market.selectCurrency')}
            />
            <TextInput
              mode="outlined"
              label={tw('plan.salaryLabel', { currency: planCurrency })}
              value={salary}
              onChangeText={setSalary}
              keyboardType="decimal-pad"
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label={tw('plan.spendingLimitLabel', { currency: planCurrency })}
              value={spendingLimit}
              onChangeText={setSpendingLimit}
              keyboardType="decimal-pad"
              style={styles.input}
            />
            <TextInput
              mode="outlined"
              label={tw('plan.savingsTargetLabel', { currency: planCurrency })}
              value={savingsTarget}
              onChangeText={setSavingsTarget}
              keyboardType="decimal-pad"
              style={styles.input}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {t('plan.plannedItems')}
            </Text>
            <Text variant="bodySmall" style={styles.sectionHint}>
              {t('plan.bucketHint')}
            </Text>
            {items.map((item) => (
              <View key={item.key} style={styles.itemRow}>
                <View style={styles.itemHeader}>
                  <Text variant="labelLarge">{t(`plan.items.${item.key}`)}</Text>
                  <Chip compact onPress={() => cycleItemBucket(item.key)} style={styles.bucketChip}>
                    {t(`plan.buckets.${item.bucket}`)}
                  </Chip>
                </View>
                <TextInput
                  mode="outlined"
                  dense
                  label={tw('plan.amountLabel', { currency: planCurrency })}
                  value={item.amount}
                  onChangeText={(value) => updateItemAmount(item.key, value)}
                  keyboardType="decimal-pad"
                  style={styles.itemInput}
                />
              </View>
            ))}
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={handleSave}
          loading={feedback.isPending('savePlan')}
          disabled={feedback.isPending('savePlan')}
          style={styles.saveBtn}
          buttonColor={colors.brand.primary}
        >
          {feedback.actionLabel('plan.save', 'savePlan', 'feedback.savingPlan')}
        </Button>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
  },
  loadingText: {
    color: colors.text.muted,
  },
  errorText: {
    color: colors.brand.danger,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  monthSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  monthBtn: {
    padding: spacing.xs,
  },
  monthCenter: {
    flex: 1,
    alignItems: 'center',
  },
  monthTitle: {
    fontWeight: '700',
    color: colors.text.primary,
  },
  card: {
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#fff',
  },
  emptyCard: {
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: '#eef2ff',
  },
  emptyTitle: {
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  emptyBody: {
    color: colors.text.muted,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: spacing.sm,
    color: colors.text.primary,
  },
  sectionHint: {
    color: colors.text.muted,
    marginBottom: spacing.md,
  },
  input: {
    marginBottom: spacing.sm,
  },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  dashboardItem: {
    width: '47%',
    backgroundColor: '#f8fafc',
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 4,
  },
  dashboardLabel: {
    color: colors.text.muted,
  },
  dashboardValue: {
    fontWeight: '700',
    color: colors.text.primary,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  statusMessage: {
    marginTop: spacing.sm,
    fontWeight: '600',
  },
  itemRow: {
    marginBottom: spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  bucketChip: {
    backgroundColor: '#eef2ff',
  },
  itemInput: {
    backgroundColor: '#fff',
  },
  saveBtn: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
  },
})

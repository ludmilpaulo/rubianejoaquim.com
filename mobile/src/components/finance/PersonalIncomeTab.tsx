import React, { useCallback, useEffect, useState } from 'react'
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { Button, Card, Chip, Dialog, Portal, Text, TextInput } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { personalFinanceApi } from '../../services/api'
import type { IncomePayload } from '../../types/api'
import { unwrapList } from '../../types/api'
import { colors, spacing, radius } from '../../theme'
import { useCurrency } from '../../contexts/CurrencyContext'
import { useI18n } from '../../contexts/I18nContext'
import { getApiErrorMessage } from '../../types/api'
import type { CurrencyCode } from '../../utils/currency'
import CurrencyPicker from '../CurrencyPicker'
import type { PeriodState } from '../PeriodSelector'

type IncomeRecord = {
  id: number
  amount: string
  description: string
  date: string
  source_type: string
  currency?: string
  is_recurring?: boolean
  recurrence?: string
  notes?: string
}

const SOURCE_VALUES = ['salary', 'business', 'freelance', 'investment', 'gift', 'other'] as const

interface Props {
  periodState: PeriodState
  onRefreshParent?: () => void
}

export default function PersonalIncomeTab({ periodState, onRefreshParent }: Props) {
  const { t, tw } = useI18n()
  const { currency: preferredCurrency, format, formatDual } = useCurrency()
  const [incomes, setIncomes] = useState<IncomeRecord[]>([])
  const [summary, setSummary] = useState<{ total?: string; count?: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<IncomeRecord | null>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [formCurrency, setFormCurrency] = useState<CurrencyCode>(preferredCurrency)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [sourceType, setSourceType] = useState<IncomePayload['source_type']>('salary')
  const [isRecurring, setIsRecurring] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const month = periodState.month
      const year = periodState.year
      const [listData, summaryData] = await Promise.all([
        personalFinanceApi.getIncome(month, year),
        personalFinanceApi.getIncomeSummary({
          period: periodState.period,
          month,
          year,
        }),
      ])
      setIncomes(unwrapList<IncomeRecord>(listData))
      setSummary(summaryData)
    } catch {
      setIncomes([])
      setSummary(null)
    } finally {
      setLoading(false)
    }
  }, [periodState])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setAmount('')
    setDescription('')
    setFormCurrency(preferredCurrency)
    setDate(new Date().toISOString().slice(0, 10))
    setSourceType('salary')
    setIsRecurring(false)
    setModalVisible(true)
  }

  const openEdit = (item: IncomeRecord) => {
    setEditing(item)
    setAmount(String(item.amount))
    setDescription(item.description)
    setFormCurrency((item.currency || preferredCurrency) as CurrencyCode)
    setDate(item.date)
    setSourceType((item.source_type as IncomePayload['source_type']) || 'salary')
    setIsRecurring(!!item.is_recurring)
    setModalVisible(true)
  }

  const save = async () => {
    const parsed = parseFloat(amount.replace(',', '.'))
    if (!parsed || parsed <= 0 || !description.trim()) {
      Alert.alert(t('common.error'), t('personal.invalidAmount'))
      return
    }
    setSaving(true)
    try {
      const payload: IncomePayload = {
        amount: parsed.toFixed(2),
        description: description.trim(),
        date,
        source_type: sourceType,
        currency: formCurrency,
        is_recurring: isRecurring,
        recurrence: isRecurring ? 'monthly' : 'none',
      }
      if (editing) {
        await personalFinanceApi.updateIncome(editing.id, payload)
      } else {
        await personalFinanceApi.createIncome(payload)
      }
      setModalVisible(false)
      await load()
      onRefreshParent?.()
    } catch (error: unknown) {
      Alert.alert(t('common.error'), getApiErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const remove = (item: IncomeRecord) => {
    Alert.alert(t('common.delete'), t('personal.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await personalFinanceApi.deleteIncome(item.id)
            await load()
            onRefreshParent?.()
          } catch (error: unknown) {
            Alert.alert(t('common.error'), getApiErrorMessage(error))
          }
        },
      },
    ])
  }

  const sourceLabel = (v: string) => {
    const labels: Record<string, string> = {
      salary: t('personal.incomeSourceSalary'),
      business: t('personal.incomeSourceBusiness'),
      freelance: t('personal.incomeSourceFreelance'),
      investment: t('personal.incomeSourceInvestment'),
      gift: t('personal.incomeSourceGift'),
      other: t('personal.incomeSourceOther'),
    }
    return labels[v] ?? v
  }

  return (
    <View style={styles.wrap}>
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.summaryTitle}>
            {t('personal.periodIncome')}
          </Text>
          <Text variant="headlineMedium" style={styles.summaryAmount}>
            {format(summary?.total ?? '0', preferredCurrency)}
          </Text>
          <Text variant="bodySmall" style={styles.muted}>
            {tw('personal.incomeEntries', { count: summary?.count ?? incomes.length })}
          </Text>
        </Card.Content>
      </Card>

      <Button mode="contained" icon="plus" onPress={openCreate} style={styles.addBtn}>
        {t('personal.addIncome')}
      </Button>

      {loading ? (
        <Text style={styles.muted}>{t('common.loading')}</Text>
      ) : incomes.length === 0 ? (
        <Text style={styles.muted}>{t('personal.emptyIncome')}</Text>
      ) : (
        <ScrollView>
          {incomes.map((item) => (
            <Card key={item.id} style={styles.itemCard}>
              <Card.Content>
                <View style={styles.row}>
                  <View style={styles.flex}>
                    <Text variant="titleMedium">{item.description}</Text>
                    <Text variant="bodySmall" style={styles.muted}>
                      {sourceLabel(item.source_type)} · {item.date}
                      {item.is_recurring ? ` · ${t('personal.recurringTag')}` : ''}
                    </Text>
                  </View>
                  <View style={styles.amountCol}>
                    {(() => {
                      const dual = formatDual(item.amount, item.currency || preferredCurrency)
                      return (
                        <>
                          <Text variant="titleMedium" style={styles.incomeAmount}>
                            +{dual.primary}
                          </Text>
                          {dual.secondary ? (
                            <Text variant="bodySmall" style={styles.muted}>{dual.secondary}</Text>
                          ) : null}
                        </>
                      )
                    })()}
                  </View>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => openEdit(item)}>
                    <MaterialCommunityIcons name="pencil" size={22} color={colors.brand.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => remove(item)}>
                    <MaterialCommunityIcons name="delete-outline" size={22} color={colors.brand.danger} />
                  </TouchableOpacity>
                </View>
              </Card.Content>
            </Card>
          ))}
        </ScrollView>
      )}

      <Portal>
        <Dialog visible={modalVisible} onDismiss={() => setModalVisible(false)}>
          <Dialog.Title>{editing ? t('personal.editIncome') : t('personal.newIncome')}</Dialog.Title>
          <Dialog.Content>
            <TextInput label={t('personal.amount')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" mode="outlined" style={styles.input} />
            <CurrencyPicker value={formCurrency} onChange={setFormCurrency} label={t('market.selectCurrency')} />
            <TextInput label={t('personal.description')} value={description} onChangeText={setDescription} mode="outlined" style={styles.input} />
            <TextInput label={t('personal.date')} value={date} onChangeText={setDate} mode="outlined" style={styles.input} />
            <Text variant="labelMedium" style={styles.chipLabel}>
              {t('personal.incomeSource')}
            </Text>
            <View style={styles.chips}>
              {SOURCE_VALUES.map((opt) => (
                <Chip
                  key={opt}
                  selected={sourceType === opt}
                  onPress={() => setSourceType(opt)}
                  style={styles.chip}
                >
                  {sourceLabel(opt)}
                </Chip>
              ))}
            </View>
            <Chip selected={isRecurring} onPress={() => setIsRecurring(!isRecurring)} icon="repeat">
              {t('personal.recurringIncome')}
            </Chip>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setModalVisible(false)}>{t('common.cancel')}</Button>
            <Button loading={saving} onPress={save}>
              {t('common.save')}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  summaryCard: { borderRadius: radius.lg, backgroundColor: colors.surface },
  summaryTitle: { color: colors.text.muted },
  summaryAmount: { color: colors.brand.secondary, fontWeight: '700' },
  muted: { color: colors.text.muted, marginTop: spacing.xs },
  addBtn: { borderRadius: radius.md },
  itemCard: { marginBottom: spacing.sm, borderRadius: radius.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  amountCol: { alignItems: 'flex-end' },
  incomeAmount: { color: colors.brand.secondary, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  input: { marginBottom: spacing.sm },
  chipLabel: { marginBottom: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  chip: { marginBottom: spacing.xs },
})

import React, { useCallback, useEffect, useState } from 'react'
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { Button, Card, Chip, Dialog, Portal, Text, TextInput } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { personalFinanceApi } from '../../services/api'
import type { IncomePayload } from '../../types/api'
import { unwrapList } from '../../types/api'
import { colors, spacing, radius } from '../../theme'
import { formatCurrency, resolveUserCurrency, type CurrencyCode } from '../../utils/currency'
import { useAppSelector } from '../../hooks/redux'
import { getApiErrorMessage } from '../../types/api'
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

const SOURCE_OPTIONS: { value: IncomePayload['source_type']; label: string }[] = [
  { value: 'salary', label: 'Salário' },
  { value: 'business', label: 'Negócio' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'investment', label: 'Investimento' },
  { value: 'gift', label: 'Presente' },
  { value: 'other', label: 'Outro' },
]

interface Props {
  periodState: PeriodState
  currency?: CurrencyCode
  onRefreshParent?: () => void
}

export default function PersonalIncomeTab({ periodState, currency: currencyProp, onRefreshParent }: Props) {
  const { user } = useAppSelector((state) => state.auth)
  const currency = currencyProp ?? resolveUserCurrency(user?.preferred_currency)
  const [incomes, setIncomes] = useState<IncomeRecord[]>([])
  const [summary, setSummary] = useState<{ total?: string; count?: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [editing, setEditing] = useState<IncomeRecord | null>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
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
    setDate(new Date().toISOString().slice(0, 10))
    setSourceType('salary')
    setIsRecurring(false)
    setModalVisible(true)
  }

  const openEdit = (item: IncomeRecord) => {
    setEditing(item)
    setAmount(String(item.amount))
    setDescription(item.description)
    setDate(item.date)
    setSourceType((item.source_type as IncomePayload['source_type']) || 'salary')
    setIsRecurring(!!item.is_recurring)
    setModalVisible(true)
  }

  const save = async () => {
    const parsed = parseFloat(amount.replace(',', '.'))
    if (!parsed || parsed <= 0 || !description.trim()) {
      Alert.alert('Dados inválidos', 'Indique valor e descrição.')
      return
    }
    setSaving(true)
    try {
      const payload: IncomePayload = {
        amount: parsed.toFixed(2),
        description: description.trim(),
        date,
        source_type: sourceType,
        currency,
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
      Alert.alert('Erro', getApiErrorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  const remove = (item: IncomeRecord) => {
    Alert.alert('Eliminar receita', 'Tem a certeza?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await personalFinanceApi.deleteIncome(item.id)
            await load()
            onRefreshParent?.()
          } catch (error: unknown) {
            Alert.alert('Erro', getApiErrorMessage(error))
          }
        },
      },
    ])
  }

  const sourceLabel = (v: string) => SOURCE_OPTIONS.find((s) => s.value === v)?.label ?? v

  return (
    <View style={styles.wrap}>
      <Card style={styles.summaryCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.summaryTitle}>
            Receitas do período
          </Text>
          <Text variant="headlineMedium" style={styles.summaryAmount}>
            {formatCurrency(summary?.total ?? '0', currency)}
          </Text>
          <Text variant="bodySmall" style={styles.muted}>
            {summary?.count ?? incomes.length} entradas
          </Text>
        </Card.Content>
      </Card>

      <Button mode="contained" icon="plus" onPress={openCreate} style={styles.addBtn}>
        Adicionar receita
      </Button>

      {loading ? (
        <Text style={styles.muted}>A carregar...</Text>
      ) : incomes.length === 0 ? (
        <Text style={styles.muted}>Sem receitas neste período.</Text>
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
                      {item.is_recurring ? ' · Recorrente' : ''}
                    </Text>
                  </View>
                  <Text variant="titleMedium" style={styles.incomeAmount}>
                    +{formatCurrency(item.amount, item.currency || currency)}
                  </Text>
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
          <Dialog.Title>{editing ? 'Editar receita' : 'Nova receita'}</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Valor" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" mode="outlined" style={styles.input} />
            <TextInput label="Descrição" value={description} onChangeText={setDescription} mode="outlined" style={styles.input} />
            <TextInput label="Data (AAAA-MM-DD)" value={date} onChangeText={setDate} mode="outlined" style={styles.input} />
            <Text variant="labelMedium" style={styles.chipLabel}>
              Origem
            </Text>
            <View style={styles.chips}>
              {SOURCE_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  selected={sourceType === opt.value}
                  onPress={() => setSourceType(opt.value)}
                  style={styles.chip}
                >
                  {opt.label}
                </Chip>
              ))}
            </View>
            <Chip selected={isRecurring} onPress={() => setIsRecurring(!isRecurring)} icon="repeat">
              Receita recorrente
            </Chip>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setModalVisible(false)}>Cancelar</Button>
            <Button loading={saving} onPress={save}>
              Guardar
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
  incomeAmount: { color: colors.brand.secondary, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  input: { marginBottom: spacing.sm },
  chipLabel: { marginBottom: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  chip: { marginBottom: spacing.xs },
})

import React, { useCallback, useEffect, useState } from 'react'
import { Alert, ScrollView, StyleSheet, View } from 'react-native'
import { Button, Text, TextInput } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { personalFinanceApi, receiptApi } from '../services/api'
import { useI18n } from '../contexts/I18nContext'
import { useCurrency } from '../contexts/CurrencyContext'
import ZendaLoader from '../components/ui/ZendaLoader'
import ZendaCard from '../components/ui/ZendaCard'
import { colors, spacing, typography } from '../theme'
import { formatCurrency } from '../utils/currency'
import { getApiErrorMessage, unwrapList } from '../types/api'
import type { HomeStackParamList } from '../navigation/types'

type Nav = StackNavigationProp<HomeStackParamList, 'ReviewReceipt'>
type Route = RouteProp<HomeStackParamList, 'ReviewReceipt'>

interface ReceiptDetail {
  id: number
  merchant?: string | null
  amount?: string | number | null
  currency?: string | null
  receipt_date?: string | null
  confidence_score?: string | number | null
  status?: string | null
  suggested_category?: string | null
  category?: number | null
}

interface CategoryOption {
  id: number
  name: string
}

interface BudgetOption {
  id: number
  category_name?: string | null
  amount: string
  currency: string
}

export default function ReviewReceiptScreen() {
  const { t, tw } = useI18n()
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const { receiptId } = route.params
  const { formatDual } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [budgets, setBudgets] = useState<BudgetOption[]>([])
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [budgetId, setBudgetId] = useState<number | null>(null)
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('AOA')
  const [merchant, setMerchant] = useState('')
  const [description, setDescription] = useState('')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [r, cats, buds] = await Promise.all([
        receiptApi.get(receiptId),
        personalFinanceApi.getCategories(true),
        personalFinanceApi.getBudgets(),
      ])
      setReceipt(r)
      setCategories(unwrapList(cats))
      setBudgets(unwrapList(buds))
      setAmount(r.amount != null ? String(r.amount) : '')
      setCurrency(r.currency || 'AOA')
      setMerchant(r.merchant || '')
      setDescription(r.merchant || '')
      if (r.category) setCategoryId(r.category)
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('receipt.uploadFailed')))
      navigation.goBack()
    } finally {
      setLoading(false)
    }
  }, [navigation, receiptId, t])

  useEffect(() => {
    load()
  }, [load])

  const confidence = receipt?.confidence_score != null ? Number(receipt.confidence_score) : 0
  const isLowConfidence = receipt?.status === 'low_confidence' || receipt?.status === 'failed' || confidence < 0.6

  const confirmAndSave = async (confirmedLow = false) => {
    if (!amount || Number(amount) <= 0) {
      Alert.alert(t('common.error'), t('receipt.amountRequired'))
      return
    }
    setSaving(true)
    try {
      const result = await receiptApi.createExpense(receiptId, {
        category_id: categoryId ?? undefined,
        budget_id: budgetId ?? undefined,
        amount,
        currency,
        description: description || merchant,
        confirmed_low_confidence: confirmedLow || isLowConfidence,
      })
      if (result.budget_impact) {
        const b = result.budget_impact
        Alert.alert(
          t('common.success'),
          tw('receipt.savedWithBudget', { remaining: b.remaining, currency: b.currency }),
        )
      } else {
        Alert.alert(t('common.success'), t('receipt.expenseSaved'))
      }
      navigation.navigate('ReceiptScanner')
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('receipt.saveFailed')))
    } finally {
      setSaving(false)
    }
  }

  const onSave = () => {
    if (isLowConfidence) {
      const formatted = formatCurrency(Number(amount), currency)
      Alert.alert(
        t('receipt.confirmAmountTitle'),
        tw('receipt.confirmAmountBody', { amount: formatted }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.confirm'), onPress: () => confirmAndSave(true) },
        ],
      )
      return
    }
    confirmAndSave(false)
  }

  if (loading || !receipt) {
    return <ZendaLoader message={t('receipt.extracting')} />
  }

  const dual = amount ? formatDual(Number(amount), currency) : null
  const formattedTotal = amount ? formatCurrency(Number(amount), currency) : t('receipt.amountMissing')

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{t('receipt.detectedTitle')}</Text>
        {isLowConfidence ? (
          <ZendaCard style={styles.warning}>
            <Text style={styles.warningText}>{t('receipt.lowConfidence')}</Text>
          </ZendaCard>
        ) : null}

        {!editing ? (
          <ZendaCard style={styles.summary}>
            <Text style={styles.summaryLine}>
              {t('receipt.merchant')}: {merchant || t('receipt.unknown')}
            </Text>
            <Text style={styles.summaryLine}>
              {t('receipt.date')}: {receipt.receipt_date || '—'}
            </Text>
            <Text style={styles.summaryLine}>
              {t('receipt.total')}: {formattedTotal}
            </Text>
            <Text style={styles.summaryLine}>
              {t('receipt.currency')}: {currency}
            </Text>
            <Text style={styles.confirmPrompt}>{t('receipt.isCorrect')}</Text>
            <View style={styles.actions}>
              <Button mode="outlined" onPress={() => setEditing(true)} style={styles.actionBtn}>
                {t('common.edit')}
              </Button>
              <Button mode="contained" loading={saving} disabled={saving} onPress={onSave} style={styles.actionBtn}>
                {t('common.confirm')}
              </Button>
            </View>
            <Button
              mode="text"
              onPress={() => navigation.navigate('ScanReceipt')}
              style={styles.scanAgain}
            >
              {t('receipt.scanAgain')}
            </Button>
          </ZendaCard>
        ) : (
          <>
            <TextInput label={t('receipt.merchant')} value={merchant} onChangeText={setMerchant} mode="outlined" style={styles.input} />
            <TextInput label={t('receipt.total')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" mode="outlined" style={styles.input} />
            <TextInput label={t('receipt.currency')} value={currency} onChangeText={setCurrency} autoCapitalize="characters" maxLength={3} mode="outlined" style={styles.input} />
            {dual ? (
              <Text style={styles.dual}>{dual.primary}{dual.secondary ? ` · ${dual.secondary}` : ''}</Text>
            ) : null}
            <TextInput label={t('receipt.description')} value={description} onChangeText={setDescription} mode="outlined" style={styles.input} />

            <Text style={styles.section}>{t('receipt.selectCategory')}</Text>
            <View style={styles.chips}>
              {categories.map((c) => (
                <Button
                  key={c.id}
                  mode={categoryId === c.id ? 'contained' : 'outlined'}
                  onPress={() => setCategoryId(c.id)}
                  style={styles.chip}
                >
                  {c.name}
                </Button>
              ))}
            </View>

            <Text style={styles.section}>{t('receipt.selectBudget')}</Text>
            <View style={styles.chips}>
              {budgets.map((b) => (
                <Button
                  key={b.id}
                  mode={budgetId === b.id ? 'contained' : 'outlined'}
                  onPress={() => setBudgetId(b.id)}
                  style={styles.chip}
                >
                  {b.category_name || t('receipt.budget')} — {b.amount} {b.currency}
                </Button>
              ))}
            </View>

            <Button mode="contained" loading={saving} disabled={saving} onPress={onSave} style={styles.saveBtn}>
              {t('receipt.saveExpense')}
            </Button>
            <Button mode="text" onPress={() => navigation.navigate('ScanReceipt')}>
              {t('receipt.scanAgain')}
            </Button>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.default },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  title: { ...typography.h2, marginBottom: spacing.md },
  warning: { backgroundColor: colors.warning + '22', marginBottom: spacing.md },
  warningText: { color: colors.warning },
  summary: { marginBottom: spacing.md },
  summaryLine: { ...typography.body, marginBottom: spacing.xs },
  confirmPrompt: { ...typography.h3, marginTop: spacing.md, marginBottom: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1 },
  scanAgain: { marginTop: spacing.sm },
  input: { marginBottom: spacing.sm },
  dual: { ...typography.caption, color: colors.text.secondary, marginBottom: spacing.sm },
  section: { ...typography.h3, marginTop: spacing.md, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: { marginBottom: spacing.xs },
  saveBtn: { marginTop: spacing.lg },
})

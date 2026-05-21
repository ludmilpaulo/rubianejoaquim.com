import React, { useCallback, useEffect, useState } from 'react'
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Text, ActivityIndicator } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAppSelector } from '../hooks/redux'
import { personalFinanceApi } from '../services/api'
import { useI18n } from '../contexts/I18nContext'
import ZendaCard from '../components/ui/ZendaCard'
import EmptyState from '../components/ui/EmptyState'
import { colors, radius, spacing, typography } from '../theme'

interface ExchangeRateRow {
  id?: number
  base_currency: string
  target_currency: string
  rate: string | number
  updated_at?: string
}

const QUICK_PAIRS = [
  { from: 'USD', to: 'AOA' },
  { from: 'EUR', to: 'AOA' },
  { from: 'USD', to: 'EUR' },
]

export default function MarketScreen() {
  const { t } = useI18n()
  const { user } = useAppSelector((state) => state.auth)
  const baseCurrency = user?.preferred_currency || 'AOA'

  const [rates, setRates] = useState<ExchangeRateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [amount, setAmount] = useState('100')
  const [fromCur, setFromCur] = useState('USD')
  const [toCur, setToCur] = useState(baseCurrency)
  const [convertResult, setConvertResult] = useState<string | null>(null)
  const [converting, setConverting] = useState(false)

  const loadRates = useCallback(async () => {
    try {
      const data = await personalFinanceApi.getExchangeRates()
      const list = Array.isArray(data) ? data : data.results || []
      setRates(list)
    } catch {
      setRates([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadRates()
  }, [loadRates])

  useEffect(() => {
    setToCur(baseCurrency)
  }, [baseCurrency])

  const onRefresh = () => {
    setRefreshing(true)
    loadRates()
  }

  const handleConvert = async () => {
    const num = parseFloat(amount.replace(',', '.'))
    if (!num || num <= 0) return
    setConverting(true)
    try {
      const res = await personalFinanceApi.convertCurrency(num, fromCur, toCur)
      const converted = res.converted ?? res.amount ?? res.result
      setConvertResult(String(converted))
    } catch {
      setConvertResult(null)
    } finally {
      setConverting(false)
    }
  }

  const usdRates = rates.filter((r) => r.base_currency === 'USD')

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />
        }
      >
        <Text style={styles.title}>{t('market.title')}</Text>
        <Text style={styles.subtitle}>{t('market.subtitle')}</Text>

        <ZendaCard variant="glass">
          <Text style={styles.sectionLabel}>{t('market.convert')}</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder={t('market.amount')}
            placeholderTextColor={colors.text.muted}
          />
          <View style={styles.row}>
            <TouchableOpacity style={styles.currencyBtn} onPress={() => setFromCur(fromCur === 'USD' ? 'EUR' : 'USD')}>
              <Text style={styles.currencyText}>{fromCur}</Text>
              <MaterialCommunityIcons name="swap-vertical" size={18} color={colors.brand.primary} />
            </TouchableOpacity>
            <MaterialCommunityIcons name="arrow-right" size={24} color={colors.text.muted} />
            <TouchableOpacity style={styles.currencyBtn} onPress={() => setToCur(toCur === 'AOA' ? 'EUR' : 'AOA')}>
              <Text style={styles.currencyText}>{toCur}</Text>
              <MaterialCommunityIcons name="swap-vertical" size={18} color={colors.brand.primary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.convertBtn} onPress={handleConvert} disabled={converting}>
            {converting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.convertBtnText}>{t('market.convert')}</Text>
            )}
          </TouchableOpacity>
          {convertResult != null && (
            <Text style={styles.result}>
              {t('market.result')}: {convertResult} {toCur}
            </Text>
          )}
          <View style={styles.quickRow}>
            {QUICK_PAIRS.map((p) => (
              <TouchableOpacity
                key={`${p.from}-${p.to}`}
                style={styles.quickChip}
                onPress={() => {
                  setFromCur(p.from)
                  setToCur(p.to)
                }}
              >
                <Text style={styles.quickChipText}>
                  {p.from}→{p.to}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ZendaCard>

        <Text style={styles.sectionLabel}>{t('market.rates')}</Text>
        {loading ? (
          <ActivityIndicator style={{ marginVertical: spacing.xl }} color={colors.brand.primary} />
        ) : usdRates.length === 0 ? (
          <EmptyState icon="chart-line" title={t('market.empty')} />
        ) : (
          usdRates.map((r) => (
            <ZendaCard key={`${r.base_currency}-${r.target_currency}`} style={styles.rateCard}>
              <View style={styles.rateRow}>
                <Text style={styles.ratePair}>
                  {r.base_currency} / {r.target_currency}
                </Text>
                <Text style={styles.rateValue}>{Number(r.rate).toFixed(4)}</Text>
              </View>
            </ZendaCard>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background.default },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  title: { ...typography.h1, color: colors.text.primary },
  subtitle: { ...typography.body, color: colors.text.secondary, marginBottom: spacing.lg },
  sectionLabel: { ...typography.label, color: colors.text.secondary, marginBottom: spacing.sm, marginTop: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 18,
    color: colors.text.primary,
    marginBottom: spacing.md,
    backgroundColor: colors.background.paper,
  },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, marginBottom: spacing.md },
  currencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#EEF2FF',
  },
  currencyText: { ...typography.h3, color: colors.brand.primary },
  convertBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  convertBtnText: { color: colors.text.inverse, fontWeight: '600' },
  result: { ...typography.h3, color: colors.brand.secondary, marginTop: spacing.md, textAlign: 'center' },
  quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  quickChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.background.default,
  },
  quickChipText: { ...typography.caption, color: colors.brand.primary },
  rateCard: { paddingVertical: spacing.sm },
  rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ratePair: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  rateValue: { ...typography.h3, color: colors.brand.primary },
})

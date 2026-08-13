import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Text } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { personalFinanceApi } from '../services/api'
import { useI18n } from '../contexts/I18nContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { useActionFeedback } from '../hooks/useActionFeedback'
import { formatDate, formatTime, isSameCalendarDay, minutesSince } from '../i18n/format'
import ZendaCard from '../components/ui/ZendaCard'
import EmptyState from '../components/ui/EmptyState'
import { ZendaLoader, ZendaLoading } from '../components/ui/ZendaLoader'
import { colors, radius, spacing, typography } from '../theme'
import type { CurrencyCode } from '../utils/currency'

interface ExchangeRateRow {
  id?: number
  base_currency: string
  target_currency: string
  rate: string | number
  updated_at?: string
  provider_updated_at?: string | null
  source?: string
}

const QUICK_PAIRS: { from: CurrencyCode; to: CurrencyCode }[] = [
  { from: 'USD', to: 'AOA' },
  { from: 'AOA', to: 'USD' },
  { from: 'EUR', to: 'AOA' },
  { from: 'AOA', to: 'EUR' },
  { from: 'USD', to: 'EUR' },
  { from: 'EUR', to: 'USD' },
  { from: 'AOA', to: 'ZAR' },
  { from: 'ZAR', to: 'AOA' },
  { from: 'ZAR', to: 'USD' },
  { from: 'USD', to: 'ZAR' },
  { from: 'GBP', to: 'USD' },
  { from: 'USD', to: 'GBP' },
]

function parseAmount(raw: string): number | null {
  const num = parseFloat(raw.replace(',', '.').trim())
  if (!Number.isFinite(num) || num <= 0) return null
  return num
}

function rateFreshnessLabel(
  iso: string | null,
  locale: Parameters<typeof formatDate>[0],
  stale: boolean,
  t: (key: string) => string,
  tw: (key: string, vars?: Record<string, string | number>) => string,
): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const now = new Date()
  const mins = minutesSince(date, now)
  let relative: string
  if (mins < 2) {
    relative = t('market.updatedJustNow')
  } else if (mins < 60) {
    relative = tw('market.updatedAgoMinutes', { count: mins })
  } else if (mins < 24 * 60) {
    relative = tw('market.updatedAgoHours', { count: Math.floor(mins / 60) })
  } else if (isSameCalendarDay(date, now)) {
    relative = tw('market.updatedTodayAt', {
      time: formatTime(locale, date, { hour: '2-digit', minute: '2-digit' }),
    })
  } else {
    relative = tw('market.updatedAt', {
      date: formatDate(locale, date, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    })
  }
  return stale ? tw('market.cachedUpdated', { relative }) : relative
}

export default function MarketScreen() {
  const { t, tw, locale } = useI18n()
  const { run, isPending } = useActionFeedback()
  const {
    currency,
    currencies,
    currencyLabel,
    format,
    convert,
    refreshRates,
    ratesUpdatedAt,
    ratesStale,
    ratesSource,
    ratesSyncing,
  } = useCurrency()

  const [rates, setRates] = useState<ExchangeRateRow[]>([])
  const [listSource, setListSource] = useState<string | null>(null)
  const [listUpdatedAt, setListUpdatedAt] = useState<string | null>(null)
  const [listStale, setListStale] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [amount, setAmount] = useState('100')
  const [fromCur, setFromCur] = useState<CurrencyCode>('ZAR')
  const [toCur, setToCur] = useState<CurrencyCode>(currency)
  const [convertResult, setConvertResult] = useState<string | null>(null)
  const [unitRate, setUnitRate] = useState<number | null>(null)
  const [convertMeta, setConvertMeta] = useState<{
    source?: string | null
    updatedAt?: string | null
    stale?: boolean
  }>({})

  const loadRates = useCallback(async () => {
    try {
      const data = await personalFinanceApi.getExchangeRates()
      const list = Array.isArray(data) ? data : data.results || []
      setRates(list)
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const meta = data as {
          source?: string
          updated_at?: string
          provider_updated_at?: string
          stale?: boolean
        }
        setListSource(typeof meta.source === 'string' ? meta.source : null)
        setListUpdatedAt(
          typeof meta.provider_updated_at === 'string'
            ? meta.provider_updated_at
            : typeof meta.updated_at === 'string'
              ? meta.updated_at
              : null,
        )
        setListStale(meta.stale === true)
      }
    } catch {
      setRates([])
      setListStale(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadRates()
  }, [loadRates])

  useEffect(() => {
    setToCur(currency)
  }, [currency])

  const onRefresh = async () => {
    setRefreshing(true)
    await run(
      async () => {
        await Promise.all([loadRates(), refreshRates(true)])
      },
      {
        pendingKey: 'refresh',
        pendingMessage: 'feedback.updatingExchangeRates',
        silentSuccess: true,
      },
    )
  }

  const pickCurrency = (current: CurrencyCode, onPick: (code: CurrencyCode) => void) => {
    Alert.alert(
      t('market.selectCurrency'),
      '',
      [
        ...currencies.map((code) => ({
          text: currencyLabel(code),
          onPress: () => onPick(code),
        })),
        { text: t('common.cancel'), style: 'cancel' as const },
      ],
    )
  }

  const swapCurrencies = () => {
    setFromCur(toCur)
    setToCur(fromCur)
    setConvertResult(null)
    setUnitRate(null)
  }

  const handleConvert = () => {
    const num = parseAmount(amount)
    if (num == null || isPending('convert')) return
    run(
      async () => {
        const res = await convert(num, fromCur, toCur)
        if (res) {
          setConvertResult(format(res.amount, toCur))
          setUnitRate(res.rate > 0 ? res.rate : null)
          setConvertMeta({
            source: ratesSource || listSource,
            updatedAt: res.updatedAt || ratesUpdatedAt || listUpdatedAt,
            stale: !res.live || ratesStale || listStale,
          })
        } else {
        const apiRes = await personalFinanceApi.convertCurrency(num, fromCur, toCur)
        const convertedRaw = apiRes.converted ?? apiRes.amount ?? apiRes.result
        const convertedAmount =
          typeof convertedRaw === 'number'
            ? convertedRaw
            : typeof convertedRaw === 'string' && convertedRaw.trim() !== ''
              ? convertedRaw
              : null
        if (convertedAmount == null) {
          setConvertResult(null)
          setUnitRate(null)
          setConvertMeta({ stale: true })
          return
        }
        const rateRaw = apiRes.rate
        const rate = typeof rateRaw === 'string' ? parseFloat(rateRaw) : Number(rateRaw)
        setConvertResult(format(convertedAmount, toCur))
        setUnitRate(Number.isFinite(rate) && rate > 0 ? rate : null)
          setConvertMeta({
            source: typeof apiRes.source === 'string' ? apiRes.source : listSource,
            updatedAt:
              typeof apiRes.provider_updated_at === 'string'
                ? apiRes.provider_updated_at
                : typeof apiRes.updated_at === 'string'
                  ? apiRes.updated_at
                  : listUpdatedAt,
            stale: apiRes.stale === true || listStale,
          })
        }
      },
      {
        pendingKey: 'convert',
        pendingMessage: 'feedback.convertingCurrency',
        silentSuccess: true,
        silentError: true,
        onError: () => {
          setConvertResult(null)
          setUnitRate(null)
          setConvertMeta({ stale: true })
        },
      },
    ).catch(() => {})
  }

  const usdRates = rates.filter((r) => r.base_currency === 'USD')

  const displayUpdatedAt = convertMeta.updatedAt || listUpdatedAt || ratesUpdatedAt
  const displaySource = convertMeta.source || listSource || ratesSource
  const displayStale = convertMeta.stale === true || listStale || ratesStale

  const ratesMeta = rateFreshnessLabel(displayUpdatedAt, locale, displayStale, t, tw)

  const amountNum = useMemo(() => parseAmount(amount), [amount])

  if (loading && rates.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ZendaLoading visible fill message={t('loading.market')} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />
        }
      >
        {(isPending('refresh') || ratesSyncing) && !refreshing ? (
          <ZendaLoader inline message={t('feedback.updatingExchangeRates')} style={styles.syncBanner} />
        ) : null}
        <Text style={styles.title}>{t('market.title')}</Text>
        <Text style={styles.subtitle}>{t('market.subtitle')}</Text>
        {ratesMeta ? <Text style={styles.meta}>{ratesMeta}</Text> : null}
        {displaySource ? (
          <Text style={styles.meta}>{tw('market.source', { source: displaySource })}</Text>
        ) : null}
        {displayStale && !ratesMeta ? <Text style={styles.stale}>{t('market.staleRates')}</Text> : null}
        <Text style={styles.disclaimer}>{t('market.disclaimer')}</Text>

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
            <TouchableOpacity
              style={styles.currencyBtn}
              onPress={() => pickCurrency(fromCur, setFromCur)}
              accessibilityLabel={t('market.from')}
            >
              <Text style={styles.currencyHint}>{t('market.from')}</Text>
              <Text style={styles.currencyText}>{fromCur}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.swapBtn}
              onPress={swapCurrencies}
              accessibilityLabel={t('market.swap')}
            >
              <MaterialCommunityIcons name="swap-horizontal" size={24} color={colors.brand.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.currencyBtn}
              onPress={() => pickCurrency(toCur, setToCur)}
              accessibilityLabel={t('market.to')}
            >
              <Text style={styles.currencyHint}>{t('market.to')}</Text>
              <Text style={styles.currencyText}>{toCur}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.convertBtn, isPending('convert') && styles.convertBtnDisabled]}
            onPress={handleConvert}
            disabled={isPending('convert')}
          >
            {isPending('convert') ? (
              <ZendaLoader inline message={t('feedback.convertingCurrency')} inverse />
            ) : (
              <Text style={styles.convertBtnText}>{t('market.convert')}</Text>
            )}
          </TouchableOpacity>
          {convertResult != null && amountNum != null && (
            <View style={styles.resultBlock}>
              <Text style={styles.result}>
                {format(amountNum, fromCur)} {t('market.approx')} {convertResult}
              </Text>
              {unitRate != null ? (
                <Text style={styles.rateLine}>
                  {tw('market.rateLine', {
                    from: fromCur,
                    rate: unitRate.toFixed(6),
                    to: toCur,
                  })}
                </Text>
              ) : null}
              {ratesMeta ? (
                <Text style={styles.metaSmall}>{ratesMeta}</Text>
              ) : null}
              {displaySource ? (
                <Text style={styles.metaSmall}>{tw('market.source', { source: displaySource })}</Text>
              ) : null}
              {displayStale && !ratesMeta ? <Text style={styles.stale}>{t('market.staleRates')}</Text> : null}
            </View>
          )}
          <View style={styles.quickRow}>
            {QUICK_PAIRS.map((p) => (
              <TouchableOpacity
                key={`${p.from}-${p.to}`}
                style={styles.quickChip}
                onPress={() => {
                  setFromCur(p.from)
                  setToCur(p.to)
                  setConvertResult(null)
                  setUnitRate(null)
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
          <ZendaLoader message={t('loading.market')} style={{ marginVertical: spacing.xl }} />
        ) : usdRates.length === 0 ? (
          <EmptyState icon="chart-line" title={t('market.empty')} />
        ) : (
          usdRates.map((r) => (
            <ZendaCard key={`${r.base_currency}-${r.target_currency}`} style={styles.rateCard}>
              <View style={styles.rateRow}>
                <View style={styles.rateLeft}>
                  <Text style={styles.ratePair}>
                    {r.base_currency} / {r.target_currency}
                  </Text>
                  {r.source ? (
                    <Text style={styles.rateSource}>{r.source}</Text>
                  ) : null}
                </View>
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
  subtitle: { ...typography.body, color: colors.text.secondary, marginBottom: spacing.sm },
  meta: { ...typography.caption, color: colors.text.muted, marginBottom: spacing.xs },
  metaSmall: { ...typography.caption, color: colors.text.muted, marginTop: spacing.xs, textAlign: 'center' },
  stale: { ...typography.caption, color: '#f59e0b', marginBottom: spacing.sm, textAlign: 'center' },
  disclaimer: { ...typography.caption, color: colors.text.muted, marginBottom: spacing.md },
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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.md },
  currencyBtn: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#E8E8FA',
  },
  currencyHint: { ...typography.caption, color: colors.text.muted },
  currencyText: { ...typography.h3, color: colors.brand.primary },
  swapBtn: {
    padding: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.background.paper,
  },
  convertBtn: {
    backgroundColor: colors.brand.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  convertBtnDisabled: {
    opacity: 0.85,
  },
  syncBanner: {
    marginBottom: spacing.sm,
  },
  convertBtnText: { color: colors.text.inverse, fontWeight: '600' },
  resultBlock: { marginTop: spacing.md },
  result: { ...typography.h3, color: colors.brand.secondary, textAlign: 'center' },
  rateLine: { ...typography.body, color: colors.text.primary, marginTop: spacing.sm, textAlign: 'center' },
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
  rateLeft: { flex: 1, paddingRight: spacing.sm },
  ratePair: { ...typography.body, color: colors.text.primary, fontWeight: '600' },
  rateSource: { ...typography.caption, color: colors.text.muted, marginTop: 2 },
  rateValue: { ...typography.h3, color: colors.brand.primary },
})

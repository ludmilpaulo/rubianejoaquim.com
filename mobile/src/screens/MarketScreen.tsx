import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
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
import { useFocusEffect } from '@react-navigation/native'
import { personalFinanceApi } from '../services/api'
import { useI18n } from '../contexts/I18nContext'
import { useCurrency } from '../contexts/CurrencyContext'
import { useActionFeedback } from '../hooks/useActionFeedback'
import { formatDate, formatTime, isSameCalendarDay, minutesSince } from '../i18n/format'
import ZendaCard from '../components/ui/ZendaCard'
import EmptyState from '../components/ui/EmptyState'
import { ZendaLoader, ZendaLoading } from '../components/ui/ZendaLoader'
import CurrencyPicker from '../components/CurrencyPicker'
import { colors, radius, spacing, typography } from '../theme'
import type { FxFreshness } from '../services/exchangeRates'
import { parseFxAmount } from '../services/exchangeRates'
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
  { from: 'EUR', to: 'ZAR' },
  { from: 'ZAR', to: 'EUR' },
]

function parseAmount(raw: string): number | null {
  return parseFxAmount(raw)
}

function relativeUpdated(
  iso: string | null,
  locale: Parameters<typeof formatDate>[0],
  t: (key: string) => string,
  tw: (key: string, vars?: Record<string, string | number>) => string,
): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  const now = new Date()
  const mins = minutesSince(date, now)
  if (mins < 2) return t('market.updatedJustNow')
  if (mins < 60) return tw('market.updatedAgoMinutes', { count: mins })
  if (mins < 24 * 60) return tw('market.updatedAgoHours', { count: Math.floor(mins / 60) })
  if (isSameCalendarDay(date, now)) {
    return tw('market.updatedTodayAt', {
      time: formatTime(locale, date, { hour: '2-digit', minute: '2-digit' }),
    })
  }
  return tw('market.updatedAt', {
    date: formatDate(locale, date, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  })
}

function freshnessCopy(opts: {
  freshness: FxFreshness
  offline: boolean
  marketClosed: boolean
  relative: string | null
  t: (key: string) => string
  tw: (key: string, vars?: Record<string, string | number>) => string
}): { text: string; tone: 'ok' | 'warn' | 'error' } {
  const { freshness, offline, marketClosed, relative, t, tw } = opts
  const rel = relative || t('market.lastUpdatedUnknown')
  if (offline) return { text: tw('market.offlineCached', { relative: rel }), tone: 'warn' }
  if (freshness === 'unavailable') return { text: t('market.ratesUnavailable'), tone: 'error' }
  if (freshness === 'stale') return { text: tw('market.freshnessStale', { relative: rel }), tone: 'warn' }
  if (marketClosed) return { text: tw('market.marketClosed', { relative: rel }), tone: 'warn' }
  if (freshness === 'cached') return { text: tw('market.freshnessCached', { relative: rel }), tone: 'ok' }
  return { text: tw('market.freshnessLive', { relative: rel }), tone: 'ok' }
}

export default function MarketScreen() {
  const { t, tw, locale } = useI18n()
  const { run, isPending } = useActionFeedback()
  const {
    currency,
    format,
    convert,
    refreshRates,
    ratesUpdatedAt,
    ratesSource,
    ratesFreshness,
    ratesMarketClosed,
    ratesOffline,
    ratesSyncing,
  } = useCurrency()

  const [rates, setRates] = useState<ExchangeRateRow[]>([])
  const [listSource, setListSource] = useState<string | null>(null)
  const [listUpdatedAt, setListUpdatedAt] = useState<string | null>(null)
  const [listFreshness, setListFreshness] = useState<FxFreshness>('unavailable')
  const [listMarketClosed, setListMarketClosed] = useState(false)
  const [listOffline, setListOffline] = useState(false)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [amount, setAmount] = useState('100')
  const [fromCur, setFromCur] = useState<CurrencyCode>('AOA')
  const [toCur, setToCur] = useState<CurrencyCode>(currency === 'AOA' ? 'USD' : currency)
  const [convertResult, setConvertResult] = useState<string | null>(null)
  const [unitRate, setUnitRate] = useState<number | null>(null)
  const [convertMeta, setConvertMeta] = useState<{
    source?: string | null
    updatedAt?: string | null
    fetchedAt?: string | null
    freshness?: FxFreshness
    marketClosed?: boolean
    offline?: boolean
  }>({})
  const convertSeq = useRef(0)

  const loadRates = useCallback(async (force = false) => {
    try {
      const data = await personalFinanceApi.getExchangeRates(force ? { refresh: true } : undefined)
      const list = Array.isArray(data) ? data : data.results || []
      setRates(list)
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const meta = data as {
          source?: string
          updated_at?: string
          provider_updated_at?: string
          fetched_at?: string
          last_successful_update?: string
          stale?: boolean
          freshness?: FxFreshness
          market_closed?: boolean
          refresh_error?: string
        }
        setListSource(typeof meta.source === 'string' ? meta.source : null)
        setListUpdatedAt(
          typeof meta.fetched_at === 'string'
            ? meta.fetched_at
            : typeof meta.last_successful_update === 'string'
              ? meta.last_successful_update
              : typeof meta.provider_updated_at === 'string'
                ? meta.provider_updated_at
                : typeof meta.updated_at === 'string'
                  ? meta.updated_at
                  : null,
        )
        setListFreshness(
          meta.freshness === 'live' ||
            meta.freshness === 'cached' ||
            meta.freshness === 'stale' ||
            meta.freshness === 'unavailable'
            ? meta.freshness
            : list.length === 0
              ? 'unavailable'
              : meta.stale
                ? 'stale'
                : 'cached',
        )
        setListMarketClosed(meta.market_closed === true)
        setListOffline(false)
        setRefreshError(typeof meta.refresh_error === 'string' ? meta.refresh_error : null)
      }
    } catch {
      setListOffline(true)
      setListFreshness('stale')
      setRefreshError('network')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadRates(false).catch(() => {})
    }, [loadRates]),
  )

  const onRefresh = async () => {
    setRefreshing(true)
    await run(
      async () => {
        await Promise.all([loadRates(true), refreshRates(true)])
      },
      {
        pendingKey: 'refresh',
        pendingMessage: 'market.refreshing',
        successMessage: 'market.refreshSuccess',
      },
    )
  }

  const swapCurrencies = () => {
    setFromCur(toCur)
    setToCur(fromCur)
  }

  const performConvert = useCallback(
    async (num: number, from: CurrencyCode, to: CurrencyCode) => {
      const seq = ++convertSeq.current
      try {
        const res = await convert(num, from, to)
        if (seq !== convertSeq.current) return
        if (res) {
          setConvertResult(format(res.amount, to))
          setUnitRate(res.rate > 0 ? res.rate : null)
          setConvertMeta({
            source: res.source || ratesSource || listSource,
            updatedAt: res.updatedAt || ratesUpdatedAt || listUpdatedAt,
            fetchedAt: res.fetchedAt || ratesUpdatedAt || listUpdatedAt,
            freshness: res.freshness,
            marketClosed: res.marketClosed,
            offline: res.offline,
          })
          return
        }
        setConvertResult(null)
        setUnitRate(null)
        setConvertMeta({ freshness: 'unavailable' })
        setRefreshError('Rate not found')
      } catch (err) {
        if (seq !== convertSeq.current) return
        setConvertResult(null)
        setUnitRate(null)
        setConvertMeta({ freshness: 'unavailable', offline: true })
        setRefreshError(err instanceof Error ? err.message : 'Rate not found')
      }
    },
    [convert, format, listSource, listUpdatedAt, ratesSource, ratesUpdatedAt],
  )

  useEffect(() => {
    const num = parseAmount(amount)
    if (num == null || num === 0) {
      setConvertResult(null)
      setUnitRate(null)
      return
    }
    const handle = setTimeout(() => {
      performConvert(num, fromCur, toCur).catch(() => {})
    }, 280)
    return () => clearTimeout(handle)
  }, [amount, fromCur, toCur, performConvert])

  const handleConvert = () => {
    const num = parseAmount(amount)
    if (num == null || isPending('convert')) return
    run(
      async () => {
        await performConvert(num, fromCur, toCur)
      },
      {
        pendingKey: 'convert',
        pendingMessage: 'feedback.convertingCurrency',
        silentSuccess: true,
        silentError: true,
      },
    ).catch(() => {})
  }

  const usdRates = rates.filter((r) => r.base_currency === 'USD')

  const displayUpdatedAt = convertMeta.fetchedAt || convertMeta.updatedAt || listUpdatedAt || ratesUpdatedAt
  const displaySource = convertMeta.source || listSource || ratesSource
  const displayFreshness: FxFreshness =
    convertMeta.freshness || listFreshness || ratesFreshness || 'unavailable'
  const displayOffline = convertMeta.offline === true || listOffline || ratesOffline
  const displayMarketClosed = convertMeta.marketClosed === true || listMarketClosed || ratesMarketClosed
  const relative = relativeUpdated(displayUpdatedAt, locale, t, tw)
  const banner = freshnessCopy({
    freshness: displayFreshness,
    offline: displayOffline,
    marketClosed: displayMarketClosed,
    relative,
    t,
    tw,
  })

  const amountNum = useMemo(() => parseAmount(amount), [amount])

  if (loading && rates.length === 0 && !listOffline) {
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
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand.primary} />
        }
      >
        {(isPending('refresh') || ratesSyncing) && !refreshing ? (
          <ZendaLoader inline message={t('market.refreshing')} style={styles.syncBanner} />
        ) : null}
        <Text style={styles.title}>{t('market.title')}</Text>
        <Text style={styles.subtitle}>{t('market.poweredBy')}</Text>
        <Text style={[styles.meta, banner.tone === 'warn' && styles.warn, banner.tone === 'error' && styles.stale]}>
          {banner.text}
        </Text>
        {displaySource ? (
          <Text style={styles.meta}>{tw('market.source', { source: displaySource })}</Text>
        ) : null}
        {refreshError && displayFreshness !== 'live' ? (
          <Text style={styles.warn}>
            {refreshError === 'network'
              ? tw('market.refreshFailed', { relative: relative || t('market.lastUpdatedUnknown') })
              : refreshError}
          </Text>
        ) : null}
        <Text style={styles.disclaimer}>{t('market.disclaimer')}</Text>

        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={onRefresh}
          disabled={isPending('refresh') || ratesSyncing}
          accessibilityLabel={t('market.refreshRates')}
        >
          <MaterialCommunityIcons name="refresh" size={18} color={colors.brand.primary} />
          <Text style={styles.refreshBtnText}>{t('market.refreshRates')}</Text>
        </TouchableOpacity>

        <ZendaCard variant="glass">
          <Text style={styles.sectionLabel}>{t('market.convert')}</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder={t('market.amount')}
            placeholderTextColor={colors.text.muted}
            accessibilityLabel={t('market.amount')}
          />
          <View style={styles.row}>
            <CurrencyPicker
              value={fromCur}
              onChange={setFromCur}
              label={t('market.from')}
              showName
              searchable
            />
            <TouchableOpacity
              style={styles.swapBtn}
              onPress={swapCurrencies}
              accessibilityLabel={t('market.swap')}
            >
              <MaterialCommunityIcons name="swap-horizontal" size={24} color={colors.brand.primary} />
            </TouchableOpacity>
            <CurrencyPicker
              value={toCur}
              onChange={setToCur}
              label={t('market.to')}
              showName
              searchable
            />
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
              <Text style={styles.metaSmall}>{banner.text}</Text>
              {displaySource ? (
                <Text style={styles.metaSmall}>{tw('market.source', { source: displaySource })}</Text>
              ) : null}
            </View>
          )}
          {amountNum != null && convertResult == null && displayFreshness === 'unavailable' ? (
            <Text style={styles.stale}>{t('market.convertFailed')}</Text>
          ) : null}
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
                  {r.source ? <Text style={styles.rateSource}>{r.source}</Text> : null}
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
  stale: { ...typography.caption, color: colors.status.error, marginBottom: spacing.sm, textAlign: 'center' },
  warn: { ...typography.caption, color: colors.status.warning, marginBottom: spacing.sm, textAlign: 'center' },
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
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.md },
  swapBtn: {
    padding: spacing.sm,
    marginBottom: 6,
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
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.brand.primaryContainer,
  },
  refreshBtnText: { ...typography.label, color: colors.brand.primary },
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

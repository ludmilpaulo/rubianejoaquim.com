'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { AppState } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAppDispatch, useAppSelector } from '../hooks/redux'
import { setUser } from '../store/authSlice'
import { authApi } from '../services/api'
import {
  convertAmount,
  getLatestUpdatedAt,
  loadExchangeRates,
  type ConvertResult,
  type FxCachePayload,
  type FxFreshness,
} from '../services/exchangeRates'
import {
  CURRENCY_META,
  formatAmountWithConversion,
  formatCurrency,
  resolveUserCurrency,
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
} from '../utils/currency'
import { useI18n } from './I18nContext'

const LOCAL_CURRENCY_KEY = 'ZENDA_PREFERRED_CURRENCY'

interface CurrencyContextValue {
  currency: CurrencyCode
  currencies: readonly CurrencyCode[]
  setCurrency: (code: CurrencyCode) => Promise<void>
  format: (amount: number | string, code?: string) => string
  formatOriginal: (amount: number | string, originalCurrency: string) => string
  formatDual: (
    amount: number | string,
    originalCurrency: string,
    convertedAmount?: number | string | null,
  ) => { primary: string; secondary: string | null }
  convert: (amount: number, from: string, to?: string) => Promise<ConvertResult | null>
  rates: FxCachePayload
  refreshRates: (force?: boolean) => Promise<void>
  ratesUpdatedAt: string | null
  ratesStale: boolean
  ratesSource: string | null
  ratesFreshness: FxFreshness
  ratesMarketClosed: boolean
  ratesOffline: boolean
  /** True while exchange rates are being fetched or refreshed. */
  ratesSyncing: boolean
  currencyLabel: (code: CurrencyCode) => string
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user } = useAppSelector((state) => state.auth)
  const dispatch = useAppDispatch()
  const { t } = useI18n()
  const [localOverride, setLocalOverride] = useState<CurrencyCode | null>(null)
  const [rates, setRates] = useState<FxCachePayload>({
    rates: [],
    fetchedAt: 0,
    stale: true,
    source: null,
    updatedAt: null,
    fetchedAtIso: null,
    freshness: 'unavailable',
    marketClosed: false,
    offline: false,
  })
  const [ratesSyncing, setRatesSyncing] = useState(false)

  const currency = useMemo(() => {
    if (localOverride) return localOverride
    return resolveUserCurrency(user?.preferred_currency)
  }, [localOverride, user?.preferred_currency])

  useEffect(() => {
    AsyncStorage.getItem(LOCAL_CURRENCY_KEY).then((stored) => {
      if (stored && SUPPORTED_CURRENCIES.includes(stored as CurrencyCode)) {
        setLocalOverride(stored as CurrencyCode)
      }
    })
  }, [])

  useEffect(() => {
    if (user?.preferred_currency && SUPPORTED_CURRENCIES.includes(user.preferred_currency as CurrencyCode)) {
      setLocalOverride(user.preferred_currency as CurrencyCode)
      AsyncStorage.setItem(LOCAL_CURRENCY_KEY, user.preferred_currency).catch(() => {})
    }
  }, [user?.preferred_currency])

  const refreshRates = useCallback(async (force = false) => {
    setRatesSyncing(true)
    try {
      const payload = await loadExchangeRates({ forceRefresh: force })
      setRates(payload)
    } finally {
      setRatesSyncing(false)
    }
  }, [])

  useEffect(() => {
    refreshRates(false).catch(() => {})
  }, [refreshRates])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshRates(false).catch(() => {})
      }
    })
    return () => sub.remove()
  }, [refreshRates])

  const setCurrency = useCallback(
    async (code: CurrencyCode) => {
      setLocalOverride(code)
      await AsyncStorage.setItem(LOCAL_CURRENCY_KEY, code)
      if (user) {
        const nextUser = { ...user, preferred_currency: code }
        dispatch(setUser(nextUser))
        await AsyncStorage.setItem('user', JSON.stringify(nextUser))
        try {
          await authApi.updateProfile({ preferred_currency: code })
        } catch {
          // keep local preference
        }
      }
    },
    [dispatch, user],
  )

  const format = useCallback(
    (amount: number | string, code?: string) => formatCurrency(amount, code || currency),
    [currency],
  )

  const formatOriginal = useCallback(
    (amount: number | string, originalCurrency: string) => formatCurrency(amount, originalCurrency),
    [],
  )

  const formatDual = useCallback(
    (
      amount: number | string,
      originalCurrency: string,
      convertedAmount?: number | string | null,
    ) =>
      formatAmountWithConversion({
        amount,
        currency: originalCurrency,
        convertedAmount,
        displayCurrency: currency,
        approxLabel: t('market.approx'),
      }),
    [currency, t],
  )

  const convert = useCallback(
    async (amount: number, from: string, to?: string) => convertAmount(amount, from, to || currency),
    [currency],
  )

  const currencyLabelFn = useCallback(
    (code: CurrencyCode) => {
      const meta = CURRENCY_META[code]
      const name = t(meta.nameKey)
      return `${meta.flag} ${code} — ${name}`
    },
    [t],
  )

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      currencies: SUPPORTED_CURRENCIES,
      setCurrency,
      format,
      formatOriginal,
      formatDual,
      convert,
      rates,
      refreshRates,
      ratesUpdatedAt: rates.fetchedAtIso || rates.updatedAt || getLatestUpdatedAt(rates.rates),
      ratesStale: rates.stale || rates.freshness === 'stale' || rates.freshness === 'unavailable',
      ratesSource: rates.source ?? null,
      ratesFreshness: rates.freshness,
      ratesMarketClosed: rates.marketClosed,
      ratesOffline: rates.offline,
      ratesSyncing,
      currencyLabel: currencyLabelFn,
    }),
    [
      currency,
      setCurrency,
      format,
      formatOriginal,
      formatDual,
      convert,
      rates,
      refreshRates,
      ratesSyncing,
      currencyLabelFn,
    ],
  )

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider')
  return ctx
}

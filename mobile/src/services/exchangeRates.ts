/**
 * Client-side FX helpers: fetch rates from the Zenda backend, cache briefly, convert safely.
 * Never invent rates — if the API fails, callers must show stale/unavailable/offline UI.
 * Provider credentials stay on the Django backend; this module never talks to FX vendors.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { personalFinanceApi } from './api'
import type { CurrencyCode } from '../utils/currency'
import { SUPPORTED_CURRENCIES } from '../utils/currency'
import { logger } from '../utils/logger'

const CACHE_KEY = 'ZENDA_FX_CACHE_V1'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes — backend is the source of truth

export type FxFreshness = 'live' | 'cached' | 'stale' | 'unavailable'

export interface FxRateRow {
  base_currency: string
  target_currency: string
  rate: string | number
  updated_at?: string
  provider_updated_at?: string | null
  source?: string
}

export interface FxCachePayload {
  rates: FxRateRow[]
  fetchedAt: number
  stale: boolean
  source?: string | null
  updatedAt?: string | null
  fetchedAtIso?: string | null
  freshness: FxFreshness
  marketClosed: boolean
  offline: boolean
  refreshError?: string | null
}

export interface ConvertResult {
  amount: number
  from: string
  to: string
  rate: number
  originalAmount?: number
  originalCurrency?: string
  convertedCurrency?: string
  updatedAt?: string | null
  fetchedAt?: string | null
  source?: string | null
  live: boolean
  freshness: FxFreshness
  marketClosed: boolean
  offline: boolean
}

let memoryCache: FxCachePayload | null = null

function emptyPayload(now = Date.now()): FxCachePayload {
  return {
    rates: [],
    fetchedAt: now,
    stale: true,
    source: null,
    updatedAt: null,
    fetchedAtIso: null,
    freshness: 'unavailable',
    marketClosed: false,
    offline: false,
    refreshError: null,
  }
}

async function readDiskCache(): Promise<FxCachePayload | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<FxCachePayload>
    if (!parsed?.rates || !Array.isArray(parsed.rates)) return null
    return {
      ...emptyPayload(parsed.fetchedAt || 0),
      ...parsed,
      rates: parsed.rates,
      freshness: parsed.freshness || (parsed.stale ? 'stale' : 'cached'),
      marketClosed: parsed.marketClosed === true,
      offline: parsed.offline === true,
    }
  } catch {
    return null
  }
}

async function writeDiskCache(payload: FxCachePayload): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload))
  } catch {
    // ignore
  }
}

function normalizeList(data: unknown): FxRateRow[] {
  if (Array.isArray(data)) return data as FxRateRow[]
  if (data && typeof data === 'object' && 'results' in data) {
    const results = (data as { results: unknown }).results
    if (Array.isArray(results)) return results as FxRateRow[]
  }
  return []
}

function parseFreshness(raw: unknown, stale: boolean, empty: boolean): FxFreshness {
  if (raw === 'live' || raw === 'cached' || raw === 'stale' || raw === 'unavailable') return raw
  if (empty) return 'unavailable'
  return stale ? 'stale' : 'cached'
}

function parseMeta(data: unknown, rates: FxRateRow[]): Pick<
  FxCachePayload,
  'source' | 'updatedAt' | 'fetchedAtIso' | 'stale' | 'freshness' | 'marketClosed' | 'refreshError'
> {
  let source: string | null = null
  let updatedAt: string | null = getLatestUpdatedAt(rates)
  let fetchedAtIso: string | null = null
  let stale = rates.length === 0
  let freshness: FxFreshness = rates.length === 0 ? 'unavailable' : 'cached'
  let marketClosed = false
  let refreshError: string | null = null
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const meta = data as {
      source?: string
      stale?: boolean
      updated_at?: string
      provider_updated_at?: string
      fetched_at?: string
      last_successful_update?: string
      freshness?: string
      market_closed?: boolean
      refresh_error?: string
    }
    if (typeof meta.source === 'string') source = meta.source
    if (typeof meta.fetched_at === 'string') fetchedAtIso = meta.fetched_at
    else if (typeof meta.last_successful_update === 'string') fetchedAtIso = meta.last_successful_update
    if (typeof meta.provider_updated_at === 'string') updatedAt = meta.provider_updated_at
    else if (typeof meta.updated_at === 'string') updatedAt = meta.updated_at
    if (meta.stale === true) stale = true
    if ((source || '').toLowerCase() === 'seed') stale = true
    freshness = parseFreshness(meta.freshness, stale, rates.length === 0)
    if (meta.market_closed === true) marketClosed = true
    if (typeof meta.refresh_error === 'string') refreshError = meta.refresh_error
  }
  return { source, updatedAt, fetchedAtIso, stale, freshness, marketClosed, refreshError }
}

export async function loadExchangeRates(options?: {
  forceRefresh?: boolean
}): Promise<FxCachePayload> {
  const force = options?.forceRefresh === true
  const now = Date.now()

  if (!force && memoryCache && now - memoryCache.fetchedAt < CACHE_TTL_MS && !memoryCache.stale && !memoryCache.offline) {
    return memoryCache
  }

  if (!force) {
    const disk = memoryCache || (await readDiskCache())
    if (disk && now - disk.fetchedAt < CACHE_TTL_MS && !disk.stale && !disk.offline && disk.rates.length > 0) {
      memoryCache = disk
      return disk
    }
  }

  try {
    const data = await personalFinanceApi.getExchangeRates(force ? { refresh: true } : undefined)
    const rates = normalizeList(data)
    const meta = parseMeta(data, rates)
    if (rates.length === 0) {
      const previous = memoryCache || (await readDiskCache())
      if (previous && previous.rates.length > 0) {
        const kept: FxCachePayload = {
          ...previous,
          stale: true,
          freshness: 'stale',
          offline: false,
          refreshError: meta.refreshError || 'empty_rates',
        }
        memoryCache = kept
        return kept
      }
    }
    const payload: FxCachePayload = {
      rates,
      fetchedAt: now,
      stale: meta.stale || rates.length === 0,
      source: meta.source,
      updatedAt: meta.updatedAt,
      fetchedAtIso: meta.fetchedAtIso,
      freshness: meta.freshness,
      marketClosed: meta.marketClosed,
      offline: false,
      refreshError: meta.refreshError,
    }
    memoryCache = payload
    if (rates.length > 0) await writeDiskCache(payload)
    return payload
  } catch (err) {
    logger.warn('exchangeRates: fetch failed, using cache if any', err)
    const disk = memoryCache || (await readDiskCache())
    if (disk && disk.rates.length > 0) {
      const stale: FxCachePayload = {
        ...disk,
        stale: true,
        freshness: 'stale',
        offline: true,
      }
      memoryCache = stale
      return stale
    }
    const empty = { ...emptyPayload(now), offline: true }
    memoryCache = empty
    return empty
  }
}

/** Build USD→X map from cached rows (supports inverse if needed). */
export function buildUsdRateMap(rates: FxRateRow[]): Record<string, number> {
  const map: Record<string, number> = { USD: 1 }
  for (const row of rates) {
    const base = row.base_currency?.toUpperCase()
    const target = row.target_currency?.toUpperCase()
    const rate = typeof row.rate === 'string' ? parseFloat(row.rate) : Number(row.rate)
    if (!base || !target || !rate || Number.isNaN(rate) || rate <= 0) continue
    if (base === 'USD') map[target] = rate
    else if (target === 'USD') map[base] = 1 / rate
  }
  return map
}

export function getLatestUpdatedAt(rates: FxRateRow[]): string | null {
  let latest: string | null = null
  for (const row of rates) {
    const stamp = row.provider_updated_at || row.updated_at
    if (!stamp) continue
    if (!latest || stamp > latest) latest = stamp
  }
  return latest
}

/**
 * Local conversion using USD pivot when both sides are in the map.
 * Returns null if rates are missing — callers must not invent a number.
 */
export function convertLocally(
  amount: number,
  from: string,
  to: string,
  rates: FxRateRow[],
): ConvertResult | null {
  const fromCur = from.toUpperCase()
  const toCur = to.toUpperCase()
  if (fromCur === toCur) {
    return {
      amount,
      from: fromCur,
      to: toCur,
      rate: 1,
      originalAmount: amount,
      originalCurrency: fromCur,
      convertedCurrency: toCur,
      updatedAt: getLatestUpdatedAt(rates),
      live: false,
      freshness: rates.length > 0 ? 'cached' : 'unavailable',
      marketClosed: false,
      offline: false,
    }
  }
  const map = buildUsdRateMap(rates)
  const fromRate = map[fromCur]
  const toRate = map[toCur]
  if (!fromRate || !toRate) return null
  const usd = amount / fromRate
  const converted = usd * toRate
  const rate = toRate / fromRate
  return {
    amount: Math.round(converted * 100) / 100,
    from: fromCur,
    to: toCur,
    rate,
    originalAmount: amount,
    originalCurrency: fromCur,
    convertedCurrency: toCur,
    updatedAt: getLatestUpdatedAt(rates),
    live: false,
    freshness: 'cached',
    marketClosed: false,
    offline: false,
  }
}

export async function convertAmount(
  amount: number,
  from: string,
  to: string,
): Promise<ConvertResult | null> {
  const fromCur = from.toUpperCase()
  const toCur = to.toUpperCase()
  if (fromCur === toCur) {
    return {
      amount,
      from: fromCur,
      to: toCur,
      rate: 1,
      originalAmount: amount,
      originalCurrency: fromCur,
      convertedCurrency: toCur,
      live: true,
      freshness: 'live',
      marketClosed: false,
      offline: false,
    }
  }

  try {
    const res = await personalFinanceApi.convertCurrency(amount, fromCur, toCur)
    const convertedRaw = res.converted_amount ?? res.converted ?? res.amount ?? res.result
    const converted = typeof convertedRaw === 'string' ? parseFloat(convertedRaw) : Number(convertedRaw)
    const rateRaw = res.exchange_rate ?? res.rate
    const rate = typeof rateRaw === 'string' ? parseFloat(rateRaw) : Number(rateRaw)
    if (Number.isNaN(converted)) return null
    const freshness = parseFreshness(res.freshness, res.stale === true, false)
    return {
      amount: converted,
      from: fromCur,
      to: toCur,
      rate: Number.isNaN(rate) ? 0 : rate,
      originalAmount:
        typeof res.original_amount === 'string' ? parseFloat(res.original_amount) : amount,
      originalCurrency: typeof res.original_currency === 'string' ? res.original_currency : fromCur,
      convertedCurrency: typeof res.converted_currency === 'string' ? res.converted_currency : toCur,
      updatedAt:
        typeof res.rate_timestamp === 'string'
          ? res.rate_timestamp
          : typeof res.provider_updated_at === 'string'
            ? res.provider_updated_at
            : typeof res.updated_at === 'string'
              ? res.updated_at
              : null,
      fetchedAt: typeof res.fetched_at === 'string' ? res.fetched_at : null,
      source: typeof res.source === 'string' ? res.source : null,
      live: freshness === 'live',
      freshness,
      marketClosed: res.market_closed === true,
      offline: false,
    }
  } catch (err) {
    logger.warn('convertAmount: API failed, trying local cache', err)
    const cache = await loadExchangeRates()
    const local = convertLocally(amount, fromCur, toCur, cache.rates)
    if (!local) throw err
    return {
      ...local,
      source: cache.source ?? null,
      fetchedAt: cache.fetchedAtIso ?? null,
      live: false,
      freshness: cache.offline ? 'stale' : cache.freshness,
      marketClosed: cache.marketClosed,
      offline: cache.offline,
    }
  }
}

export function isSupportedCurrency(code: string): code is CurrencyCode {
  return SUPPORTED_CURRENCIES.includes(code as CurrencyCode)
}

/**
 * Parse user-entered amounts (1,000 / 1.000 / 1,250.75 / 1.250,75 / 0.50).
 */
export function parseFxAmount(raw: string): number | null {
  const text = raw.trim().replace(/\s/g, '')
  if (!text) return null
  const lastComma = text.lastIndexOf(',')
  const lastDot = text.lastIndexOf('.')
  let normalized = text
  if (lastComma >= 0 && lastDot >= 0) {
    normalized =
      lastComma > lastDot ? text.replace(/\./g, '').replace(',', '.') : text.replace(/,/g, '')
  } else if (lastComma >= 0) {
    const frac = text.slice(lastComma + 1)
    normalized = frac.length <= 2 ? text.replace(',', '.') : text.replace(/,/g, '')
  } else if (lastDot >= 0) {
    const frac = text.slice(lastDot + 1)
    if (frac.length === 3 && /^\d+$/.test(frac) && text.split('.').length <= 3) {
      normalized = text.replace(/\./g, '')
    }
  }
  const num = Number(normalized)
  if (!Number.isFinite(num) || num < 0) return null
  return num
}

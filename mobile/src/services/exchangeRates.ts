/**
 * Client-side FX helpers: fetch rates from API, cache briefly, convert safely.
 * Never invent rates — if the API fails, callers must show stale/unavailable UI.
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import { personalFinanceApi } from './api'
import type { CurrencyCode } from '../utils/currency'
import { SUPPORTED_CURRENCIES } from '../utils/currency'
import { logger } from '../utils/logger'

const CACHE_KEY = 'ZENDA_FX_CACHE_V1'
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes client cache

export interface FxRateRow {
  base_currency: string
  target_currency: string
  rate: string | number
  updated_at?: string
  source?: string
}

export interface FxCachePayload {
  rates: FxRateRow[]
  fetchedAt: number
  stale: boolean
  source?: string | null
  updatedAt?: string | null
}

export interface ConvertResult {
  amount: number
  from: string
  to: string
  rate: number
  updatedAt?: string | null
  source?: string | null
  live: boolean
}

let memoryCache: FxCachePayload | null = null

async function readDiskCache(): Promise<FxCachePayload | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as FxCachePayload
    if (!parsed?.rates || !Array.isArray(parsed.rates)) return null
    return parsed
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

export async function loadExchangeRates(options?: {
  forceRefresh?: boolean
}): Promise<FxCachePayload> {
  const force = options?.forceRefresh === true
  const now = Date.now()

  if (!force && memoryCache && now - memoryCache.fetchedAt < CACHE_TTL_MS && !memoryCache.stale) {
    return memoryCache
  }

  if (!force) {
    const disk = memoryCache || (await readDiskCache())
    if (disk && now - disk.fetchedAt < CACHE_TTL_MS && !disk.stale) {
      memoryCache = disk
      return disk
    }
  }

  try {
    const data = await personalFinanceApi.getExchangeRates(
      force ? { refresh: true } : undefined,
    )
    const rates = normalizeList(data)
    let source: string | null = null
    let updatedAt: string | null = getLatestUpdatedAt(rates)
    let stale = rates.length === 0
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const meta = data as {
        source?: string
        stale?: boolean
        updated_at?: string
        provider_updated_at?: string
      }
      if (typeof meta.source === 'string') source = meta.source
      if (typeof meta.provider_updated_at === 'string') updatedAt = meta.provider_updated_at
      else if (typeof meta.updated_at === 'string') updatedAt = meta.updated_at
      if (meta.stale === true) stale = true
      if ((source || '').toLowerCase() === 'seed') stale = true
    }
    const payload: FxCachePayload = {
      rates,
      fetchedAt: now,
      stale,
      source,
      updatedAt,
    }
    memoryCache = payload
    await writeDiskCache(payload)
    return payload
  } catch (err) {
    logger.warn('exchangeRates: fetch failed, using cache if any', err)
    const disk = memoryCache || (await readDiskCache())
    if (disk && disk.rates.length > 0) {
      const stale: FxCachePayload = { ...disk, stale: true }
      memoryCache = stale
      return stale
    }
    const empty: FxCachePayload = { rates: [], fetchedAt: now, stale: true, source: null, updatedAt: null }
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
    if (!row.updated_at) continue
    if (!latest || row.updated_at > latest) latest = row.updated_at
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
      updatedAt: getLatestUpdatedAt(rates),
      live: rates.length > 0,
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
    updatedAt: getLatestUpdatedAt(rates),
    live: true,
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
    return { amount, from: fromCur, to: toCur, rate: 1, live: true }
  }

  try {
    const res = await personalFinanceApi.convertCurrency(amount, fromCur, toCur)
    const convertedRaw = res.converted ?? res.amount ?? res.result
    const converted = typeof convertedRaw === 'string' ? parseFloat(convertedRaw) : Number(convertedRaw)
    const rateRaw = res.rate
    const rate = typeof rateRaw === 'string' ? parseFloat(rateRaw) : Number(rateRaw)
    if (Number.isNaN(converted)) return null
    return {
      amount: converted,
      from: fromCur,
      to: toCur,
      rate: Number.isNaN(rate) ? 0 : rate,
      updatedAt:
        typeof res.provider_updated_at === 'string'
          ? res.provider_updated_at
          : typeof res.updated_at === 'string'
            ? res.updated_at
            : null,
      source: typeof res.source === 'string' ? res.source : null,
      live: res.stale !== true,
    }
  } catch {
    const cache = await loadExchangeRates()
    const local = convertLocally(amount, fromCur, toCur, cache.rates)
    if (!local) return null
    return { ...local, source: cache.source ?? null, live: !cache.stale }
  }
}

export function isSupportedCurrency(code: string): code is CurrencyCode {
  return SUPPORTED_CURRENCIES.includes(code as CurrencyCode)
}

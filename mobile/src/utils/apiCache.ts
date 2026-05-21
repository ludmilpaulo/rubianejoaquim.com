import AsyncStorage from '@react-native-async-storage/async-storage'

const PREFIX = 'ZENDA_CACHE_'
const DEFAULT_TTL_MS = 5 * 60 * 1000

interface CacheEntry<T> {
  data: T
  expires: number
}

export async function getCached<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(PREFIX + key)
  if (!raw) return null
  try {
    const entry: CacheEntry<T> = JSON.parse(raw)
    if (Date.now() > entry.expires) {
      await AsyncStorage.removeItem(PREFIX + key)
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

export async function setCached<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): Promise<void> {
  const entry: CacheEntry<T> = { data, expires: Date.now() + ttlMs }
  await AsyncStorage.setItem(PREFIX + key, JSON.stringify(entry))
}

export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
): Promise<T> {
  const cached = await getCached<T>(key)
  if (cached != null) return cached
  const data = await fetcher()
  await setCached(key, data, ttlMs)
  return data
}

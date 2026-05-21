import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { logger } from '../utils/logger'

/**
 * API base URL — set EXPO_PUBLIC_API_URL in .env or EAS secrets.
 * Example: https://your-domain.com/api
 * Dev example: http://192.168.1.100:8000/api
 */
function resolveDevApiHost(): string {
  const fromEnv = process.env.EXPO_PUBLIC_DEV_API_HOST?.trim()
  if (fromEnv) return fromEnv

  // Android emulator: 10.0.2.2 is the host machine's loopback (not 127.0.0.1)
  if (Platform.OS === 'android' && !Constants.isDevice) {
    return '10.0.2.2'
  }

  // Physical device on LAN: reuse Metro host (e.g. 192.168.1.157 from exp://…)
  const hostUri = Constants.expoConfig?.hostUri
  if (hostUri) {
    const host = hostUri.split(':')[0]?.trim()
    if (host && host !== 'localhost') {
      return host
    }
  }

  return '127.0.0.1'
}

export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim()
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '')
  }

  const isDevContext = typeof __DEV__ === 'undefined' || __DEV__
  if (isDevContext) {
    const devHost = resolveDevApiHost()
    const devPort = process.env.EXPO_PUBLIC_DEV_API_PORT || '8000'
    const url = `http://${devHost}:${devPort}/api`
    logger.info('API (dev fallback):', url)
    return url
  }

  throw new Error(
    'EXPO_PUBLIC_API_URL is not set. Add it to mobile/.env or EAS environment variables.',
  )
}

import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { logger } from '../utils/logger'

/** Django API used in production (PythonAnywhere). */
export const PRODUCTION_API_DEFAULT = 'https://ludmilpaulo.pythonanywhere.com/api'

/**
 * API base URL — override with EXPO_PUBLIC_API_URL in .env or EAS secrets.
 * Physical devices and release builds use production unless EXPO_PUBLIC_USE_DEV_API=true.
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

function resolveFromExpoExtra(): string | null {
  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined
  const url = extra?.apiUrl?.trim()
  return url ? url.replace(/\/$/, '') : null
}

export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim()
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '')
  }

  const fromExtra = resolveFromExpoExtra()
  if (fromExtra) {
    return fromExtra
  }

  const useDevApi = process.env.EXPO_PUBLIC_USE_DEV_API === 'true'
  const isDevContext = typeof __DEV__ === 'undefined' || __DEV__

  // Dev API only when explicitly requested, or on emulator/simulator (not physical device)
  if (isDevContext && (useDevApi || !Constants.isDevice)) {
    const devHost = resolveDevApiHost()
    const devPort = process.env.EXPO_PUBLIC_DEV_API_PORT || '8000'
    const url = `http://${devHost}:${devPort}/api`
    logger.info('API (dev):', url)
    return url
  }

  logger.info('API (production):', PRODUCTION_API_DEFAULT)
  return PRODUCTION_API_DEFAULT
}

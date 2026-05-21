import { logger } from '../utils/logger'

/**
 * API base URL — set EXPO_PUBLIC_API_URL in .env or EAS secrets.
 * Example: https://your-domain.com/api
 * Dev example: http://192.168.1.100:8000/api
 */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim()
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '')
  }

  const isDevContext = typeof __DEV__ === 'undefined' || __DEV__
  if (isDevContext) {
    const devHost = process.env.EXPO_PUBLIC_DEV_API_HOST || '127.0.0.1'
    const devPort = process.env.EXPO_PUBLIC_DEV_API_PORT || '8000'
    const url = `http://${devHost}:${devPort}/api`
    logger.info('API (dev fallback):', url)
    return url
  }

  throw new Error(
    'EXPO_PUBLIC_API_URL is not set. Add it to mobile/.env or EAS environment variables.',
  )
}

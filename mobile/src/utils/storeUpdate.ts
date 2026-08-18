/**
 * Check for mandatory store updates (blocking) and optional newer-version prompts.
 */
import { Alert, Linking, Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import { configApi } from '../services/api'
import type { Locale } from '../i18n'

const FORCE_CACHE_KEY = 'ZENDA_FORCE_UPDATE_REQUIRED'

export interface ForceUpdateInfo {
  storeUrl: string
  message: string
  minimumVersion: string
  latestVersion: string
}

function parseVersion(v: string): number[] {
  const parts = (v || '0.0.0').split('.').map((n) => parseInt(n, 10) || 0)
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0]
}

export function isNewerVersion(latest: string, current: string): boolean {
  const a = parseVersion(latest)
  const b = parseVersion(current)
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true
    if (a[i] < b[i]) return false
  }
  return false
}

export function isVersionBelowMinimum(current: string, minimum: string): boolean {
  return isNewerVersion(minimum, current)
}

export function getInstalledAppVersion(): string {
  try {
    // Native store version when available (not the Expo JS manifest).
    const Application = require('expo-application') as { nativeApplicationVersion?: string | null }
    if (Application.nativeApplicationVersion) {
      return Application.nativeApplicationVersion
    }
  } catch {
    // optional native module
  }
  return (
    Constants.expoConfig?.version ??
    (typeof Constants.manifest === 'object' && Constants.manifest && 'version' in Constants.manifest
      ? String((Constants.manifest as { version?: string }).version)
      : undefined) ??
    '1.0.0'
  )
}

function pickMessage(
  messages: { en?: string; pt?: string; fr?: string; es?: string } | undefined,
  locale: Locale,
): string {
  if (!messages) {
    return 'A new version of Zenda is required. Please update to continue.'
  }
  return messages[locale] || messages.en || messages.pt || Object.values(messages)[0] || ''
}

export async function checkMandatoryUpdate(locale: Locale): Promise<ForceUpdateInfo | null> {
  const current = getInstalledAppVersion()
  try {
    const data = await configApi.getAppVersionV2()
    const platform = Platform.OS === 'ios' ? data.ios : data.android
    const minimum = platform?.minimum_version || '1.0.0'
    const latest = platform?.latest_version || minimum
    const storeUrl =
      platform?.store_url ||
      (Platform.OS === 'ios'
        ? 'https://apps.apple.com/app/id6758412176'
        : 'https://play.google.com/store/apps/details?id=com.rubianejoaquim.zenda')
    const must =
      Boolean(data.force_update) || isVersionBelowMinimum(current, minimum)
    if (must) {
      await AsyncStorage.setItem(FORCE_CACHE_KEY, '1')
      return {
        storeUrl,
        message: pickMessage(data.message, locale),
        minimumVersion: minimum,
        latestVersion: latest,
      }
    }
    await AsyncStorage.removeItem(FORCE_CACHE_KEY)
    return null
  } catch {
    const cached = await AsyncStorage.getItem(FORCE_CACHE_KEY)
    if (cached === '1') {
      return {
        storeUrl:
          Platform.OS === 'ios'
            ? 'https://apps.apple.com/app/id6758412176'
            : 'https://play.google.com/store/apps/details?id=com.rubianejoaquim.zenda',
        message: pickMessage(undefined, locale),
        minimumVersion: current,
        latestVersion: current,
      }
    }
    return null
  }
}

export async function checkStoreUpdate(): Promise<void> {
  const current = getInstalledAppVersion()
  try {
    const data = await configApi.getAppVersionV2().catch(async () => {
      const legacy = await configApi.getAppVersion()
      return {
        ios: { latest_version: legacy.ios, store_url: legacy.ios_store_url, minimum_version: '1.0.0' },
        android: {
          latest_version: legacy.android,
          store_url: legacy.android_store_url,
          minimum_version: '1.0.0',
        },
        force_update: false,
        message: {},
      }
    })
    const platform = Platform.OS === 'ios' ? data.ios : data.android
    const latest = platform?.latest_version
    if (!latest || !isNewerVersion(latest, current)) return
    if (isVersionBelowMinimum(current, platform?.minimum_version || '1.0.0')) return

    const storeUrl =
      platform?.store_url ||
      (Platform.OS === 'ios'
        ? 'https://apps.apple.com/app/id6758412176'
        : 'https://play.google.com/store/apps/details?id=com.rubianejoaquim.zenda')

    Alert.alert(
      'Nova versão disponível',
      'Há uma atualização do Zenda na loja. Toque em Atualizar para abrir a loja e instalar.',
      [
        { text: 'Depois', style: 'cancel' },
        {
          text: 'Atualizar',
          onPress: () => {
            Linking.openURL(storeUrl).catch(() => {})
          },
        },
      ],
    )
  } catch {
    // Ignore network errors; don't block the app
  }
}

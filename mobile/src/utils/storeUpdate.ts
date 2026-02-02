/**
 * Check for app store updates and prompt user to open Play Store / App Store.
 */
import { Alert, Linking, Platform } from 'react-native'
import Constants from 'expo-constants'
import { configApi } from '../services/api'

function parseVersion(v: string): number[] {
  const parts = (v || '0.0.0').split('.').map((n) => parseInt(n, 10) || 0)
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0]
}

function isNewerVersion(latest: string, current: string): boolean {
  const a = parseVersion(latest)
  const b = parseVersion(current)
  for (let i = 0; i < 3; i++) {
    if (a[i] > b[i]) return true
    if (a[i] < b[i]) return false
  }
  return false
}

export async function checkStoreUpdate(): Promise<void> {
  const current = Constants.expoConfig?.version ?? (Constants.manifest as any)?.version ?? '1.0.0'
  try {
    const data = await configApi.getAppVersion()
    const latest = Platform.OS === 'ios' ? data.ios : data.android
    if (!latest || !isNewerVersion(latest, current)) return

    const storeUrl =
      Platform.OS === 'ios'
        ? data.ios_store_url || 'https://apps.apple.com/app/id000000000'
        : data.android_store_url || 'https://play.google.com/store/apps/details?id=com.rubianejoaquim.zenda'

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
      ]
    )
  } catch {
    // Ignore network errors; don't block the app
  }
}

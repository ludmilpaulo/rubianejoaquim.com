/**
 * Automatic Over-The-Air (OTA) updates using Expo Updates
 * Checks for updates on app load and automatically downloads/installs them
 */
import * as Updates from 'expo-updates'
import { Alert, Platform } from 'react-native'

/**
 * Check for and apply OTA updates automatically
 * Call this when the app starts (e.g., in App.tsx or root component)
 */
export async function checkAndApplyUpdates(): Promise<void> {
  // Only check for updates in production builds, not in development
  if (__DEV__) {
    console.log('Skipping update check in development mode')
    return
  }

  try {
    // Check if updates are available
    const update = await Updates.checkForUpdateAsync()

    if (update.isAvailable) {
      console.log('Update available, downloading...')
      
      // Download the update
      await Updates.fetchUpdateAsync()

      // Notify user and reload app to apply update
      Alert.alert(
        'Atualização disponível',
        'Uma nova versão do app foi baixada. O app será reiniciado para aplicar a atualização.',
        [
          {
            text: 'Reiniciar agora',
            onPress: async () => {
              await Updates.reloadAsync()
            },
          },
        ],
        { cancelable: false }
      )
    } else {
      console.log('App is up to date')
    }
  } catch (error) {
    console.error('Error checking for updates:', error)
    // Don't block the app if update check fails
  }
}

/**
 * Check for updates silently in the background
 * This will download updates but not prompt the user immediately
 */
export async function checkUpdatesInBackground(): Promise<void> {
  if (__DEV__) {
    return
  }

  try {
    const update = await Updates.checkForUpdateAsync()

    if (update.isAvailable) {
      console.log('Background update available, downloading...')
      await Updates.fetchUpdateAsync()
      console.log('Update downloaded, will apply on next app restart')
    }
  } catch (error) {
    console.error('Error checking for background updates:', error)
  }
}

/**
 * Get the current update channel
 */
export function getUpdateChannel(): string {
  return Updates.channel || 'production'
}

/**
 * Get the current update ID
 */
export function getUpdateId(): string | null {
  return Updates.updateId || null
}

/**
 * Check if the app is running a downloaded update
 */
export function isRunningUpdate(): boolean {
  return Updates.isEmbeddedLaunch === false
}

import * as LocalAuthentication from 'expo-local-authentication'
import AsyncStorage from '@react-native-async-storage/async-storage'

const BIOMETRIC_ENABLED_KEY = '@biometric_enabled'
const BIOMETRIC_CREDENTIALS_KEY = '@biometric_credentials'

export interface BiometricCredentials {
  emailOrUsername: string
  password: string
}

/**
 * Check if biometric authentication is available on the device
 */
export async function isBiometricAvailable(): Promise<boolean> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync()
    if (!compatible) {
      return false
    }

    const enrolled = await LocalAuthentication.isEnrolledAsync()
    return enrolled
  } catch (error) {
    console.error('Error checking biometric availability:', error)
    return false
  }
}

/**
 * Get the type of biometric authentication available
 */
export async function getBiometricType(): Promise<string> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync()
    
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'Face ID'
    } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'Touch ID'
    } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'Iris'
    }
    
    return 'Biometric'
  } catch (error) {
    console.error('Error getting biometric type:', error)
    return 'Biometric'
  }
}

/**
 * Authenticate using biometrics (Face ID, Touch ID, etc.)
 */
export async function authenticateWithBiometric(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Autentique-se para continuar',
      cancelLabel: 'Cancelar',
      disableDeviceFallback: false,
      fallbackLabel: 'Usar senha',
    })

    return result.success
  } catch (error) {
    console.error('Biometric authentication error:', error)
    return false
  }
}

/**
 * Check if biometric authentication is enabled for the user
 */
export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const enabled = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY)
    return enabled === 'true'
  } catch (error) {
    console.error('Error checking biometric enabled:', error)
    return false
  }
}

/**
 * Enable biometric authentication and store credentials
 */
export async function enableBiometric(
  emailOrUsername: string,
  password: string
): Promise<void> {
  try {
    await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, 'true')
    const credentials: BiometricCredentials = {
      emailOrUsername,
      password,
    }
    await AsyncStorage.setItem(
      BIOMETRIC_CREDENTIALS_KEY,
      JSON.stringify(credentials)
    )
  } catch (error) {
    console.error('Error enabling biometric:', error)
    throw error
  }
}

/**
 * Disable biometric authentication
 */
export async function disableBiometric(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BIOMETRIC_ENABLED_KEY)
    await AsyncStorage.removeItem(BIOMETRIC_CREDENTIALS_KEY)
  } catch (error) {
    console.error('Error disabling biometric:', error)
    throw error
  }
}

/**
 * Get stored biometric credentials
 */
export async function getBiometricCredentials(): Promise<BiometricCredentials | null> {
  try {
    const credentialsJson = await AsyncStorage.getItem(BIOMETRIC_CREDENTIALS_KEY)
    if (!credentialsJson) {
      return null
    }
    return JSON.parse(credentialsJson) as BiometricCredentials
  } catch (error) {
    console.error('Error getting biometric credentials:', error)
    return null
  }
}

/**
 * Clear stored biometric credentials (e.g., on logout)
 */
export async function clearBiometricCredentials(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BIOMETRIC_CREDENTIALS_KEY)
  } catch (error) {
    console.error('Error clearing biometric credentials:', error)
  }
}

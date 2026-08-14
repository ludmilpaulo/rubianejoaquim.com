/**
 * Native Google / Facebook Sign-In loaders.
 *
 * `@react-native-google-signin/google-signin` calls
 * TurboModuleRegistry.getEnforcing('RNGoogleSignin') at import time.
 * That crashes Expo Go and any binary built before the native module was added.
 * Probe first with get() (returns null) and only then require() the package.
 *
 * Types are declared locally (not `typeof import(...)`) so Metro/Babel cannot
 * eager-load the native modules.
 */
import { NativeModules, Platform, TurboModuleRegistry } from 'react-native'
import Constants, { ExecutionEnvironment } from 'expo-constants'
import { logger } from '../utils/logger'

type GoogleSignInResponse = {
  data: { idToken: string | null }
}

type GoogleSignInPkg = {
  GoogleSignin: {
    configure: (options: {
      webClientId: string
      offlineAccess?: boolean
      iosClientId?: string
    }) => void
    hasPlayServices: (options?: { showPlayServicesUpdateDialog?: boolean }) => Promise<boolean>
    signIn: () => Promise<GoogleSignInResponse>
    getTokens: () => Promise<{ idToken: string | null }>
  }
  isSuccessResponse: (response: unknown) => response is GoogleSignInResponse
  isErrorWithCode: (err: unknown) => err is { code: string }
  statusCodes: { SIGN_IN_CANCELLED: string }
}

type FacebookPkg = {
  Settings: {
    setAppID: (appId: string) => void
    setClientToken: (token: string) => void
    initializeSDK: () => void
  }
  LoginManager: {
    logInWithPermissions: (permissions: string[]) => Promise<{ isCancelled?: boolean }>
  }
  AccessToken: {
    getCurrentAccessToken: () => Promise<{ accessToken?: string } | null>
  }
}

export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient
}

export function hasGoogleSignInNative(): boolean {
  if (Platform.OS === 'web' || isExpoGo()) return false
  try {
    const turbo = TurboModuleRegistry.get('RNGoogleSignin')
    if (turbo) return true
    return NativeModules.RNGoogleSignin != null
  } catch (error) {
    logger.error('RNGoogleSignin native probe failed', error)
    return false
  }
}

export function hasFacebookNative(): boolean {
  if (Platform.OS === 'web' || isExpoGo()) return false
  try {
    return NativeModules.FBLoginManager != null || NativeModules.FBSettings != null
  } catch (error) {
    logger.error('Facebook native probe failed', error)
    return false
  }
}

let googlePkg: GoogleSignInPkg | null | undefined
let facebookPkg: FacebookPkg | null | undefined

export function loadGoogleSignIn(): GoogleSignInPkg | null {
  if (!hasGoogleSignInNative()) return null
  if (googlePkg !== undefined) return googlePkg
  try {
    googlePkg = require('@react-native-google-signin/google-signin') as GoogleSignInPkg
    return googlePkg
  } catch (error) {
    logger.error('Failed to load @react-native-google-signin/google-signin', error)
    googlePkg = null
    return null
  }
}

export function loadFacebookSdk(): FacebookPkg | null {
  if (!hasFacebookNative()) return null
  if (facebookPkg !== undefined) return facebookPkg
  try {
    facebookPkg = require('react-native-fbsdk-next') as FacebookPkg
    return facebookPkg
  } catch (error) {
    logger.error('Failed to load react-native-fbsdk-next', error)
    facebookPkg = null
    return null
  }
}

export function isSocialCancelError(err: unknown, google?: GoogleSignInPkg | null): boolean {
  if (google) {
    if (google.isErrorWithCode(err) && err.code === google.statusCodes.SIGN_IN_CANCELLED) {
      return true
    }
  }
  if (err && typeof err === 'object' && 'code' in err) {
    const code = String((err as { code?: string }).code || '')
    if (
      code === 'ERR_REQUEST_CANCELED' ||
      code === 'E_CANCELLED' ||
      code === 'SIGN_IN_CANCELLED' ||
      /cancel/i.test(code)
    ) {
      return true
    }
  }
  const msg = err instanceof Error ? err.message : String(err)
  return /cancel/i.test(msg)
}

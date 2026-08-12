import React, { useCallback, useEffect, useState } from 'react'
import { AppState, StyleSheet, View } from 'react-native'
import { Provider } from 'react-redux'
import { NavigationContainer } from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import { Button, PaperProvider, Text } from 'react-native-paper'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { store } from './src/store'
import { checkAuth, checkPaidAccess } from './src/store/authSlice'
import { useAppDispatch, useAppSelector } from './src/hooks/redux'
import AuthNavigator from './src/navigation/AuthNavigator'
import MainNavigator from './src/navigation/MainNavigator'
import { linking } from './src/navigation/linking'
import LoadingScreen from './src/screens/LoadingScreen'
import OnboardingScreen, { isOnboardingComplete } from './src/screens/OnboardingScreen'
import { setupNotifications } from './src/utils/notifications'
import { checkStoreUpdate } from './src/utils/storeUpdate'
import { checkAndApplyUpdates } from './src/utils/appUpdates'
import { I18nProvider, useI18n } from './src/contexts/I18nContext'
import { CurrencyProvider } from './src/contexts/CurrencyContext'
import { AppAppearanceProvider, useAppAppearance } from './src/contexts/AppAppearanceContext'
import { isLocale } from './src/i18n'
import { zendaDarkTheme, zendaLightTheme } from './src/theme/paperTheme'
import { flushOfflineQueue } from './src/utils/offlineQueue'
import { warmupIap } from './src/services/iap'
import {
  authenticateWithBiometric,
  isBiometricAppLockEnabled,
  isBiometricAvailable,
  setBiometricAppLockEnabled,
} from './src/utils/biometric'

function AppContent() {
  const dispatch = useAppDispatch()
  const { t, setLocale } = useI18n()
  const { isDarkMode, ready: appearanceReady } = useAppAppearance()
  const { user, isLoading, hasPaidAccess, hasExpiredSubscription, accessChecked } = useAppSelector(
    (state) => state.auth,
  )
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null)
  const [appLocked, setAppLocked] = useState(false)
  const [unlocking, setUnlocking] = useState(false)

  const unlockWithBiometrics = useCallback(async () => {
    if (!user) {
      setAppLocked(false)
      return true
    }

    const enabled = await isBiometricAppLockEnabled()
    if (!enabled) {
      setAppLocked(false)
      return true
    }

    const available = await isBiometricAvailable()
    if (!available) {
      await setBiometricAppLockEnabled(false)
      setAppLocked(false)
      return true
    }

    setUnlocking(true)
    const authenticated = await authenticateWithBiometric({
      promptMessage: t('settings.appLockPrompt'),
      cancelLabel: t('common.cancel'),
      fallbackLabel: t('settings.biometricFallback'),
    })
    setUnlocking(false)
    setAppLocked(!authenticated)
    return authenticated
  }, [t, user])

  useEffect(() => {
    dispatch(checkAuth())
    warmupIap().catch(() => {})
  }, [dispatch])

  // After login/session restore: honor explicit profile language when set
  useEffect(() => {
    if (!user?.preferred_locale || !isLocale(user.preferred_locale)) return
    setLocale(user.preferred_locale).catch(() => {})
  }, [user?.id, user?.preferred_locale, setLocale])

  useEffect(() => {
    if (user && hasPaidAccess) {
      isOnboardingComplete().then((done) => {
        setShowOnboarding(!done && !user.onboarding_completed)
      })
    } else {
      setShowOnboarding(false)
    }
  }, [user, hasPaidAccess])

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && user) {
        dispatch(checkPaidAccess()).catch(() => {})
        flushOfflineQueue().catch(() => {})
        unlockWithBiometrics().catch(() => setAppLocked(false))
      } else if ((state === 'background' || state === 'inactive') && user) {
        isBiometricAppLockEnabled()
          .then((enabled) => {
            if (enabled) setAppLocked(true)
          })
          .catch(() => {})
      }
    })
    return () => sub.remove()
  }, [user, dispatch, unlockWithBiometrics])

  useEffect(() => {
    if (user) {
      unlockWithBiometrics().catch(() => setAppLocked(false))
    } else {
      setAppLocked(false)
    }
  }, [user, unlockWithBiometrics])

  useEffect(() => {
    if (user && !accessChecked) {
      dispatch(checkPaidAccess()).catch(() => {})
    }
  }, [user, accessChecked, dispatch])

  useEffect(() => {
    if (user && (hasPaidAccess || hasExpiredSubscription)) {
      setupNotifications().catch(() => {})
    }
  }, [user, hasPaidAccess, hasExpiredSubscription])

  useEffect(() => {
    checkAndApplyUpdates().catch(() => {})
  }, [])

  useEffect(() => {
    if (user && hasPaidAccess) {
      const t = setTimeout(() => {
        checkStoreUpdate().catch(() => {})
      }, 3000)
      return () => clearTimeout(t)
    }
  }, [user, hasPaidAccess])

  if (!appearanceReady || isLoading || showOnboarding === null) {
    return <LoadingScreen />
  }

  if (user && !accessChecked) {
    return <LoadingScreen />
  }

  if (user && hasPaidAccess && showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
  }

  const theme = isDarkMode ? zendaDarkTheme : zendaLightTheme
  const statusBarStyle = isDarkMode ? 'light' : 'dark'

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        {appLocked ? (
          <View style={[styles.lockScreen, isDarkMode && styles.lockScreenDark]}>
            <View style={styles.lockIcon}>
              <MaterialCommunityIcons name="shield-lock" size={42} color="#3534C9" />
            </View>
            <Text style={[styles.lockTitle, isDarkMode && styles.lockTitleDark]}>
              {t('settings.appLockedTitle')}
            </Text>
            <Text style={[styles.lockBody, isDarkMode && styles.lockBodyDark]}>
              {t('settings.appLockedBody')}
            </Text>
            <Button mode="contained" icon="fingerprint" onPress={unlockWithBiometrics} loading={unlocking}>
              {t('settings.unlockApp')}
            </Button>
          </View>
        ) : (
          <NavigationContainer linking={linking}>
            {user && hasPaidAccess ? (
              <MainNavigator />
            ) : (
              // Expired / no-access users go to AccessDenied (AuthNavigator), which exposes
              // Subscribe with Apple + renew/upload. Profile-only hid IAP and blocked App Review.
              <AuthNavigator />
            )}
          </NavigationContainer>
        )}
        <StatusBar style={statusBarStyle} />
      </PaperProvider>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  lockScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F8FAFC',
  },
  lockScreenDark: {
    backgroundColor: '#0F172A',
  },
  lockIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    backgroundColor: '#E8E8FA',
  },
  lockTitle: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  lockTitleDark: {
    color: '#F8FAFC',
  },
  lockBody: {
    color: '#64748B',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  lockBodyDark: {
    color: '#CBD5E1',
  },
})

export default function App() {
  return (
    <Provider store={store}>
      <I18nProvider>
        <CurrencyProvider>
          <AppAppearanceProvider>
            <AppContent />
          </AppAppearanceProvider>
        </CurrencyProvider>
      </I18nProvider>
    </Provider>
  )
}

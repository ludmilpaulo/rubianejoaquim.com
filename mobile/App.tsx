import React, { useEffect, useState } from 'react'
import { AppState } from 'react-native'
import { Provider } from 'react-redux'
import { NavigationContainer } from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import { PaperProvider } from 'react-native-paper'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { store } from './src/store'
import { checkAuth, checkPaidAccess } from './src/store/authSlice'
import { useAppDispatch, useAppSelector } from './src/hooks/redux'
import AuthNavigator from './src/navigation/AuthNavigator'
import MainNavigator from './src/navigation/MainNavigator'
import ProfileOnlyNavigator from './src/navigation/ProfileOnlyNavigator'
import LoadingScreen from './src/screens/LoadingScreen'
import OnboardingScreen, { isOnboardingComplete } from './src/screens/OnboardingScreen'
import { setupNotifications } from './src/utils/notifications'
import { checkStoreUpdate } from './src/utils/storeUpdate'
import { checkAndApplyUpdates } from './src/utils/appUpdates'
import { I18nProvider } from './src/contexts/I18nContext'
import { zendaLightTheme } from './src/theme/paperTheme'
import { flushOfflineQueue } from './src/utils/offlineQueue'

function AppContent() {
  const dispatch = useAppDispatch()
  const { user, isLoading, hasPaidAccess, hasExpiredSubscription, accessChecked } = useAppSelector(
    (state) => state.auth,
  )
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null)

  useEffect(() => {
    dispatch(checkAuth())
  }, [dispatch])

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
      }
    })
    return () => sub.remove()
  }, [user, dispatch])

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

  if (isLoading || showOnboarding === null) {
    return <LoadingScreen />
  }

  if (user && !accessChecked) {
    return <LoadingScreen />
  }

  if (user && hasPaidAccess && showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={zendaLightTheme}>
        <NavigationContainer>
          {user && hasPaidAccess ? (
            <MainNavigator />
          ) : user && hasExpiredSubscription ? (
            <ProfileOnlyNavigator />
          ) : (
            <AuthNavigator />
          )}
          <StatusBar style="auto" />
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  )
}

export default function App() {
  return (
    <Provider store={store}>
      <I18nProvider>
        <AppContent />
      </I18nProvider>
    </Provider>
  )
}

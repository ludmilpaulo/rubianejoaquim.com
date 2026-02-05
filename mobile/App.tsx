import React, { useEffect } from 'react'
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
import LoadingScreen from './src/screens/LoadingScreen'
import { setupNotifications } from './src/utils/notifications'
import { checkStoreUpdate } from './src/utils/storeUpdate'
import { checkAndApplyUpdates } from './src/utils/appUpdates'

function AppContent() {
  const dispatch = useAppDispatch()
  const { user, isLoading, hasPaidAccess, accessChecked } = useAppSelector((state) => state.auth)

  useEffect(() => {
    dispatch(checkAuth())
  }, [dispatch])

  // Re-check access when app returns to foreground (trial/subscription may have expired)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && user) {
        dispatch(checkPaidAccess()).catch(() => {})
      }
    })
    return () => sub.remove()
  }, [user, dispatch])

  useEffect(() => {
    // After login/register, accessChecked is false until we confirm access.
    // Show LoadingScreen during this phase to prevent AccessDenied flicker.
    if (user && !accessChecked) {
      dispatch(checkPaidAccess()).catch(() => {})
    }
  }, [user, accessChecked, dispatch])

  useEffect(() => {
    if (user && hasPaidAccess) {
      setupNotifications().catch(() => {})
    }
  }, [user, hasPaidAccess])

  useEffect(() => {
    // Check for OTA updates on app load (works in production builds)
    checkAndApplyUpdates().catch(() => {})
  }, [])

  useEffect(() => {
    if (user && hasPaidAccess) {
      // Check for store updates (for major version changes that require app store update)
      const t = setTimeout(() => {
        checkStoreUpdate().catch(() => {})
      }, 3000)
      return () => clearTimeout(t)
    }
  }, [user, hasPaidAccess])

  if (isLoading) {
    return <LoadingScreen />
  }

  // Prevent AccessDenied flash: if user exists but access isn't checked yet, keep showing loader
  if (user && !accessChecked) {
    return <LoadingScreen />
  }

  return (
    <SafeAreaProvider>
      <PaperProvider>
        <NavigationContainer>
          {user && hasPaidAccess ? <MainNavigator /> : <AuthNavigator />}
          <StatusBar style="auto" />
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  )
}

export default function App() {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  )
}

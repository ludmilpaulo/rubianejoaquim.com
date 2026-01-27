import React, { useEffect } from 'react'
import { Provider } from 'react-redux'
import { NavigationContainer } from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import { PaperProvider } from 'react-native-paper'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { store } from './src/store'
import { checkAuth } from './src/store/authSlice'
import { useAppDispatch, useAppSelector } from './src/hooks/redux'
import AuthNavigator from './src/navigation/AuthNavigator'
import MainNavigator from './src/navigation/MainNavigator'
import LoadingScreen from './src/screens/LoadingScreen'

function AppContent() {
  const dispatch = useAppDispatch()
  const { user, isLoading, hasPaidAccess } = useAppSelector((state) => state.auth)

  useEffect(() => {
    dispatch(checkAuth())
  }, [dispatch])

  if (isLoading) {
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

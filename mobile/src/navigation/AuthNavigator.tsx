import React, { useEffect } from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import LoginScreen from '../screens/LoginScreen'
import RegisterScreen from '../screens/RegisterScreen'
import AccessDeniedScreen from '../screens/AccessDeniedScreen'
import { useAppSelector, useAppDispatch } from '../hooks/redux'
import { checkPaidAccess } from '../store/authSlice'

export type AuthStackParamList = {
  Login: undefined
  Register: undefined
  AccessDenied: undefined
}

const Stack = createStackNavigator<AuthStackParamList>()

export default function AuthNavigator() {
  const dispatch = useAppDispatch()
  const { user, hasPaidAccess } = useAppSelector((state) => state.auth)

  // Re-check access when navigator mounts or user changes - ensures we have latest access status
  useEffect(() => {
    if (user) {
      // Always check access when user is logged in to ensure it's up to date
      dispatch(checkPaidAccess())
    }
  }, [user, dispatch])

  // Determine initial route based on current state
  // If user has access, they shouldn't be in AuthNavigator (App.tsx handles that)
  // But if they somehow end up here, start at Login
  const initialRoute = user && !hasPaidAccess ? 'AccessDenied' : 'Login'

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen 
        name="AccessDenied" 
        component={AccessDeniedScreen}
        options={{
          // Prevent going back to AccessDenied if access is granted
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  )
}

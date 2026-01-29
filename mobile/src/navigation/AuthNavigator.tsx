import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import LoginScreen from '../screens/LoginScreen'
import RegisterScreen from '../screens/RegisterScreen'
import AccessDeniedScreen from '../screens/AccessDeniedScreen'
import { useAppSelector } from '../hooks/redux'

export type AuthStackParamList = {
  Login: undefined
  Register: undefined
  AccessDenied: undefined
}

const Stack = createStackNavigator<AuthStackParamList>()

export default function AuthNavigator() {
  const { user, hasPaidAccess } = useAppSelector((state) => state.auth)

  const initialRoute = user && !hasPaidAccess ? 'AccessDenied' : 'Login'

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="AccessDenied" component={AccessDeniedScreen} />
    </Stack.Navigator>
  )
}

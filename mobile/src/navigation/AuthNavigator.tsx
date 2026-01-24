import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import LoginScreen from '../screens/LoginScreen'
import AccessDeniedScreen from '../screens/AccessDeniedScreen'
import { useAppSelector } from '../hooks/redux'

const Stack = createStackNavigator()

export default function AuthNavigator() {
  const { user, hasPaidAccess } = useAppSelector((state) => state.auth)

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user && !hasPaidAccess ? (
        <Stack.Screen name="AccessDenied" component={AccessDeniedScreen} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  )
}

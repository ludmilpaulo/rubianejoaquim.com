import React from 'react'
import { createStackNavigator } from '@react-navigation/stack'
import { useI18n } from '../contexts/I18nContext'
import ProfileScreen from '../screens/ProfileScreen'
import SettingsScreen from '../screens/SettingsScreen'
import AboutScreen from '../screens/AboutScreen'
import HelpSupportScreen from '../screens/HelpSupportScreen'

const Stack = createStackNavigator()

/**
 * Navigator shown when trial/subscription has expired.
 * User can only access Profile to make payment and submit proof of payment (POP).
 */
export default function ProfileOnlyNavigator() {
  const { t } = useI18n()
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: '#6366f1' },
        headerTintColor: '#fff',
      }}
    >
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ headerShown: true, title: t('navigation.settings') }}
      />
      <Stack.Screen
        name="About"
        component={AboutScreen}
        options={{ headerShown: true, title: t('navigation.about') }}
      />
      <Stack.Screen
        name="HelpSupport"
        component={HelpSupportScreen}
        options={{ headerShown: true, title: t('navigation.help') }}
      />
    </Stack.Navigator>
  )
}

import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import HomeScreen from '../screens/HomeScreen'
import PersonalFinanceScreen from '../screens/PersonalFinanceScreen'
import BusinessFinanceScreen from '../screens/BusinessFinanceScreen'
import EducationScreen from '../screens/EducationScreen'
import ProfileScreen from '../screens/ProfileScreen'

const Tab = createBottomTabNavigator()

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof MaterialCommunityIcons.glyphMap

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline'
          } else if (route.name === 'Personal') {
            iconName = focused ? 'wallet' : 'wallet-outline'
          } else if (route.name === 'Business') {
            iconName = focused ? 'store' : 'store-outline'
          } else if (route.name === 'Education') {
            iconName = focused ? 'school' : 'school-outline'
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account' : 'account-outline'
          } else {
            iconName = 'circle'
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#999',
        headerShown: true,
        headerStyle: {
          backgroundColor: '#6366f1',
        },
        headerTintColor: '#fff',
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ title: 'Zenda' }}
      />
      <Tab.Screen 
        name="Personal" 
        component={PersonalFinanceScreen}
        options={{ title: 'Pessoal' }}
      />
      <Tab.Screen 
        name="Business" 
        component={BusinessFinanceScreen}
        options={{ title: 'Negócio' }}
      />
      <Tab.Screen 
        name="Education" 
        component={EducationScreen}
        options={{ title: 'Educação' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Perfil' }}
      />
    </Tab.Navigator>
  )
}

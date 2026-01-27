import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator } from '@react-navigation/stack'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import HomeScreen from '../screens/HomeScreen'
import PersonalFinanceScreen from '../screens/PersonalFinanceScreen'
import BusinessFinanceScreen from '../screens/BusinessFinanceScreen'
import EducationScreen from '../screens/EducationScreen'
import ProfileScreen from '../screens/ProfileScreen'
import ToDoListScreen from '../screens/ToDoListScreen'
import TargetsScreen from '../screens/TargetsScreen'
import NotificationsScreen from '../screens/NotificationsScreen'
import CourseLessonsScreen from '../screens/CourseLessonsScreen'
import LessonDetailScreen from '../screens/LessonDetailScreen'
import AICopilotScreen from '../screens/AICopilotScreen'

const Tab = createBottomTabNavigator()
const Stack = createStackNavigator()

function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="HomeMain" 
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ToDoList" 
        component={ToDoListScreen}
        options={{ title: 'Lista de Tarefas', headerStyle: { backgroundColor: '#6366f1' }, headerTintColor: '#fff' }}
      />
      <Stack.Screen 
        name="Targets" 
        component={TargetsScreen}
        options={{ title: 'Metas', headerStyle: { backgroundColor: '#6366f1' }, headerTintColor: '#fff' }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{ title: 'Notificações', headerStyle: { backgroundColor: '#6366f1' }, headerTintColor: '#fff' }}
      />
      <Stack.Screen 
        name="AICopilot" 
        component={AICopilotScreen}
        options={{ title: 'AI Financial Copilot', headerStyle: { backgroundColor: '#8b5cf6' }, headerTintColor: '#fff' }}
      />
    </Stack.Navigator>
  )
}

function EducationStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="EducationMain" 
        component={EducationScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="CourseLessons" 
        component={CourseLessonsScreen}
        options={{ title: 'Aulas do Curso', headerStyle: { backgroundColor: '#6366f1' }, headerTintColor: '#fff' }}
      />
      <Stack.Screen 
        name="LessonDetail" 
        component={LessonDetailScreen}
        options={{ title: 'Aula', headerStyle: { backgroundColor: '#6366f1' }, headerTintColor: '#fff' }}
      />
    </Stack.Navigator>
  )
}

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
        tabBarStyle: {
          paddingBottom: 8,
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeStack}
        options={{ title: 'Zenda', headerShown: false }}
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
        component={EducationStack}
        options={{ title: 'Educação', headerShown: false }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Perfil' }}
      />
    </Tab.Navigator>
  )
}

import React from 'react'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { createStackNavigator } from '@react-navigation/stack'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import HomeScreen from '../screens/HomeScreen'
import PersonalFinanceScreen from '../screens/PersonalFinanceScreen'
import OrcamentoPrincipiosScreen from '../screens/OrcamentoPrincipiosScreen'
import TirarDinheiroOrcamentoScreen from '../screens/TirarDinheiroOrcamentoScreen'
import BusinessFinanceScreen from '../screens/BusinessFinanceScreen'
import EducationScreen from '../screens/EducationScreen'
import ProfileScreen from '../screens/ProfileScreen'
import ToDoListScreen from '../screens/ToDoListScreen'
import TargetsScreen from '../screens/TargetsScreen'
import NotificationsScreen from '../screens/NotificationsScreen'
import CourseLessonsScreen from '../screens/CourseLessonsScreen'
import LessonDetailScreen from '../screens/LessonDetailScreen'
import CourseListScreen from '../screens/CourseListScreen'
import AICopilotScreen from '../screens/AICopilotScreen'
import MarketScreen from '../screens/MarketScreen'
import SettingsScreen from '../screens/SettingsScreen'
import AboutScreen from '../screens/AboutScreen'
import HelpSupportScreen from '../screens/HelpSupportScreen'

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
      <Stack.Screen 
        name="Market" 
        component={MarketScreen}
        options={{ title: 'Mercado Global', headerStyle: { backgroundColor: '#6366f1' }, headerTintColor: '#fff' }}
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
      <Stack.Screen 
        name="CourseList" 
        component={CourseListScreen}
        options={{ title: 'Explorar Cursos', headerStyle: { backgroundColor: '#6366f1' }, headerTintColor: '#fff' }}
      />
    </Stack.Navigator>
  )
}

function PersonalStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="PersonalMain"
        component={PersonalFinanceScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OrcamentoPrincipios"
        component={OrcamentoPrincipiosScreen}
        options={{
          title: 'Tirar dinheiro do orçamento',
          headerStyle: { backgroundColor: '#6366f1' },
          headerTintColor: '#fff',
        }}
      />
      <Stack.Screen
        name="TirarDinheiroOrcamento"
        component={TirarDinheiroOrcamentoScreen}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  )
}

function ProfileStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="ProfileMain" 
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Configurações', headerStyle: { backgroundColor: '#6366f1' }, headerTintColor: '#fff' }}
      />
      <Stack.Screen 
        name="About" 
        component={AboutScreen}
        options={{ title: 'Sobre o Zenda', headerStyle: { backgroundColor: '#6366f1' }, headerTintColor: '#fff' }}
      />
      <Stack.Screen 
        name="HelpSupport" 
        component={HelpSupportScreen}
        options={{ title: 'Ajuda e Suporte', headerStyle: { backgroundColor: '#6366f1' }, headerTintColor: '#fff' }}
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
        component={PersonalStack}
        options={{ title: 'Pessoal', headerShown: false }}
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
        component={ProfileStack}
        options={{ title: 'Perfil', headerShown: false }}
      />
    </Tab.Navigator>
  )
}

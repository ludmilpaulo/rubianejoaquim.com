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
import CourseProgressScreen from '../screens/CourseProgressScreen'
import LessonDetailScreen from '../screens/LessonDetailScreen'
import LessonQuizScreen from '../screens/LessonQuizScreen'
import CourseListScreen from '../screens/CourseListScreen'
import AICopilotScreen from '../screens/AICopilotScreen'
import MarketScreen from '../screens/MarketScreen'
import SettingsScreen from '../screens/SettingsScreen'
import AboutScreen from '../screens/AboutScreen'
import HelpSupportScreen from '../screens/HelpSupportScreen'
import { useI18n } from '../contexts/I18nContext'
import { colors } from '../theme'
import HealthHistoryScreen from '../screens/HealthHistoryScreen'
import AnalyticsScreen from '../screens/AnalyticsScreen'
import FamilyFinanceScreen from '../screens/FamilyFinanceScreen'
import ReceiptScannerScreen from '../screens/ReceiptScannerScreen'

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
        options={{ title: 'Mercado Global', headerStyle: { backgroundColor: colors.brand.primary }, headerTintColor: '#fff' }}
      />
      <Stack.Screen name="HealthHistory" component={HealthHistoryScreen} options={{ title: 'Saúde financeira', headerStyle: { backgroundColor: colors.brand.primary }, headerTintColor: '#fff' }} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Analytics', headerStyle: { backgroundColor: colors.brand.ai }, headerTintColor: '#fff' }} />
      <Stack.Screen name="FamilyFinance" component={FamilyFinanceScreen} options={{ title: 'Família', headerStyle: { backgroundColor: colors.brand.accent }, headerTintColor: '#fff' }} />
      <Stack.Screen name="ReceiptScanner" component={ReceiptScannerScreen} options={{ title: 'Recibos', headerStyle: { backgroundColor: colors.brand.secondary }, headerTintColor: '#fff' }} />
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
        name="CourseProgress" 
        component={CourseProgressScreen}
        options={{ title: 'Progresso', headerStyle: { backgroundColor: '#6366f1' }, headerTintColor: '#fff' }}
      />
      <Stack.Screen 
        name="LessonDetail" 
        component={LessonDetailScreen}
        options={{ title: 'Aula', headerStyle: { backgroundColor: '#6366f1' }, headerTintColor: '#fff' }}
      />
      <Stack.Screen 
        name="LessonQuiz" 
        component={LessonQuizScreen}
        options={{ title: 'Quiz', headerStyle: { backgroundColor: '#6366f1' }, headerTintColor: '#fff' }}
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
  const { t } = useI18n()

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
        tabBarActiveTintColor: colors.brand.primary,
        tabBarInactiveTintColor: colors.text.muted,
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.brand.primary,
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
        options={{ title: t('home.zendaTitle'), headerShown: false }}
      />
      <Tab.Screen 
        name="Personal" 
        component={PersonalStack}
        options={{ title: t('tabs.personal'), headerShown: false }}
      />
      <Tab.Screen 
        name="Business" 
        component={BusinessFinanceScreen}
        options={{ title: t('tabs.business') }}
      />
      <Tab.Screen 
        name="Education" 
        component={EducationStack}
        options={{ title: t('tabs.education'), headerShown: false }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStack}
        options={{ title: t('tabs.profile'), headerShown: false }}
      />
    </Tab.Navigator>
  )
}

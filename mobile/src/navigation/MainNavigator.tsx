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
  const { t } = useI18n()
  const headerStyle = { backgroundColor: '#6366f1' as const }
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
        options={{ title: t('navigation.todoList'), headerStyle, headerTintColor: '#fff' }}
      />
      <Stack.Screen 
        name="Targets" 
        component={TargetsScreen}
        options={{ title: t('navigation.targets'), headerStyle, headerTintColor: '#fff' }}
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{ title: t('navigation.notifications'), headerStyle, headerTintColor: '#fff' }}
      />
      <Stack.Screen 
        name="AICopilot" 
        component={AICopilotScreen}
        options={{ title: t('navigation.aiCopilot'), headerStyle: { backgroundColor: '#8b5cf6' }, headerTintColor: '#fff' }}
      />
      <Stack.Screen 
        name="Market" 
        component={MarketScreen}
        options={{ title: t('navigation.market'), headerStyle: { backgroundColor: colors.brand.primary }, headerTintColor: '#fff' }}
      />
      <Stack.Screen name="HealthHistory" component={HealthHistoryScreen} options={{ title: t('navigation.healthHistory'), headerStyle: { backgroundColor: colors.brand.primary }, headerTintColor: '#fff' }} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ title: t('navigation.analytics'), headerStyle: { backgroundColor: colors.brand.ai }, headerTintColor: '#fff' }} />
      <Stack.Screen name="FamilyFinance" component={FamilyFinanceScreen} options={{ title: t('navigation.family'), headerStyle: { backgroundColor: colors.brand.accent }, headerTintColor: '#fff' }} />
      <Stack.Screen name="ReceiptScanner" component={ReceiptScannerScreen} options={{ title: t('navigation.receipts'), headerStyle: { backgroundColor: colors.brand.secondary }, headerTintColor: '#fff' }} />
    </Stack.Navigator>
  )
}

function EducationStack() {
  const { t } = useI18n()
  const headerStyle = { backgroundColor: '#6366f1' as const }
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
        options={{ title: t('navigation.courseLessons'), headerStyle, headerTintColor: '#fff' }}
      />
      <Stack.Screen 
        name="CourseProgress" 
        component={CourseProgressScreen}
        options={{ title: t('navigation.progress'), headerStyle, headerTintColor: '#fff' }}
      />
      <Stack.Screen 
        name="LessonDetail" 
        component={LessonDetailScreen}
        options={{ title: t('navigation.lesson'), headerStyle, headerTintColor: '#fff' }}
      />
      <Stack.Screen 
        name="LessonQuiz" 
        component={LessonQuizScreen}
        options={{ title: t('navigation.quiz'), headerStyle, headerTintColor: '#fff' }}
      />
      <Stack.Screen 
        name="CourseList" 
        component={CourseListScreen}
        options={{ title: t('navigation.exploreCourses'), headerStyle, headerTintColor: '#fff' }}
      />
    </Stack.Navigator>
  )
}

function PersonalStack() {
  const { t } = useI18n()
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
          title: t('navigation.budgetPrinciples'),
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
  const { t } = useI18n()
  const headerStyle = { backgroundColor: '#6366f1' as const }
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
        options={{ title: t('navigation.settings'), headerStyle, headerTintColor: '#fff' }}
      />
      <Stack.Screen 
        name="About" 
        component={AboutScreen}
        options={{ title: t('navigation.about'), headerStyle, headerTintColor: '#fff' }}
      />
      <Stack.Screen 
        name="HelpSupport" 
        component={HelpSupportScreen}
        options={{ title: t('navigation.help'), headerStyle, headerTintColor: '#fff' }}
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
        options={{ title: t('home.zendaTitle'), headerShown: false, tabBarButtonTestID: 'tab-home' }}
      />
      <Tab.Screen 
        name="Personal" 
        component={PersonalStack}
        options={{ title: t('tabs.personal'), headerShown: false, tabBarButtonTestID: 'tab-personal' }}
      />
      <Tab.Screen 
        name="Business" 
        component={BusinessFinanceScreen}
        options={{ title: t('tabs.business'), tabBarButtonTestID: 'tab-business' }}
      />
      <Tab.Screen 
        name="Education" 
        component={EducationStack}
        options={{ title: t('tabs.education'), headerShown: false, tabBarButtonTestID: 'tab-education' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStack}
        options={{ title: t('tabs.profile'), headerShown: false, tabBarButtonTestID: 'tab-profile' }}
      />
    </Tab.Navigator>
  )
}

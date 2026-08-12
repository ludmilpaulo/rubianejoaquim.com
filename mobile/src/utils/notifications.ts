/**
 * Local push notifications with device vibration for:
 * - Daily tasks (tarefas) not completed on time / overdue
 * - Personal finance goals (metas financeiras pessoais) deadlines
 * 
 * Note: This app uses LOCAL notifications (scheduled notifications) which work fine in Expo Go.
 * The warning about remote push notifications is expected - we don't use remote notifications.
 * Local notifications (scheduleNotificationAsync) work in both Expo Go and development builds.
 */
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { NotificationPrefs } from '../types'

const NOTIFICATIONS_ENABLED_KEY = 'notificationsEnabled'
const NOTIFICATION_PREFS_KEY = 'ZENDA_NOTIFICATION_PREFS'

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  enabled: true,
  budget_warnings: true,
  budget_exceeded: true,
  debt_reminders: true,
  savings_reminders: true,
  monthly_summary: true,
  goal_reminders: true,
}

// Ensure notifications are shown when app is in foreground and trigger vibration/sound
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
})

/**
 * Request notification permissions and set up Android channel with vibration.
 * Call once when app loads (e.g. after user is logged in).
 */
export async function setupNotifications(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync()
  let final = existing
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    final = status
  }
  if (final !== 'granted') {
    return false
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Lembretes (Tarefas e Metas)',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      enableVibrate: true,
      enableLights: true,
      lightColor: '#3534C9', // Zenda primary
      sound: 'default',
    })
    await Notifications.setNotificationChannelAsync('budget_alerts', {
      name: 'Alertas de orçamento',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 200, 400],
      enableVibrate: true,
      enableLights: true,
      lightColor: '#f59e0b',
      sound: 'default',
    })
  }
  return true
}

/**
 * Check if user has notifications enabled in Settings (persisted).
 */
export async function areNotificationsEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY)
    return value === null || value === 'true'
  } catch {
    return true
  }
}

/**
 * Persist notifications enabled preference (called from Settings screen).
 */
export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, enabled ? 'true' : 'false')
}

export async function getNotificationPrefs(): Promise<NotificationPrefs> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY)
    if (!raw) return { ...DEFAULT_NOTIFICATION_PREFS }
    const parsed = JSON.parse(raw) as NotificationPrefs
    return { ...DEFAULT_NOTIFICATION_PREFS, ...parsed }
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFS }
  }
}

export async function setNotificationPrefs(prefs: NotificationPrefs): Promise<void> {
  await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs))
}

export type BudgetAlertNotificationType =
  | 'budget_warning'
  | 'budget_exceeded'
  | 'budget_exceeded_urgent'

/**
 * Present a budget alert local notification respecting master switch and budget prefs.
 */
export async function presentBudgetAlertNotification(
  title: string,
  body: string,
  type: BudgetAlertNotificationType = 'budget_warning',
  data?: Record<string, unknown>,
): Promise<string | null> {
  const masterEnabled = await areNotificationsEnabled()
  if (!masterEnabled) return null

  const prefs = await getNotificationPrefs()
  if (prefs.enabled === false) return null

  if (type === 'budget_warning' && prefs.budget_warnings === false) return null
  if (
    (type === 'budget_exceeded' || type === 'budget_exceeded_urgent') &&
    prefs.budget_exceeded === false
  ) {
    return null
  }

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { screen: 'MonthlyPlan', ...data },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: { channelId: 'budget_alerts' },
    })
    return id
  } catch (e) {
    if (__DEV__) console.warn('presentBudgetAlertNotification failed:', e)
    return null
  }
}

/**
 * Present a local notification immediately with vibration.
 * Uses channel 'reminders' on Android for vibration.
 */
export async function presentLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<string | null> {
  const enabled = await areNotificationsEnabled()
  if (!enabled) return null

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data ?? {},
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: { channelId: 'reminders' }, // show immediately, use channel on Android
    })
    return id
  } catch (e) {
    if (__DEV__) console.warn('presentLocalNotification failed:', e)
    return null
  }
}

/**
 * Notify user about overdue or due-today tasks that are not completed.
 */
export async function notifyOverdueOrDueTasks(
  overdueCount: number,
  dueTodayCount: number,
  firstTaskTitle?: string
): Promise<void> {
  if (overdueCount === 0 && dueTodayCount === 0) return
  const enabled = await areNotificationsEnabled()
  if (!enabled) return

  let title: string
  let body: string
  if (overdueCount > 0 && dueTodayCount > 0) {
    title = 'Tarefas atrasadas e para hoje'
    body =
      firstTaskTitle != null
        ? `${overdueCount} atrasada(s), ${dueTodayCount} para hoje. Ex.: ${firstTaskTitle}`
        : `Tem ${overdueCount} tarefa(s) atrasada(s) e ${dueTodayCount} para hoje. Toque para ver.`
  } else if (overdueCount > 0) {
    title = 'Tarefas atrasadas'
    body =
      firstTaskTitle != null
        ? `${overdueCount} tarefa(s) não concluída(s) no prazo. Ex.: ${firstTaskTitle}`
        : `Tem ${overdueCount} tarefa(s) atrasada(s). Toque para concluir.`
  } else {
    title = 'Tarefas para hoje'
    body =
      firstTaskTitle != null
        ? `${dueTodayCount} tarefa(s) para hoje. Ex.: ${firstTaskTitle}`
        : `Tem ${dueTodayCount} tarefa(s) para hoje. Não se esqueça!`
  }
  await presentLocalNotification(title, body, { screen: 'ToDoList' })
}

/**
 * Notify user about personal finance goals with deadline soon or passed.
 */
export async function notifyFinanceGoalsReminder(
  goals: Array<{ title: string; target_date: string; daysRemaining: number }>
): Promise<void> {
  if (goals.length === 0) return
  const enabled = await areNotificationsEnabled()
  if (!enabled) return

  const first = goals[0]
  const title =
    goals.length === 1
      ? 'Meta financeira: prazo próximo'
      : 'Metas financeiras: prazos próximos'
  const body =
    first.daysRemaining <= 0
      ? `A meta "${first.title}" está em atraso. Toque para atualizar.`
      : goals.length === 1
        ? `A meta "${first.title}" termina em ${first.daysRemaining} dia(s). Toque para ver.`
        : `${goals.length} meta(s) com prazo próximo. Ex.: ${first.title}`
  await presentLocalNotification(title, body, { screen: 'Personal', tab: 'goals' })
}

import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { logger } from './logger'
import { areNotificationsEnabled, getNotificationPrefs, setupNotifications } from './notifications'

const GOAL_PREFIX = 'zenda-goal-'

export interface GoalReminderInput {
  id: number
  title: string
  status?: string
  target_date?: string | null
  reminder_enabled?: boolean
  reminder_time?: string | null
  reminder_frequency?: 'once' | 'daily' | 'weekly' | string
  reminder_offsets_minutes?: number[] | null
}

function parseTimeParts(raw: string | null | undefined): { hour: number; minute: number } | null {
  if (!raw) return null
  const parts = raw.split(':')
  const hour = Number(parts[0])
  const minute = Number(parts[1] ?? 0)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null
  return { hour, minute }
}

function fireDateForOffset(
  targetDate: string,
  hour: number,
  minute: number,
  offsetMinutes: number,
): Date {
  const fire = new Date(`${targetDate}T00:00:00`)
  fire.setHours(hour, minute, 0, 0)
  fire.setMinutes(fire.getMinutes() - offsetMinutes)
  return fire
}

export async function cancelGoalReminders(goalId: number): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  const prefix = `${GOAL_PREFIX}${goalId}-`
  await Promise.all(
    scheduled
      .filter((item) => item.identifier.startsWith(prefix) || item.identifier === `${GOAL_PREFIX}progress-${goalId}-75` || item.identifier === `${GOAL_PREFIX}progress-${goalId}-100`)
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  )
}

export async function scheduleGoalReminders(goal: GoalReminderInput): Promise<void> {
  await cancelGoalReminders(goal.id)
  if (!goal.reminder_enabled || goal.status === 'cancelled' || goal.status === 'completed') return

  const enabled = await areNotificationsEnabled()
  if (!enabled) return
  const prefs = await getNotificationPrefs()
  if (prefs.enabled === false || prefs.goal_reminders === false) return

  const granted = await setupNotifications()
  if (!granted) return

  const time = parseTimeParts(goal.reminder_time)
  const targetDate = goal.target_date
  if (!time || !targetDate) return

  const offsets = (goal.reminder_offsets_minutes && goal.reminder_offsets_minutes.length
    ? goal.reminder_offsets_minutes
    : [10]
  ).filter((n, i, arr) => arr.indexOf(n) === i)

  const frequency = goal.reminder_frequency || 'once'

  for (const offset of offsets) {
    const identifier = `${GOAL_PREFIX}${goal.id}-${offset}`
    const fire = fireDateForOffset(targetDate, time.hour, time.minute, offset)
    const notifyHour = fire.getHours()
    const notifyMinute = fire.getMinutes()
    const title = 'Zenda Reminder'
    const body =
      offset === 10
        ? `Your "${goal.title}" goal reminder is coming up in 10 minutes.`
        : `Your "${goal.title}" goal reminder is coming up.`

    try {
      if (frequency === 'daily') {
        await Notifications.scheduleNotificationAsync({
          identifier,
          content: {
            title,
            body,
            sound: true,
            data: { screen: 'Personal', tab: 'goals', goalId: goal.id },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: notifyHour,
            minute: notifyMinute,
            channelId: Platform.OS === 'android' ? 'reminders' : undefined,
          },
        })
      } else if (frequency === 'weekly') {
        await Notifications.scheduleNotificationAsync({
          identifier,
          content: {
            title,
            body,
            sound: true,
            data: { screen: 'Personal', tab: 'goals', goalId: goal.id },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: fire.getDay() === 0 ? 1 : fire.getDay() + 1,
            hour: notifyHour,
            minute: notifyMinute,
            channelId: Platform.OS === 'android' ? 'reminders' : undefined,
          },
        })
      } else if (fire.getTime() > Date.now()) {
        await Notifications.scheduleNotificationAsync({
          identifier,
          content: {
            title,
            body,
            sound: true,
            data: { screen: 'Personal', tab: 'goals', goalId: goal.id },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: fire,
            channelId: Platform.OS === 'android' ? 'reminders' : undefined,
          },
        })
      }
    } catch (error) {
      logger.warn('scheduleGoalReminders failed', error)
    }
  }
}

export async function syncGoalReminders(goals: GoalReminderInput[]): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  await Promise.all(
    scheduled
      .filter((item) => item.identifier.startsWith(GOAL_PREFIX))
      .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
  )
  for (const goal of goals) {
    await scheduleGoalReminders(goal)
  }
}

export async function notifyGoalProgressLocal(
  goalTitle: string,
  event: '75' | '100',
): Promise<void> {
  const enabled = await areNotificationsEnabled()
  if (!enabled) return
  const prefs = await getNotificationPrefs()
  if (prefs.goal_reminders === false) return
  const title = event === '100' ? 'Goal reached' : 'Goal progress'
  const body =
    event === '100'
      ? `You've reached your goal "${goalTitle}".`
      : `You're 75% of the way to your savings goal "${goalTitle}".`
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        data: { screen: 'Personal', tab: 'goals' },
      },
      trigger: Platform.OS === 'android'
        ? {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 1,
            channelId: 'reminders',
          }
        : {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 1,
          },
    })
  } catch (error) {
    logger.warn('notifyGoalProgressLocal failed', error)
  }
}

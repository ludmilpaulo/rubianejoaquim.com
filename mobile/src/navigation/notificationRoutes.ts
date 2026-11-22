import type { NavigationProp, ParamListBase } from '@react-navigation/native'

export interface NotificationTarget {
  action_url?: string
  related_object_type?: string
}

function goTab(navigation: NavigationProp<ParamListBase>, tab: string, screen?: string) {
  const names = navigation.getState()?.routeNames ?? []
  const parent = names.includes(tab) ? navigation : navigation.getParent()
  if (!parent) return
  if (screen) parent.navigate(tab, { screen })
  else parent.navigate(tab)
}

/** Open the screen that matches a notification action url or related object. */
export function openNotificationTarget(
  navigation: NavigationProp<ParamListBase>,
  notification: NotificationTarget,
) {
  const url = (notification.action_url || '').toLowerCase()
  const kind = (notification.related_object_type || '').toLowerCase()
  const stackNames = navigation.getState()?.routeNames ?? []

  const openStack = (name: string) => {
    if (stackNames.includes(name)) navigation.navigate(name)
  }

  if (url.includes('personal/plan') || kind === 'monthly_plan') {
    goTab(navigation, 'Personal', 'MonthlyPlan')
    return
  }
  if (url.includes('budget') || kind === 'budget' || kind === 'goal' || url.includes('/finance/goals')) {
    goTab(navigation, 'Personal')
    return
  }
  if (url.includes('/tasks') || kind === 'task') {
    openStack('ToDoList')
    return
  }
  if (kind === 'target' || url.includes('target')) {
    openStack('Targets')
    return
  }
  if (kind === 'finance_space' || url.includes('family')) {
    openStack('FamilyFinance')
    return
  }
  if (url.includes('receipt') || kind === 'receipt') {
    openStack('ReceiptScanner')
    return
  }
  if (kind === 'subscription' || url.includes('profile')) {
    goTab(navigation, 'Profile')
  }
}

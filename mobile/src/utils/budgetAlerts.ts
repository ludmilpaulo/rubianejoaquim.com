import type { BudgetAlert } from '../types/api'
import { presentBudgetAlertNotification } from './notifications'

export async function handleBudgetAlerts(alerts: BudgetAlert[] | undefined): Promise<void> {
  if (!alerts?.length) return
  for (const alert of alerts) {
    const alertType =
      alert.type === 'budget_warning' ||
      alert.type === 'budget_exceeded' ||
      alert.type === 'budget_exceeded_urgent'
        ? alert.type
        : alert.level >= 101
          ? 'budget_exceeded_urgent'
          : alert.level >= 100
            ? 'budget_exceeded'
            : 'budget_warning'
    await presentBudgetAlertNotification(alert.title, alert.message, alertType)
  }
}

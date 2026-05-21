import AsyncStorage from '@react-native-async-storage/async-storage'
import { personalFinanceApi } from '../services/api'

const QUEUE_KEY = 'ZENDA_OFFLINE_EXPENSE_QUEUE'

export interface QueuedExpense {
  id: string
  payload: Record<string, unknown>
  createdAt: string
}

export async function getOfflineQueue(): Promise<QueuedExpense[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export async function queueExpense(payload: Record<string, unknown>): Promise<void> {
  const queue = await getOfflineQueue()
  queue.push({
    id: `${Date.now()}`,
    payload,
    createdAt: new Date().toISOString(),
  })
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export async function flushOfflineQueue(): Promise<number> {
  const queue = await getOfflineQueue()
  if (!queue.length) return 0
  const remaining: QueuedExpense[] = []
  let synced = 0
  for (const item of queue) {
    try {
      await personalFinanceApi.createExpense(item.payload as any)
      synced += 1
    } catch {
      remaining.push(item)
    }
  }
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining))
  return synced
}

export async function getQueueCount(): Promise<number> {
  return (await getOfflineQueue()).length
}

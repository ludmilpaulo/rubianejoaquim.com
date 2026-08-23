import { Platform } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { accessApi } from './api'
import type { CheckoutOptions, SubscriptionPaymentRecord } from '../types'

export async function loadCheckoutOptions(): Promise<CheckoutOptions> {
  const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'web' ? 'web' : 'android'
  return accessApi.getCheckoutOptions(platform)
}

export async function startCardCheckoutAndSync(): Promise<SubscriptionPaymentRecord> {
  const session = await accessApi.createCardPaymentSession()
  await WebBrowser.openBrowserAsync(session.paylink_url)
  return accessApi.syncSubscriptionPayment({ id: session.id }) as Promise<SubscriptionPaymentRecord>
}

export async function startCommerceCardCheckoutAndSync(payload: {
  product_type: 'course' | 'mentorship'
  product_id: number
  objective?: string
  availability?: string
  contact?: string
}): Promise<{ status: string; product_type?: string }> {
  const session = await accessApi.createCommerceCardSession(payload)
  await WebBrowser.openBrowserAsync(session.paylink_url)
  return accessApi.syncCommercePayment({ id: session.id }) as Promise<{ status: string; product_type?: string }>
}

export function unwrapPaymentList(data: unknown): SubscriptionPaymentRecord[] {
  if (Array.isArray(data)) return data as SubscriptionPaymentRecord[]
  if (data && typeof data === 'object' && 'results' in data) {
    const results = (data as { results?: SubscriptionPaymentRecord[] }).results
    return results ?? []
  }
  return []
}

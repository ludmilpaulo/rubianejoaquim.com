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

export function unwrapPaymentList(data: unknown): SubscriptionPaymentRecord[] {
  if (Array.isArray(data)) return data as SubscriptionPaymentRecord[]
  if (data && typeof data === 'object' && 'results' in data) {
    const results = (data as { results?: SubscriptionPaymentRecord[] }).results
    return results ?? []
  }
  return []
}

import { Platform } from 'react-native'
import Constants, { ExecutionEnvironment } from 'expo-constants'
import { logger } from '../utils/logger'
import type { IapListedProduct } from './iapShared'

export {
  SUBSCRIPTION_PRODUCT_ID,
  PRIVACY_POLICY_URL,
  TERMS_OF_USE_URL,
  type IapListedProduct,
} from './iapShared'

type IapNative = {
  getIapProducts: (productIds: string[]) => Promise<IapListedProduct[]>
  warmupIap: () => Promise<void>
  purchaseIapProduct: (productId: string) => Promise<void>
  disconnectIap: () => Promise<void>
}

let nativeModule: IapNative | null | undefined

function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient
}

function loadNative(): IapNative | null {
  if (isExpoGo()) return null
  if (nativeModule !== undefined) return nativeModule
  try {
    nativeModule = require('./iapNative') as IapNative
    return nativeModule
  } catch (error) {
    logger.warn('IAP native module unavailable:', error)
    nativeModule = null
    return null
  }
}

export function courseProductId(courseId: number): string {
  return `course_${courseId}`
}

export function mentorshipProductId(packageId: number): string {
  return `mentorship_${packageId}`
}

export function isIapSupported(): boolean {
  return Platform.OS === 'ios' && !isExpoGo() && loadNative() !== null
}

export async function getIapProducts(productIds: string[]): Promise<IapListedProduct[]> {
  const native = loadNative()
  if (!native) return []
  return native.getIapProducts(productIds)
}

export async function warmupIap(): Promise<void> {
  if (!isIapSupported()) return
  await loadNative()?.warmupIap()
}

export async function purchaseIapProduct(productId: string): Promise<void> {
  const native = loadNative()
  if (!native) {
    throw new Error('In-App Purchases are not available on this device')
  }
  await native.purchaseIapProduct(productId)
}

export async function disconnectIap(): Promise<void> {
  await loadNative()?.disconnectIap()
}

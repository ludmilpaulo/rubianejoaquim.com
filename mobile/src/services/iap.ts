import { Platform } from 'react-native'
import {
  endConnection,
  fetchProducts,
  finishTransaction,
  getReceiptIOS,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  ErrorCode,
  type ProductOrSubscription,
  type Purchase,
  type PurchaseError,
} from 'react-native-iap'
import { iapApi } from './api'
import { logger } from '../utils/logger'

export const SUBSCRIPTION_PRODUCT_ID = 'zenda_monthly'

export function courseProductId(courseId: number): string {
  return `course_${courseId}`
}

export function mentorshipProductId(packageId: number): string {
  return `mentorship_${packageId}`
}

let connectionReady = false
let initPromise: Promise<boolean> | null = null

export function isIapSupported(): boolean {
  return Platform.OS === 'ios'
}

async function ensureConnection(): Promise<boolean> {
  if (!isIapSupported()) return false
  if (connectionReady) return true
  if (initPromise) return initPromise

  initPromise = (async () => {
    try {
      await initConnection()
      connectionReady = true
      return true
    } catch (error) {
      logger.warn('IAP init failed:', error)
      initPromise = null
      return false
    }
  })()

  return initPromise
}

export async function getIapProducts(productIds: string[]): Promise<ProductOrSubscription[]> {
  const ready = await ensureConnection()
  if (!ready || productIds.length === 0) return []

  try {
    const result = await fetchProducts({ skus: productIds, type: 'all' })
    return result ?? []
  } catch (error) {
    logger.warn('IAP fetchProducts failed:', error)
    return []
  }
}

async function verifyPurchase(productId: string): Promise<void> {
  if (!isIapSupported()) {
    throw new Error('IAP is only available on iOS')
  }

  const receipt = await getReceiptIOS()
  if (!receipt) {
    throw new Error('Could not read App Store receipt')
  }

  await iapApi.verifyApplePurchase(receipt, productId)
}

function waitForPurchase(productId: string): Promise<Purchase> {
  return new Promise((resolve, reject) => {
    const updateSub = purchaseUpdatedListener(async (purchase) => {
      cleanup()
      try {
        if (purchase.productId !== productId) {
          reject(new Error('Unexpected product purchased'))
          return
        }
        await verifyPurchase(productId)
        await finishTransaction({ purchase, isConsumable: productId.startsWith('course_') || productId.startsWith('mentorship_') })
        resolve(purchase)
      } catch (error) {
        reject(error)
      }
    })

    const errorSub = purchaseErrorListener((error: PurchaseError) => {
      if (error.code === ErrorCode.UserCancelled) {
        cleanup()
        reject(new Error('Purchase cancelled'))
        return
      }
      cleanup()
      reject(new Error(error.message || 'Purchase failed'))
    })

    const cleanup = () => {
      updateSub.remove()
      errorSub.remove()
    }
  })
}

export async function purchaseIapProduct(productId: string): Promise<void> {
  const ready = await ensureConnection()
  if (!ready) {
    throw new Error('In-App Purchases are not available on this device')
  }

  const purchasePromise = waitForPurchase(productId)

  await requestPurchase({
    request: {
      apple: { sku: productId },
      google: { skus: [productId] },
    },
    type: productId === SUBSCRIPTION_PRODUCT_ID ? 'subs' : 'in-app',
  })

  await purchasePromise
}

export async function disconnectIap(): Promise<void> {
  if (!connectionReady) return
  try {
    await endConnection()
  } catch {
    // ignore
  } finally {
    connectionReady = false
    initPromise = null
  }
}

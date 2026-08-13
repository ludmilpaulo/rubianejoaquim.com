import {
  endConnection,
  fetchProducts,
  finishTransaction,
  getReceiptDataIOS,
  getReceiptIOS,
  getTransactionJwsIOS,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  requestReceiptRefreshIOS,
  ErrorCode,
  type ProductOrSubscription,
  type Purchase,
  type PurchaseError,
} from 'react-native-iap'
import { iapApi } from './api'
import { logger } from '../utils/logger'
import { SUBSCRIPTION_PRODUCT_ID, type IapListedProduct } from './iapShared'

let connectionReady = false
let initPromise: Promise<boolean> | null = null

async function ensureConnection(): Promise<boolean> {
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

export async function getIapProducts(productIds: string[]): Promise<IapListedProduct[]> {
  const ready = await ensureConnection()
  if (!ready || productIds.length === 0) return []

  try {
    const result = await fetchProducts({ skus: productIds, type: 'all' })
    return (result ?? []).map((product: ProductOrSubscription) => ({
      id: product.id,
      displayPrice: product.displayPrice,
      title: product.title,
    }))
  } catch (error) {
    logger.warn('IAP fetchProducts failed:', error)
    return []
  }
}

async function ensureProductAvailable(productId: string): Promise<void> {
  try {
    const type = productId === SUBSCRIPTION_PRODUCT_ID ? 'subs' : 'in-app'
    const products = await fetchProducts({ skus: [productId], type })
    if (!products?.length) {
      logger.warn(`IAP product not prefetched: ${productId}`)
    }
  } catch (error) {
    logger.warn('IAP prefetch failed, continuing with purchase:', error)
  }
}

async function readReceiptData(purchase: Purchase, productId: string): Promise<string> {
  const candidates: Array<() => Promise<string | null | undefined>> = [
    async () => {
      const jws = purchase.purchaseToken
      if (jws?.startsWith('eyJ')) return jws
      return null
    },
    async () => getTransactionJwsIOS(productId),
    async () => requestReceiptRefreshIOS(),
    async () => getReceiptDataIOS(),
    async () => getReceiptIOS(),
    async () => purchase.purchaseToken || null,
  ]

  for (const read of candidates) {
    try {
      const data = await read()
      if (data && data.length > 0) {
        return data
      }
    } catch (error) {
      logger.warn('IAP receipt source failed:', error)
    }
  }

  throw new Error('Could not read App Store receipt')
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function verifyPurchase(purchase: Purchase, productId: string): Promise<void> {
  const receipt = await readReceiptData(purchase, productId)
  const transactionId = purchase.transactionId ?? undefined
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await iapApi.verifyApplePurchase(receipt, productId, transactionId)
      return
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Purchase verification failed')
      logger.warn(`IAP verify attempt ${attempt} failed:`, lastError.message)
      if (attempt < 3) {
        await sleep(1500 * attempt)
      }
    }
  }

  throw lastError ?? new Error('Purchase verification failed')
}

export async function warmupIap(): Promise<void> {
  const ready = await ensureConnection()
  if (!ready) return
  await getIapProducts([SUBSCRIPTION_PRODUCT_ID])
}

function waitForPurchase(productId: string): {
  promise: Promise<Purchase>
  cancel: () => void
} {
  let updateSub: { remove: () => void } | null = null
  let errorSub: { remove: () => void } | null = null

  const cleanup = () => {
    updateSub?.remove()
    errorSub?.remove()
    updateSub = null
    errorSub = null
  }

  const promise = new Promise<Purchase>((resolve, reject) => {
    updateSub = purchaseUpdatedListener(async (purchase) => {
      cleanup()
      try {
        if (purchase.productId !== productId) {
          reject(new Error('Unexpected product purchased'))
          return
        }
        await verifyPurchase(purchase, productId)
        const isConsumable =
          productId.startsWith('course_') || productId.startsWith('mentorship_')
        await finishTransaction({ purchase, isConsumable })
        resolve(purchase)
      } catch (error) {
        reject(error)
      }
    })

    errorSub = purchaseErrorListener((error: PurchaseError) => {
      if (error.code === ErrorCode.UserCancelled) {
        cleanup()
        reject(new Error('Purchase cancelled'))
        return
      }
      cleanup()
      reject(new Error(error.message || 'Purchase failed'))
    })
  })

  return { promise, cancel: cleanup }
}

export async function purchaseIapProduct(productId: string): Promise<void> {
  const ready = await ensureConnection()
  if (!ready) {
    throw new Error('In-App Purchases are not available on this device')
  }

  await ensureProductAvailable(productId)

  const { promise, cancel } = waitForPurchase(productId)

  try {
    await requestPurchase({
      request: {
        apple: { sku: productId },
        google: { skus: [productId] },
      },
      type: productId === SUBSCRIPTION_PRODUCT_ID ? 'subs' : 'in-app',
    })
  } catch (error) {
    cancel()
    const message = error instanceof Error ? error.message : 'Purchase failed'
    throw new Error(message)
  }

  await promise
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

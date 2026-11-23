import React from 'react'
import { Platform, StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'
import type { CheckoutOptions } from '../types'
import { useCurrency } from '../contexts/CurrencyContext'
import { useI18n } from '../contexts/I18nContext'

type Props = {
  checkout: CheckoutOptions | null
  /** Store-localized price (Play/App Store). Prefer this over backend charge currency. */
  storeDisplayPrice?: string | null
}

/**
 * Subscription payment cart — one currency only (same as the offer).
 * On Android, prefer Play Billing displayPrice so the offer and cart match.
 */
export default function CheckoutPriceSummary({ checkout, storeDisplayPrice }: Props) {
  const { formatOriginal } = useCurrency()
  const { t, tw } = useI18n()

  const storePrice = storeDisplayPrice?.trim() || null
  if (storePrice) {
    return (
      <View style={styles.wrap}>
        <Text variant="labelLarge" style={styles.title}>
          {t('access.cardPriceTitle')}
        </Text>
        <Text variant="headlineSmall" style={styles.charge}>
          {storePrice}
          {t('access.perMonth')}
        </Text>
        <Text variant="bodySmall" style={styles.note}>
          {tw('access.cardPriceNote', { currency: storePrice, price: storePrice })}
        </Text>
      </View>
    )
  }

  // Android without a store price: omit numeric cart to avoid ZAR/AOA vs Play mismatch.
  if (Platform.OS === 'android') return null
  if (!checkout?.charge) return null

  const { amount, currency } = checkout.charge
  const priceLabel = formatOriginal(Number(amount), currency)

  return (
    <View style={styles.wrap}>
      <Text variant="labelLarge" style={styles.title}>
        {t('access.cardPriceTitle')}
      </Text>
      <Text variant="headlineSmall" style={styles.charge}>
        {priceLabel}
        {t('access.perMonth')}
      </Text>
      <Text variant="bodySmall" style={styles.note}>
        {tw('access.cardPriceNote', { currency, price: priceLabel })}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f0f4ff',
  },
  title: {
    color: '#211F78',
    marginBottom: 4,
  },
  charge: {
    color: '#111827',
    fontWeight: '700',
  },
  note: {
    color: '#6b7280',
    marginTop: 6,
  },
})

import React from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'
import type { CheckoutOptions } from '../types'
import { useCurrency } from '../contexts/CurrencyContext'
import { useI18n } from '../contexts/I18nContext'

type Props = {
  checkout: CheckoutOptions | null
}

export default function CheckoutPriceSummary({ checkout }: Props) {
  const { formatOriginal } = useCurrency()
  const { t, tw } = useI18n()

  if (!checkout?.charge) return null

  const { amount, currency } = checkout.charge
  const estimate = checkout.estimate

  return (
    <View style={styles.wrap}>
      <Text variant="labelLarge" style={styles.title}>
        {t('access.cardPriceTitle')}
      </Text>
      <Text variant="headlineSmall" style={styles.charge}>
        {formatOriginal(Number(amount), currency)}
        {t('access.perMonth')}
      </Text>
      {estimate ? (
        <Text variant="bodySmall" style={styles.estimate}>
          {tw('access.cardPriceEstimate', {
            amount: formatOriginal(Number(estimate.amount), estimate.currency),
          })}
        </Text>
      ) : null}
      <Text variant="bodySmall" style={styles.note}>
        {t('access.cardPriceNote')}
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
  estimate: {
    color: '#4b5563',
    marginTop: 4,
  },
  note: {
    color: '#6b7280',
    marginTop: 6,
  },
})

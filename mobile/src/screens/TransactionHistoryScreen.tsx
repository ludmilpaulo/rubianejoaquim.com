import React, { useCallback, useEffect, useState } from 'react'
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native'
import { Text } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import { transactionHistoryApi } from '../services/api'
import { useI18n } from '../contexts/I18nContext'
import { useCurrency } from '../contexts/CurrencyContext'
import ZendaLoader from '../components/ui/ZendaLoader'
import EmptyState from '../components/ui/EmptyState'
import ErrorState from '../components/ui/ErrorState'
import ZendaCard from '../components/ui/ZendaCard'
import { colors, spacing, typography } from '../theme'
import type { HomeStackParamList } from '../navigation/types'

type Nav = StackNavigationProp<HomeStackParamList, 'TransactionHistory'>

interface HistoryRow {
  id: number
  merchant?: string | null
  description?: string | null
  date?: string | null
  original_amount?: string | null
  original_currency?: string | null
  converted_amount?: string | null
  display_currency?: string | null
  exchange_rate?: string | null
  category_name?: string | null
  receipt_id?: number | null
}

export default function TransactionHistoryScreen() {
  const { t } = useI18n()
  const navigation = useNavigation<Nav>()
  const { formatDual } = useCurrency()
  const [rows, setRows] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    try {
      setError(false)
      const data = await transactionHistoryApi.list()
      setRows((data.results || []) as HistoryRow[])
    } catch {
      setError(true)
      setRows([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <ZendaLoader message={t('transactionHistory.loading')} />
  if (error) {
    return (
      <ErrorState
        title={t('common.error')}
        retryLabel={t('common.retry')}
        onRetry={load}
      />
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} />}
        ListEmptyComponent={
          <EmptyState title={t('transactionHistory.emptyTitle')} description={t('transactionHistory.emptyBody')} />
        }
        renderItem={({ item }) => {
          const dual = formatDual(Number(item.original_amount || 0), item.original_currency || 'AOA', item.converted_amount)
          return (
            <ZendaCard style={styles.card}>
              <Text style={styles.merchant}>{item.merchant || item.description}</Text>
              <Text style={styles.date}>{item.date}</Text>
              <Text style={styles.amount}>
                {dual.primary}{dual.secondary ? ` · ${dual.secondary}` : ''}
              </Text>
              {item.exchange_rate ? (
                <Text style={styles.converted}>
                  {t('transactionHistory.rate')}: {item.exchange_rate}
                </Text>
              ) : null}
              {item.category_name ? (
                <Text style={styles.meta}>{item.category_name}</Text>
              ) : null}
              {item.receipt_id ? (
                <Text
                  style={styles.link}
                  onPress={() => navigation.navigate('ReviewReceipt', { receiptId: item.receipt_id! })}
                >
                  {t('transactionHistory.viewReceipt')}
                </Text>
              ) : null}
            </ZendaCard>
          )
        }}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background.default },
  card: { marginHorizontal: spacing.md, marginBottom: spacing.sm },
  merchant: { ...typography.h3 },
  date: { ...typography.caption, color: colors.text.secondary },
  amount: { ...typography.body, marginTop: spacing.xs },
  converted: { ...typography.caption, color: colors.text.secondary },
  meta: { ...typography.caption, marginTop: spacing.xs },
  link: { color: colors.brand.primary, marginTop: spacing.sm },
})

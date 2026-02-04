import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native'
import { Text, Card, Divider } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'

interface CurrencyRate {
  code: string
  name: string
  rate: number
  change: number
  changePercent: number
}

interface MarketIndex {
  name: string
  value: number
  change: number
  changePercent: number
}

export default function MarketScreen() {
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  
  // Mock data - In production, this would come from an API
  const [currencies, setCurrencies] = useState<CurrencyRate[]>([
    { code: 'USD', name: 'Dólar Americano', rate: 830.50, change: 2.30, changePercent: 0.28 },
    { code: 'EUR', name: 'Euro', rate: 905.20, change: -1.50, changePercent: -0.17 },
    { code: 'GBP', name: 'Libra Esterlina', rate: 1050.80, change: 5.20, changePercent: 0.50 },
    { code: 'ZAR', name: 'Rand Sul-Africano', rate: 45.20, change: -0.30, changePercent: -0.66 },
    { code: 'BRL', name: 'Real Brasileiro', rate: 165.40, change: 1.20, changePercent: 0.73 },
  ])

  const [markets, setMarkets] = useState<MarketIndex[]>([
    { name: 'S&P 500', value: 4850.25, change: 15.30, changePercent: 0.32 },
    { name: 'NASDAQ', value: 15230.45, change: -25.60, changePercent: -0.17 },
    { name: 'Dow Jones', value: 37850.20, change: 45.80, changePercent: 0.12 },
    { name: 'FTSE 100', value: 7650.30, change: -12.40, changePercent: -0.16 },
    { name: 'DAX', value: 16850.60, change: 28.90, changePercent: 0.17 },
  ])

  useEffect(() => {
    loadMarketData()
  }, [])

  const loadMarketData = async () => {
    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      // In production, fetch real data from API
      setLastUpdate(new Date())
      setLoading(false)
    }, 1000)
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadMarketData()
    setRefreshing(false)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-AO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-AO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('pt-AO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date)
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return '#10b981'
    if (change < 0) return '#ef4444'
    return '#6b7280'
  }

  const getChangeIcon = (change: number) => {
    if (change > 0) return 'trending-up'
    if (change < 0) return 'trending-down'
    return 'trending-neutral'
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerIconContainer}>
              <MaterialCommunityIcons name="chart-line" size={32} color="#6366f1" />
            </View>
            <View style={styles.headerText}>
              <Text variant="headlineMedium" style={styles.headerTitle}>
                Mercado Global
              </Text>
              <Text variant="bodySmall" style={styles.headerSubtitle}>
                Última atualização: {formatTime(lastUpdate)}
              </Text>
            </View>
          </View>
          {loading && <ActivityIndicator size="small" color="#6366f1" />}
        </View>

        {/* Currency Exchange Section */}
        <Card style={styles.sectionCard} mode="elevated">
          <Card.Content style={styles.cardContent}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <MaterialCommunityIcons name="swap-horizontal" size={24} color="#6366f1" />
              </View>
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Câmbio Diário
              </Text>
            </View>
            <Text variant="bodySmall" style={styles.sectionSubtitle}>
              Taxas de câmbio em relação ao Kwanza (AOA)
            </Text>
            
            <View style={styles.currencyList}>
              {currencies.map((currency, index) => (
                <View key={currency.code}>
                  <View style={styles.currencyRow}>
                    <View style={styles.currencyInfo}>
                      <View style={styles.currencyCodeContainer}>
                        <Text style={styles.currencyCode}>{currency.code}</Text>
                      </View>
                      <View style={styles.currencyDetails}>
                        <Text variant="bodyLarge" style={styles.currencyName}>
                          {currency.name}
                        </Text>
                        <Text variant="bodySmall" style={styles.currencyRate}>
                          1 {currency.code} = {formatCurrency(currency.rate)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.currencyChange}>
                      <View style={[
                        styles.changeContainer,
                        { backgroundColor: getChangeColor(currency.change) + '15' }
                      ]}>
                        <MaterialCommunityIcons
                          name={getChangeIcon(currency.change)}
                          size={16}
                          color={getChangeColor(currency.change)}
                        />
                        <Text style={[
                          styles.changeText,
                          { color: getChangeColor(currency.change) }
                        ]}>
                          {currency.change > 0 ? '+' : ''}{formatCurrency(currency.change)}
                        </Text>
                      </View>
                      <Text style={[
                        styles.changePercent,
                        { color: getChangeColor(currency.change) }
                      ]}>
                        {currency.changePercent > 0 ? '+' : ''}{currency.changePercent.toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                  {index < currencies.length - 1 && <Divider style={styles.divider} />}
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Global Markets Section */}
        <Card style={styles.sectionCard} mode="elevated">
          <Card.Content style={styles.cardContent}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconContainer}>
                <MaterialCommunityIcons name="chart-timeline-variant" size={24} color="#10b981" />
              </View>
              <Text variant="titleLarge" style={styles.sectionTitle}>
                Índices Globais
              </Text>
            </View>
            <Text variant="bodySmall" style={styles.sectionSubtitle}>
              Principais índices de mercado em tempo real
            </Text>
            
            <View style={styles.marketList}>
              {markets.map((market, index) => (
                <View key={market.name}>
                  <View style={styles.marketRow}>
                    <View style={styles.marketInfo}>
                      <Text variant="titleMedium" style={styles.marketName}>
                        {market.name}
                      </Text>
                      <Text variant="bodyLarge" style={styles.marketValue}>
                        {formatNumber(market.value)}
                      </Text>
                    </View>
                    <View style={styles.marketChange}>
                      <View style={[
                        styles.changeContainer,
                        { backgroundColor: getChangeColor(market.change) + '15' }
                      ]}>
                        <MaterialCommunityIcons
                          name={getChangeIcon(market.change)}
                          size={16}
                          color={getChangeColor(market.change)}
                        />
                        <Text style={[
                          styles.changeText,
                          { color: getChangeColor(market.change) }
                        ]}>
                          {market.change > 0 ? '+' : ''}{formatNumber(market.change)}
                        </Text>
                      </View>
                      <Text style={[
                        styles.changePercent,
                        { color: getChangeColor(market.change) }
                      ]}>
                        {market.changePercent > 0 ? '+' : ''}{market.changePercent.toFixed(2)}%
                      </Text>
                    </View>
                  </View>
                  {index < markets.length - 1 && <Divider style={styles.divider} />}
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Info Footer */}
        <View style={styles.footer}>
          <MaterialCommunityIcons name="information" size={16} color="#9ca3af" />
          <Text variant="bodySmall" style={styles.footerText}>
            Dados atualizados em tempo real. As taxas podem variar.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    color: '#6b7280',
    fontSize: 12,
  },
  sectionCard: {
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardContent: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sectionTitle: {
    fontWeight: '700',
    color: '#1f2937',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    color: '#6b7280',
    marginBottom: 20,
    fontSize: 13,
  },
  currencyList: {
    gap: 0,
  },
  currencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  currencyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currencyCodeContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  currencyCode: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  currencyDetails: {
    flex: 1,
  },
  currencyName: {
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  currencyRate: {
    color: '#6b7280',
    fontSize: 13,
  },
  currencyChange: {
    alignItems: 'flex-end',
  },
  changeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  changeText: {
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 4,
  },
  changePercent: {
    fontWeight: '600',
    fontSize: 12,
  },
  marketList: {
    gap: 0,
  },
  marketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  marketInfo: {
    flex: 1,
  },
  marketName: {
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
  },
  marketValue: {
    fontWeight: '700',
    color: '#1f2937',
    fontSize: 16,
  },
  marketChange: {
    alignItems: 'flex-end',
  },
  divider: {
    marginVertical: 0,
    backgroundColor: '#e5e7eb',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingVertical: 16,
  },
  footerText: {
    color: '#9ca3af',
    marginLeft: 8,
    fontSize: 12,
    textAlign: 'center',
  },
})

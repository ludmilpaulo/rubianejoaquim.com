import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { Text, Card, Badge } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useAppSelector } from '../hooks/redux'
import { tasksApi } from '../services/api'

export default function HomeScreen() {
  const { user } = useAppSelector((state) => state.auth)
  const navigation = useNavigation<any>()
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    loadUnreadCount()
    const interval = setInterval(() => {
      loadUnreadCount()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadUnreadCount = async () => {
    try {
      const countRes = await tasksApi.getUnreadCount()
      setUnreadCount(countRes.count || 0)
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }

  const navigateToTab = (tabName: string) => {
    // Navigate to parent tab navigator
    const parent = navigation.getParent()
    if (parent) {
      parent.navigate(tabName)
    } else {
      // Fallback: try direct navigation
      navigation.navigate(tabName as never)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.greetingContainer}>
              <Text variant="headlineMedium" style={styles.greeting}>
                Olá, {user?.first_name || 'Utilizador'}! 👋
              </Text>
              <Text variant="bodyMedium" style={styles.subtitle}>
                Bem-vindo ao Zenda
              </Text>
            </View>
            <View style={styles.headerIcon}>
              <MaterialCommunityIcons name="wallet" size={32} color="#6366f1" />
            </View>
          </View>
        </View>

      <View style={styles.cards}>
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickActionCard, styles.quickActionCard1]}
            onPress={() => navigation.navigate('ToDoList')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#f0f4ff' }]}>
              <MaterialCommunityIcons name="check-circle" size={28} color="#6366f1" />
            </View>
            <Text variant="bodyMedium" style={styles.quickActionLabel}>Tarefas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionCard, styles.quickActionCard2]}
            onPress={() => navigation.navigate('Targets')}
            activeOpacity={0.7}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#ecfdf5' }]}>
              <MaterialCommunityIcons name="target" size={28} color="#10b981" />
            </View>
            <Text variant="bodyMedium" style={styles.quickActionLabel}>Metas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickActionCard, styles.quickActionCard3]}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.7}
          >
            <View style={styles.notificationIconContainer}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#fffbeb' }]}>
                <MaterialCommunityIcons name="bell" size={28} color="#f59e0b" />
              </View>
              {unreadCount > 0 && (
                <Badge style={styles.notificationBadge}>{unreadCount}</Badge>
              )}
            </View>
            <Text variant="bodyMedium" style={styles.quickActionLabel}>Notificações</Text>
          </TouchableOpacity>
        </View>

        <Card 
          style={[styles.card, styles.cardPersonal]} 
          onPress={() => navigateToTab('Personal')}
          mode="elevated"
        >
          <Card.Content style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconContainer, { backgroundColor: '#f0f4ff' }]}>
                <MaterialCommunityIcons name="wallet" size={28} color="#6366f1" />
              </View>
              <View style={styles.cardTextContainer}>
                <Text variant="titleLarge" style={styles.cardTitle}>
                  Finanças Pessoais
                </Text>
                <Text variant="bodyMedium" style={styles.cardText}>
                  Rastreie despesas, orçamentos e objetivos
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
            </View>
          </Card.Content>
        </Card>

        <Card 
          style={[styles.card, styles.cardBusiness]} 
          onPress={() => navigateToTab('Business')}
          mode="elevated"
        >
          <Card.Content style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconContainer, { backgroundColor: '#ecfdf5' }]}>
                <MaterialCommunityIcons name="store" size={28} color="#10b981" />
              </View>
              <View style={styles.cardTextContainer}>
                <Text variant="titleLarge" style={styles.cardTitle}>
                  Finanças do Negócio
                </Text>
                <Text variant="bodyMedium" style={styles.cardText}>
                  Gerencie vendas, despesas e lucros
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
            </View>
          </Card.Content>
        </Card>

        <Card 
          style={[styles.card, styles.cardEducation]} 
          onPress={() => navigateToTab('Education')}
          mode="elevated"
        >
          <Card.Content style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconContainer, { backgroundColor: '#fffbeb' }]}>
                <MaterialCommunityIcons name="school" size={28} color="#f59e0b" />
              </View>
              <View style={styles.cardTextContainer}>
                <Text variant="titleLarge" style={styles.cardTitle}>
                  Educação Financeira
                </Text>
                <Text variant="bodyMedium" style={styles.cardText}>
                  Aulas, progresso e certificados
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
            </View>
          </Card.Content>
        </Card>

        <Card
          style={[styles.card, styles.cardAI]}
          onPress={() => {
            navigation.navigate('AICopilot')
          }}
          mode="elevated"
        >
          <Card.Content style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconContainer, { backgroundColor: '#f5f3ff' }]}>
                <MaterialCommunityIcons name="robot" size={28} color="#8b5cf6" />
              </View>
              <View style={styles.cardTextContainer}>
                <Text variant="titleLarge" style={styles.cardTitle}>
                  AI Financial Copilot
                </Text>
                <Text variant="bodyMedium" style={styles.cardText}>
                  Conselhos personalizados baseados nos seus dados
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
            </View>
          </Card.Content>
        </Card>

        <Card
          style={[styles.card, styles.cardMarket]}
          onPress={() => {
            navigation.navigate('Market')
          }}
          mode="elevated"
        >
          <Card.Content style={styles.cardContent}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconContainer, { backgroundColor: '#fef2f2' }]}>
                <MaterialCommunityIcons name="chart-line" size={28} color="#ef4444" />
              </View>
              <View style={styles.cardTextContainer}>
                <Text variant="titleLarge" style={styles.cardTitle}>
                  Mercado Global & Câmbio
                </Text>
                <Text variant="bodyMedium" style={styles.cardText}>
                  Acompanhe índices globais e taxas de câmbio em tempo real
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#9ca3af" />
            </View>
          </Card.Content>
        </Card>
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
    flexGrow: 1,
  },
  header: {
    padding: 20,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontWeight: '700',
    marginBottom: 4,
    color: '#1f2937',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 15,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cards: {
    padding: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  quickActionCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  quickActionCard1: {
    marginLeft: 0,
  },
  quickActionCard2: {
    marginHorizontal: 6,
  },
  quickActionCard3: {
    marginRight: 0,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontWeight: '600',
    color: '#1f2937',
    fontSize: 13,
    textAlign: 'center',
  },
  notificationIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#ef4444',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    zIndex: 10,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardPersonal: {
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  cardBusiness: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  cardEducation: {
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  cardAI: {
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  cardText: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 20,
  },
})

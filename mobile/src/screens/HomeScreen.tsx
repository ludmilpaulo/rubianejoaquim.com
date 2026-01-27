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
          <Text variant="headlineMedium" style={styles.greeting}>
            Olá, {user?.first_name || 'Utilizador'}! 👋
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Bem-vindo ao Zenda
          </Text>
        </View>

      <View style={styles.cards}>
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => navigation.navigate('ToDoList')}
          >
            <MaterialCommunityIcons name="check-circle" size={32} color="#6366f1" />
            <Text variant="bodyMedium" style={styles.quickActionLabel}>Tarefas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => navigation.navigate('Targets')}
          >
            <MaterialCommunityIcons name="target" size={32} color="#10b981" />
            <Text variant="bodyMedium" style={styles.quickActionLabel}>Metas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => navigation.navigate('Notifications')}
          >
            <View style={styles.notificationIconContainer}>
              <MaterialCommunityIcons name="bell" size={32} color="#f59e0b" />
              {unreadCount > 0 && (
                <Badge style={styles.notificationBadge}>{unreadCount}</Badge>
              )}
            </View>
            <Text variant="bodyMedium" style={styles.quickActionLabel}>Notificações</Text>
          </TouchableOpacity>
        </View>

        <Card 
          style={styles.card} 
          onPress={() => navigateToTab('Personal')}
        >
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="wallet" size={32} color="#6366f1" />
              <Text variant="titleLarge" style={styles.cardTitle}>
                Finanças Pessoais
              </Text>
            </View>
            <Text variant="bodyMedium" style={styles.cardText}>
              Rastreie despesas, orçamentos e objetivos
            </Text>
          </Card.Content>
        </Card>

        <Card 
          style={styles.card} 
          onPress={() => navigateToTab('Business')}
        >
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="store" size={32} color="#10b981" />
              <Text variant="titleLarge" style={styles.cardTitle}>
                Finanças do Negócio
              </Text>
            </View>
            <Text variant="bodyMedium" style={styles.cardText}>
              Gerencie vendas, despesas e lucros
            </Text>
          </Card.Content>
        </Card>

        <Card 
          style={styles.card} 
          onPress={() => navigateToTab('Education')}
        >
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="school" size={32} color="#f59e0b" />
              <Text variant="titleLarge" style={styles.cardTitle}>
                Educação Financeira
              </Text>
            </View>
            <Text variant="bodyMedium" style={styles.cardText}>
              Aulas, progresso e certificados
            </Text>
          </Card.Content>
        </Card>

        <Card
          style={styles.card}
          onPress={() => {
            navigation.navigate('AICopilot')
          }}
        >
          <Card.Content>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="robot" size={32} color="#8b5cf6" />
              <Text variant="titleLarge" style={styles.cardTitle}>
                AI Financial Copilot
              </Text>
            </View>
            <Text variant="bodyMedium" style={styles.cardText}>
              Conselhos personalizados baseados nos seus dados
            </Text>
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
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    padding: 20,
    paddingTop: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  greeting: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#666',
  },
  cards: {
    padding: 16,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  quickActionCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    minWidth: 100,
  },
  quickActionLabel: {
    marginTop: 8,
    fontWeight: '600',
    color: '#1f2937',
  },
  notificationIconContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#ef4444',
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    marginLeft: 12,
    fontWeight: 'bold',
  },
  cardText: {
    color: '#666',
    marginTop: 4,
  },
})

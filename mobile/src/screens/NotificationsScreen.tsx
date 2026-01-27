import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native'
import { Text, Card, Button, Chip, Badge, IconButton } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { tasksApi } from '../services/api'

interface Notification {
  id: number
  title: string
  message: string
  notification_type: string
  is_read: boolean
  action_url: string
  related_object_type: string
  related_object_id: number | null
  created_at: string
  read_at: string | null
}

export default function NotificationsScreen() {
  const [refreshing, setRefreshing] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    loadData()
    // Refresh unread count every 30 seconds
    const interval = setInterval(() => {
      loadUnreadCount()
    }, 30000)
    return () => clearInterval(interval)
  }, [filter])

  const loadData = async () => {
    try {
      const isRead = filter === 'unread' ? false : undefined
      const [notificationsRes, countRes] = await Promise.all([
        tasksApi.getNotifications(isRead),
        tasksApi.getUnreadCount(),
      ])
      
      setNotifications(Array.isArray(notificationsRes) ? notificationsRes : notificationsRes.results || [])
      setUnreadCount(countRes.count || 0)
    } catch (error) {
      console.error('Error loading notifications:', error)
    }
  }

  const loadUnreadCount = async () => {
    try {
      const countRes = await tasksApi.getUnreadCount()
      setUnreadCount(countRes.count || 0)
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const handleMarkAsRead = async (notification: Notification) => {
    if (notification.is_read) return
    
    try {
      await tasksApi.markNotificationRead(notification.id)
      loadData()
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await tasksApi.markAllNotificationsRead()
      loadData()
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'task_reminder': return 'bell-ring'
      case 'target_milestone': return 'flag'
      case 'goal_achievement': return 'trophy'
      case 'payment_due': return 'credit-card'
      case 'achievement': return 'star'
      case 'reminder': return 'clock'
      default: return 'information'
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'task_reminder': return '#6366f1'
      case 'target_milestone': return '#10b981'
      case 'goal_achievement': return '#f59e0b'
      case 'payment_due': return '#ef4444'
      case 'achievement': return '#8b5cf6'
      case 'reminder': return '#06b6d4'
      default: return '#6b7280'
    }
  }

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'task_reminder': return 'Lembrete'
      case 'target_milestone': return 'Meta'
      case 'goal_achievement': return 'Conquista'
      case 'payment_due': return 'Pagamento'
      case 'achievement': return 'Conquista'
      case 'reminder': return 'Lembrete'
      default: return 'Sistema'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Agora'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min atrás`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} h atrás`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} dias atrás`
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
        <View>
          <Text variant="headlineSmall" style={styles.title}>Notificações</Text>
          {unreadCount > 0 && (
            <Text variant="bodySmall" style={styles.subtitle}>
              {unreadCount} não lidas
            </Text>
          )}
        </View>
        {unreadCount > 0 && (
          <Button mode="text" onPress={handleMarkAllAsRead}>
            Marcar todas como lidas
          </Button>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            Todas
          </Text>
          {filter === 'all' && notifications.length > 0 && (
            <Badge style={styles.badge}>{notifications.length}</Badge>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'unread' && styles.filterButtonActive]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>
            Não Lidas
          </Text>
          {unreadCount > 0 && (
            <Badge style={styles.badge}>{unreadCount}</Badge>
          )}
        </TouchableOpacity>
      </View>

      {/* Notifications List */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.content}>
          {filteredNotifications.length === 0 ? (
            <Card style={styles.card}>
              <Card.Content style={styles.emptyContent}>
                <MaterialCommunityIcons name="bell-off" size={64} color="#ccc" />
                <Text variant="bodyLarge" style={styles.emptyText}>
                  {filter === 'unread' 
                    ? 'Nenhuma notificação não lida'
                    : 'Nenhuma notificação'}
                </Text>
              </Card.Content>
            </Card>
          ) : (
            filteredNotifications.map(notification => {
              const iconColor = getNotificationColor(notification.notification_type)
              const isUnread = !notification.is_read
              
              return (
                <TouchableOpacity
                  key={notification.id}
                  onPress={() => handleMarkAsRead(notification)}
                  activeOpacity={0.7}
                >
                  <Card
                    style={[
                      styles.notificationCard,
                      isUnread && styles.notificationCardUnread
                    ]}
                  >
                    <Card.Content>
                      <View style={styles.notificationHeader}>
                        <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
                          <MaterialCommunityIcons
                            name={getNotificationIcon(notification.notification_type) as any}
                            size={24}
                            color={iconColor}
                          />
                        </View>
                        <View style={styles.notificationContent}>
                          <View style={styles.notificationTitleRow}>
                            <Text
                              variant="titleMedium"
                              style={[
                                styles.notificationTitle,
                                isUnread && styles.notificationTitleUnread
                              ]}
                            >
                              {notification.title}
                            </Text>
                            {isUnread && (
                              <View style={styles.unreadDot} />
                            )}
                          </View>
                          <Text variant="bodyMedium" style={styles.notificationMessage}>
                            {notification.message}
                          </Text>
                          <View style={styles.notificationFooter}>
                            <Chip
                              icon={getNotificationIcon(notification.notification_type) as any}
                              style={[styles.typeChip, { backgroundColor: iconColor + '20' }]}
                              textStyle={{ color: iconColor, fontSize: 11 }}
                              compact
                            >
                              {getNotificationTypeLabel(notification.notification_type)}
                            </Chip>
                            <Text variant="bodySmall" style={styles.timeText}>
                              {formatTimeAgo(notification.created_at)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </Card.Content>
                  </Card>
                </TouchableOpacity>
              )
            })
          )}
        </View>
      </ScrollView>
      </View>
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 8,
    backgroundColor: '#fff',
  },
  title: {
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    color: '#666',
    marginTop: 4,
  },
  filtersContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  filterButtonActive: {
    backgroundColor: '#eef2ff',
  },
  filterText: {
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#6366f1',
    fontWeight: '600',
  },
  badge: {
    marginLeft: 8,
    backgroundColor: '#6366f1',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 16,
    color: '#999',
    textAlign: 'center',
  },
  notificationCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  notificationCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
    backgroundColor: '#f8fafc',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  notificationTitleUnread: {
    fontWeight: '700',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366f1',
    marginLeft: 8,
  },
  notificationMessage: {
    color: '#666',
    marginBottom: 8,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeChip: {
    height: 24,
  },
  timeText: {
    color: '#999',
    fontSize: 12,
  },
})

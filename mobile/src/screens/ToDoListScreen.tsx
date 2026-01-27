import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Dimensions, Alert, Text as RNText } from 'react-native'
import { Text, Card, Button, FAB, Chip, Portal, Modal, TextInput, SegmentedButtons, Checkbox, IconButton } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { tasksApi } from '../services/api'
import DatePicker from '../components/DatePicker'
import TimePicker from '../components/TimePicker'

interface Task {
  id: number
  title: string
  description: string
  due_date: string | null
  due_time: string | null
  priority: string
  status: string
  category_name?: string
  category_icon?: string
  category_color?: string
  is_overdue: boolean
  completed_at: string | null
}

interface TaskCategory {
  id: number
  name: string
  icon: string
  color: string
}

export default function ToDoListScreen() {
  const [activeFilter, setActiveFilter] = useState<'all' | 'today' | 'upcoming' | 'overdue' | 'completed'>('all')
  const [refreshing, setRefreshing] = useState(false)
  const [tasks, setTasks] = useState<Task[]>([])
  const [todayTasks, setTodayTasks] = useState<Task[]>([])
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([])
  const [categories, setCategories] = useState<TaskCategory[]>([])
  const [stats, setStats] = useState<any>(null)
  
  // Modal states
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    category: '',
    due_date: null as Date | null,
    due_time: null as Date | null,
    priority: 'medium',
    status: 'pending',
    is_recurring: false,
    recurrence_pattern: '',
  })

  useEffect(() => {
    loadData()
  }, [activeFilter])

  const loadData = async () => {
    try {
      const [tasksRes, todayRes, upcomingRes, categoriesRes, statsRes] = await Promise.all([
        activeFilter === 'completed' 
          ? tasksApi.getTasks('completed')
          : activeFilter === 'overdue'
          ? tasksApi.getTasks(undefined, undefined, undefined, true)
          : tasksApi.getTasks(),
        tasksApi.getTodayTasks(),
        tasksApi.getUpcomingTasks(),
        tasksApi.getCategories(),
        tasksApi.getTaskStats(),
      ])
      
      setTasks(Array.isArray(tasksRes) ? tasksRes : tasksRes.results || [])
      setTodayTasks(Array.isArray(todayRes) ? todayRes : todayRes.results || [])
      setUpcomingTasks(Array.isArray(upcomingRes) ? upcomingRes : upcomingRes.results || [])
      setCategories(Array.isArray(categoriesRes) ? categoriesRes : categoriesRes.results || [])
      setStats(statsRes)
    } catch (error) {
      console.error('Error loading tasks:', error)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const handleSaveTask = async () => {
    try {
      // Format dates for API
      const taskData = {
        ...taskForm,
        due_date: taskForm.due_date 
          ? `${taskForm.due_date.getFullYear()}-${String(taskForm.due_date.getMonth() + 1).padStart(2, '0')}-${String(taskForm.due_date.getDate()).padStart(2, '0')}`
          : null,
        due_time: taskForm.due_time
          ? `${String(taskForm.due_time.getHours()).padStart(2, '0')}:${String(taskForm.due_time.getMinutes()).padStart(2, '0')}`
          : null,
      }
      
      if (editingTask) {
        await tasksApi.updateTask(editingTask.id, taskData)
      } else {
        await tasksApi.createTask(taskData)
      }
      setShowTaskModal(false)
      setEditingTask(null)
      resetTaskForm()
      loadData()
    } catch (error) {
      console.error('Error saving task:', error)
    }
  }

  const handleCompleteTask = async (task: Task) => {
    try {
      await tasksApi.completeTask(task.id)
      loadData()
    } catch (error) {
      console.error('Error completing task:', error)
    }
  }

  const handleDeleteTask = async (taskId: number) => {
    try {
      await tasksApi.deleteTask(taskId)
      loadData()
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const resetTaskForm = () => {
    setTaskForm({
      title: '',
      description: '',
      category: '',
      due_date: null,
      due_time: null,
      priority: 'medium',
      status: 'pending',
      is_recurring: false,
      recurrence_pattern: '',
    })
  }

  const openEditTask = (task: Task) => {
    setEditingTask(task)
    
    // Parse dates from strings
    let dueDate: Date | null = null
    let dueTime: Date | null = null
    
    if (task.due_date) {
      const dateParts = task.due_date.split('-')
      if (dateParts.length === 3) {
        dueDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
      }
    }
    
    if (task.due_time) {
      const timeParts = task.due_time.split(':')
      if (timeParts.length >= 2) {
        const now = new Date()
        dueTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(timeParts[0]), parseInt(timeParts[1]))
      }
    }
    
    setTaskForm({
      title: task.title,
      description: task.description,
      category: task.category_name || '',
      due_date: dueDate,
      due_time: dueTime,
      priority: task.priority,
      status: task.status,
      is_recurring: false,
      recurrence_pattern: '',
    })
    setShowTaskModal(true)
  }

  const getDisplayTasks = () => {
    switch (activeFilter) {
      case 'today':
        return todayTasks
      case 'upcoming':
        return upcomingTasks
      case 'overdue':
        return tasks.filter(t => t.is_overdue)
      case 'completed':
        return tasks.filter(t => t.status === 'completed')
      default:
        return tasks.filter(t => t.status !== 'completed')
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#ef4444'
      case 'high': return '#f59e0b'
      case 'medium': return '#6366f1'
      case 'low': return '#10b981'
      default: return '#6b7280'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'alert-circle'
      case 'high': return 'arrow-up-circle'
      case 'medium': return 'minus-circle'
      case 'low': return 'arrow-down-circle'
      default: return 'circle'
    }
  }

  const displayTasks = getDisplayTasks()

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text variant="headlineSmall" style={styles.title}>Minhas Tarefas</Text>
            {stats && (
              <Text variant="bodySmall" style={styles.subtitle}>
                {stats.completed} de {stats.total} concluídas
              </Text>
            )}
          </View>
          <IconButton icon="bell" size={24} onPress={() => {}} />
        </View>

        {/* Stats Cards */}
        {stats && (
          <View style={styles.statsContainer}>
            <Card style={styles.statCard}>
              <Card.Content style={styles.statContent}>
                <MaterialCommunityIcons name="check-circle" size={24} color="#10b981" />
                <Text variant="headlineSmall" style={styles.statValue}>{stats.completed}</Text>
                <Text variant="bodySmall" style={styles.statLabel}>Concluídas</Text>
              </Card.Content>
            </Card>
            <Card style={styles.statCard}>
              <Card.Content style={styles.statContent}>
                <MaterialCommunityIcons name="clock-outline" size={24} color="#6366f1" />
                <Text variant="headlineSmall" style={styles.statValue}>{stats.pending}</Text>
                <Text variant="bodySmall" style={styles.statLabel}>Pendentes</Text>
              </Card.Content>
            </Card>
            <Card style={styles.statCard}>
              <Card.Content style={styles.statContent}>
                <MaterialCommunityIcons name="alert-circle" size={24} color="#ef4444" />
                <Text variant="headlineSmall" style={styles.statValue}>{stats.overdue}</Text>
                <Text variant="bodySmall" style={styles.statLabel}>Atrasadas</Text>
              </Card.Content>
            </Card>
          </View>
        )}

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
            {[
              { key: 'all', label: 'Todas', icon: 'view-list' },
              { key: 'today', label: 'Hoje', icon: 'calendar-today' },
              { key: 'upcoming', label: 'Próximas', icon: 'calendar-clock' },
              { key: 'overdue', label: 'Atrasadas', icon: 'alert' },
              { key: 'completed', label: 'Concluídas', icon: 'check-all' },
            ].map(filter => (
              <TouchableOpacity
                key={filter.key}
                style={[styles.filterChip, activeFilter === filter.key && styles.filterChipActive]}
                onPress={() => setActiveFilter(filter.key as any)}
              >
                <MaterialCommunityIcons
                  name={filter.icon as any}
                  size={18}
                  color={activeFilter === filter.key ? '#6366f1' : '#666'}
                />
                <Text style={[styles.filterLabel, activeFilter === filter.key && styles.filterLabelActive]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tasks List */}
        <View style={styles.content}>
          {displayTasks.length === 0 ? (
            <Card style={styles.card}>
              <Card.Content style={styles.emptyContent}>
                <MaterialCommunityIcons name="check-circle-outline" size={64} color="#ccc" />
                <Text variant="bodyLarge" style={styles.emptyText}>
                  {activeFilter === 'completed' 
                    ? 'Nenhuma tarefa concluída ainda'
                    : activeFilter === 'overdue'
                    ? 'Nenhuma tarefa atrasada'
                    : 'Nenhuma tarefa pendente'}
                </Text>
                <Button mode="contained" onPress={() => setShowTaskModal(true)}>
                  Criar Tarefa
                </Button>
              </Card.Content>
            </Card>
          ) : (
            displayTasks.map(task => (
              <Card key={task.id} style={[styles.taskCard, task.is_overdue && styles.taskCardOverdue]}>
                <Card.Content>
                  <View style={styles.taskHeader}>
                    <View style={styles.taskLeft}>
                      <Checkbox
                        status={task.status === 'completed' ? 'checked' : 'unchecked'}
                        onPress={() => handleCompleteTask(task)}
                        color={getPriorityColor(task.priority)}
                      />
                      <View style={styles.taskInfo}>
                        <Text
                          variant="titleMedium"
                          style={[
                            styles.taskTitle,
                            task.status === 'completed' && styles.taskTitleCompleted
                          ]}
                        >
                          {task.title}
                        </Text>
                        {task.description && (
                          <Text variant="bodySmall" style={styles.taskDescription}>
                            {task.description}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.taskActions}>
                      <TouchableOpacity
                        style={styles.taskEditButton}
                        onPress={() => openEditTask(task)}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons name="pencil" size={18} color="#6366f1" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.taskDeleteButton}
                        onPress={() => handleDeleteTask(task.id)}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons name="delete-outline" size={18} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.taskFooter}>
                    {task.category_name && (
                      <Chip
                        icon={task.category_icon as any || 'tag'}
                        style={[styles.categoryChip, { backgroundColor: task.category_color || '#6366f1' + '20' }]}
                        textStyle={{ color: task.category_color || '#6366f1' }}
                        compact
                      >
                        {task.category_name}
                      </Chip>
                    )}
                    <Chip
                      icon={getPriorityIcon(task.priority)}
                      style={[styles.priorityChip, { backgroundColor: getPriorityColor(task.priority) + '20' }]}
                      textStyle={{ color: getPriorityColor(task.priority) }}
                      compact
                    >
                      {task.priority === 'urgent' ? 'Urgente' :
                       task.priority === 'high' ? 'Alta' :
                       task.priority === 'medium' ? 'Média' : 'Baixa'}
                    </Chip>
                    {task.due_date && (
                      <Chip
                        icon={task.is_overdue ? 'alert' : 'calendar'}
                        style={[styles.dateChip, task.is_overdue && styles.dateChipOverdue]}
                        compact
                      >
                        {new Date(task.due_date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })}
                      </Chip>
                    )}
                  </View>
                </Card.Content>
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setShowTaskModal(true)}
      />

      {/* Task Modal */}
      <Portal>
        <Modal
          visible={showTaskModal}
          onDismiss={() => {
            setShowTaskModal(false)
            setEditingTask(null)
            resetTaskForm()
          }}
          contentContainerStyle={styles.modal}
        >
          <ScrollView>
            <Text variant="headlineSmall" style={styles.modalTitle}>
              {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
            </Text>
            <TextInput
              label="Título"
              value={taskForm.title}
              onChangeText={(text) => setTaskForm({ ...taskForm, title: text })}
              style={styles.input}
            />
            <TextInput
              label="Descrição"
              multiline
              value={taskForm.description}
              onChangeText={(text) => setTaskForm({ ...taskForm, description: text })}
              style={styles.input}
            />
            <DatePicker
              label="Data de Vencimento"
              value={taskForm.due_date}
              onChange={(date) => setTaskForm({ ...taskForm, due_date: date })}
            />
            <TimePicker
              label="Hora de Vencimento"
              value={taskForm.due_time}
              onChange={(time) => setTaskForm({ ...taskForm, due_time: time })}
            />
            <Text variant="bodyMedium" style={styles.label}>Prioridade</Text>
            <SegmentedButtons
              value={taskForm.priority}
              onValueChange={(value) => setTaskForm({ ...taskForm, priority: value })}
              buttons={[
                { value: 'low', label: 'Baixa' },
                { value: 'medium', label: 'Média' },
                { value: 'high', label: 'Alta' },
                { value: 'urgent', label: 'Urgente' },
              ]}
              style={styles.segmentedButtons}
            />
            {editingTask && (
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={() => handleDeleteTask(editingTask.id)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="delete-outline" size={20} color="#fff" />
                <RNText style={styles.modalDeleteButtonText}>Excluir Tarefa</RNText>
              </TouchableOpacity>
            )}
            <Button mode="contained" onPress={handleSaveTask} style={styles.modalButton}>
              Salvar
            </Button>
          </ScrollView>
        </Modal>
      </Portal>
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
  scrollView: {
    flex: 1,
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
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    elevation: 2,
  },
  statContent: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  statValue: {
    fontWeight: 'bold',
    marginTop: 8,
    color: '#1f2937',
  },
  statLabel: {
    color: '#666',
    marginTop: 4,
    fontSize: 12,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    paddingVertical: 8,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  filterChipActive: {
    backgroundColor: '#eef2ff',
  },
  filterLabel: {
    marginLeft: 6,
    color: '#666',
    fontSize: 14,
  },
  filterLabelActive: {
    color: '#6366f1',
    fontWeight: '600',
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
    marginBottom: 24,
    color: '#999',
    textAlign: 'center',
  },
  taskCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  taskCardOverdue: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  taskInfo: {
    flex: 1,
    marginLeft: 12,
  },
  taskTitle: {
    fontWeight: '600',
    color: '#1f2937',
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  taskDescription: {
    color: '#666',
    marginTop: 4,
  },
  taskFooter: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryChip: {
    height: 28,
  },
  priorityChip: {
    height: 28,
  },
  dateChip: {
    height: 28,
  },
  dateChipOverdue: {
    backgroundColor: '#fee2e2',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#6366f1',
  },
  modal: {
    backgroundColor: '#fff',
    padding: 24,
    margin: 20,
    borderRadius: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  label: {
    marginTop: 8,
    marginBottom: 8,
    fontWeight: '600',
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  taskActions: {
    flexDirection: 'row',
    gap: 8,
  },
  taskEditButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#6366f1',
  },
  taskDeleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#ef4444',
  },
  modalButton: {
    marginTop: 8,
  },
  deleteButton: {
    borderColor: '#ef4444',
  },
  modalDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 12,
    gap: 8,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  modalDeleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})

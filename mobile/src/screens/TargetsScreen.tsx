import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Dimensions, Text as RNText, Alert } from 'react-native'
import { Text, Card, Button, FAB, Chip, Portal, Modal, TextInput, ProgressBar, Menu } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { tasksApi } from '../services/api'
import { formatCurrency } from '../utils/currency'
import DatePicker from '../components/DatePicker'
import PeriodSelector, { getDefaultPeriod, getPeriodParams, type PeriodState } from '../components/PeriodSelector'

const { width } = Dimensions.get('window')

interface Target {
  id: number
  title: string
  description: string
  target_type: string
  target_value: string | null
  current_value: string
  unit: string
  start_date: string
  target_date: string
  status: string
  progress_percentage: string
  remaining_value: string | null
  days_remaining: number | null
}

export default function TargetsScreen() {
  const [periodState, setPeriodState] = useState<PeriodState>(getDefaultPeriod)
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'completed' | 'paused'>('all')
  const [refreshing, setRefreshing] = useState(false)
  const [targets, setTargets] = useState<Target[]>([])
  const [stats, setStats] = useState<any>(null)
  
  // Modal states
  const [showTargetModal, setShowTargetModal] = useState(false)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [editingTarget, setEditingTarget] = useState<Target | null>(null)
  const [selectedTarget, setSelectedTarget] = useState<Target | null>(null)
  const [targetForm, setTargetForm] = useState({
    title: '',
    description: '',
    target_type: 'personal',
    target_value: '',
    current_value: '0',
    unit: '',
    start_date: new Date(),
    target_date: null as Date | null,
    status: 'active',
  })
  const [progressValue, setProgressValue] = useState('')
  const [showTypeMenu, setShowTypeMenu] = useState(false)

  useEffect(() => {
    loadData()
  }, [activeFilter, periodState.period, periodState.month, periodState.year, periodState.dateFrom, periodState.dateTo])

  const loadData = async () => {
    try {
      const statusFilter = activeFilter === 'all' ? undefined : activeFilter
      const [targetsRes, statsRes] = await Promise.all([
        tasksApi.getTargets(statusFilter),
        tasksApi.getTargetStats(getPeriodParams(periodState)),
      ])
      setTargets(Array.isArray(targetsRes) ? targetsRes : targetsRes.results || [])
      setStats(statsRes)
    } catch (error) {
      console.error('Error loading targets:', error)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const handleSaveTarget = async () => {
    // Validation
    if (!targetForm.title.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o título da meta.')
      return
    }
    
    if (!targetForm.target_date) {
      Alert.alert('Erro', 'Por favor, selecione a data alvo.')
      return
    }
    
    try {
      // Format dates for API
      const targetData: any = {
        title: targetForm.title.trim(),
        description: targetForm.description.trim(),
        target_type: targetForm.target_type,
        current_value: targetForm.current_value || '0',
        unit: targetForm.unit.trim(),
        status: targetForm.status,
        start_date: targetForm.start_date.toISOString().split('T')[0],
        target_date: targetForm.target_date.toISOString().split('T')[0],
      }
      
      // Add optional fields
      if (targetForm.target_value && targetForm.target_value.trim()) {
        targetData.target_value = targetForm.target_value
      }
      
      if (editingTarget) {
        await tasksApi.updateTarget(editingTarget.id, targetData)
      } else {
        await tasksApi.createTarget(targetData)
      }
      setShowTargetModal(false)
      setEditingTarget(null)
      resetTargetForm()
      loadData()
    } catch (error: any) {
      console.error('Error saving target:', error)
      const errorMessage = error.response?.data 
        ? (typeof error.response.data === 'string' 
            ? error.response.data 
            : Object.values(error.response.data).flat().join(', '))
        : 'Não foi possível salvar a meta. Verifique os campos obrigatórios.'
      Alert.alert('Erro', errorMessage)
    }
  }

  const handleUpdateProgress = async () => {
    if (!selectedTarget) return
    try {
      await tasksApi.updateTargetProgress(selectedTarget.id, parseFloat(progressValue))
      setShowProgressModal(false)
      setSelectedTarget(null)
      setProgressValue('')
      loadData()
    } catch (error) {
      console.error('Error updating progress:', error)
    }
  }

  const handleDeleteTarget = async (targetId: number) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir esta meta? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await tasksApi.deleteTarget(targetId)
              loadData()
            } catch (error) {
              console.error('Error deleting target:', error)
              Alert.alert('Erro', 'Não foi possível excluir a meta. Tente novamente.')
            }
          },
        },
      ]
    )
  }

  const resetTargetForm = () => {
    setTargetForm({
      title: '',
      description: '',
      target_type: 'personal',
      target_value: '',
      current_value: '0',
      unit: '',
      start_date: new Date(),
      target_date: null,
      status: 'active',
    })
  }

  const openEditTarget = (target: Target) => {
    setEditingTarget(target)
    
    // Parse date strings to Date objects
    let startDate = new Date()
    if (target.start_date) {
      const dateParts = target.start_date.split('-')
      if (dateParts.length === 3) {
        startDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
      }
    }
    
    let targetDate: Date | null = null
    if (target.target_date) {
      const dateParts = target.target_date.split('-')
      if (dateParts.length === 3) {
        targetDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
      }
    }
    
    setTargetForm({
      title: target.title,
      description: target.description,
      target_type: target.target_type,
      target_value: target.target_value || '',
      current_value: target.current_value,
      unit: target.unit,
      start_date: startDate,
      target_date: targetDate,
      status: target.status,
    })
    setShowTargetModal(true)
  }

  const openProgressModal = (target: Target) => {
    setSelectedTarget(target)
    setProgressValue(target.current_value)
    setShowProgressModal(true)
  }

  const getTargetTypeIcon = (type: string) => {
    switch (type) {
      case 'financial': return 'cash-multiple'
      case 'career': return 'briefcase'
      case 'health': return 'heart'
      case 'education': return 'school'
      case 'business': return 'store'
      case 'personal': return 'target'
      default: return 'flag'
    }
  }

  const getTargetTypeColor = (type: string) => {
    switch (type) {
      case 'financial': return '#10b981'
      case 'career': return '#6366f1'
      case 'health': return '#ef4444'
      case 'education': return '#f59e0b'
      case 'business': return '#8b5cf6'
      case 'personal': return '#ec4899'
      default: return '#6b7280'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981'
      case 'completed': return '#6366f1'
      case 'paused': return '#f59e0b'
      case 'cancelled': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const filteredTargets = activeFilter === 'all' 
    ? targets 
    : targets.filter(t => t.status === activeFilter)

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
            <Text variant="headlineSmall" style={styles.title}>Minhas Metas</Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              {targets.filter(t => t.status === 'active').length} metas ativas
            </Text>
          </View>
        </View>

        {/* Period Selector & Stats */}
        <View style={styles.periodSection}>
          <Text variant="labelMedium" style={styles.periodLabel}>Estatísticas do período</Text>
          <PeriodSelector state={periodState} onChange={setPeriodState} />
        </View>
        {stats && (
          <View style={styles.statsContainer}>
            <Card style={styles.statCard}>
              <Card.Content style={styles.statContent}>
                <MaterialCommunityIcons name="flag" size={24} color="#6366f1" />
                <RNText style={styles.statValue}>{stats.total}</RNText>
                <RNText style={styles.statLabel}>Total</RNText>
              </Card.Content>
            </Card>
            <Card style={styles.statCard}>
              <Card.Content style={styles.statContent}>
                <MaterialCommunityIcons name="play-circle" size={24} color="#10b981" />
                <RNText style={styles.statValue}>{stats.active}</RNText>
                <RNText style={styles.statLabel}>Ativas</RNText>
              </Card.Content>
            </Card>
            <Card style={styles.statCard}>
              <Card.Content style={styles.statContent}>
                <MaterialCommunityIcons name="check-circle" size={24} color="#6366f1" />
                <RNText style={styles.statValue}>{stats.completed}</RNText>
                <RNText style={styles.statLabel}>Concluídas</RNText>
              </Card.Content>
            </Card>
          </View>
        )}

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
            {[
              { key: 'all', label: 'Todas', icon: 'view-list' },
              { key: 'active', label: 'Ativas', icon: 'play-circle' },
              { key: 'completed', label: 'Concluídas', icon: 'check-circle' },
              { key: 'paused', label: 'Pausadas', icon: 'pause-circle' },
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

        {/* Targets List */}
        <View style={styles.content}>
          {filteredTargets.length === 0 ? (
            <Card style={styles.card}>
              <Card.Content style={styles.emptyContent}>
                <MaterialCommunityIcons name="target" size={64} color="#ccc" />
                <Text variant="bodyLarge" style={styles.emptyText}>
                  Nenhuma meta criada ainda
                </Text>
                <Button mode="contained" onPress={() => setShowTargetModal(true)}>
                  Criar Meta
                </Button>
              </Card.Content>
            </Card>
          ) : (
            filteredTargets.map(target => {
              const progress = parseFloat(target.progress_percentage)
              const typeColor = getTargetTypeColor(target.target_type)
              
              return (
                <Card key={target.id} style={styles.targetCard}>
                  <Card.Content>
                    <View style={styles.targetHeader}>
                      <View style={styles.targetLeft}>
                        <View style={[styles.typeIcon, { backgroundColor: typeColor + '20' }]}>
                          <MaterialCommunityIcons
                            name={getTargetTypeIcon(target.target_type) as any}
                            size={24}
                            color={typeColor}
                          />
                        </View>
                        <View style={styles.targetInfo}>
                          <Text variant="titleMedium" style={styles.targetTitle}>
                            {target.title}
                          </Text>
                          <Text variant="bodySmall" style={styles.targetDescription}>
                            {target.description}
                          </Text>
                        </View>
                      </View>
                      <Chip
                        icon={target.status === 'completed' ? 'check-circle' : target.status === 'paused' ? 'pause-circle' : 'play-circle'}
                        style={[styles.statusChip, { backgroundColor: getStatusColor(target.status) + '20' }]}
                        textStyle={{ color: getStatusColor(target.status) }}
                        compact
                      >
                        {target.status === 'active' ? 'Ativa' :
                         target.status === 'completed' ? 'Concluída' :
                         target.status === 'paused' ? 'Pausada' : 'Cancelada'}
                      </Chip>
                    </View>

                    {/* Progress */}
                    {target.target_value && (
                      <View style={styles.progressSection}>
                        <View style={styles.progressHeader}>
                          <Text variant="bodyMedium" style={styles.progressText}>
                            {formatCurrency(parseFloat(target.current_value))} / {formatCurrency(parseFloat(target.target_value))} {target.unit}
                          </Text>
                          <Text variant="bodyMedium" style={styles.progressPercentage}>
                            {progress.toFixed(0)}%
                          </Text>
                        </View>
                        <ProgressBar
                          progress={progress / 100}
                          color={typeColor}
                          style={styles.progressBar}
                        />
                        {target.remaining_value && (
                          <Text variant="bodySmall" style={styles.remainingText}>
                            Restante: {formatCurrency(parseFloat(target.remaining_value))} {target.unit}
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Dates */}
                    <View style={styles.targetFooter}>
                      <Chip icon="calendar-start" compact>
                        Início: {new Date(target.start_date).toLocaleDateString('pt-PT')}
                      </Chip>
                      <Chip icon="calendar-end" compact>
                        Meta: {new Date(target.target_date).toLocaleDateString('pt-PT')}
                      </Chip>
                      {target.days_remaining !== null && (
                        <Chip
                          icon={target.days_remaining < 30 ? 'alert' : 'clock'}
                          style={target.days_remaining < 30 ? styles.daysChipUrgent : styles.daysChip}
                          compact
                        >
                          {target.days_remaining} dias restantes
                        </Chip>
                      )}
                    </View>

                    {/* Actions */}
                    {target.status === 'active' && target.target_value && (
                      <View style={styles.actions}>
                        <TouchableOpacity
                          style={styles.updateButton}
                          onPress={() => openProgressModal(target)}
                          activeOpacity={0.7}
                        >
                          <MaterialCommunityIcons name="chart-line" size={18} color="#fff" />
                          <RNText style={styles.updateButtonText}>Atualizar Progresso</RNText>
                        </TouchableOpacity>
                        <View style={styles.targetActionButtons}>
                          <TouchableOpacity
                            style={styles.targetEditButton}
                            onPress={() => openEditTarget(target)}
                            activeOpacity={0.7}
                          >
                            <MaterialCommunityIcons name="pencil" size={18} color="#6366f1" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.targetDeleteButton}
                            onPress={() => handleDeleteTarget(target.id)}
                            activeOpacity={0.7}
                          >
                            <MaterialCommunityIcons name="delete-outline" size={18} color="#ef4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </Card.Content>
                </Card>
              )
            })
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setShowTargetModal(true)}
      />

      {/* Target Modal */}
      <Portal>
        <Modal
          visible={showTargetModal}
          onDismiss={() => {
            setShowTargetModal(false)
            setEditingTarget(null)
            resetTargetForm()
          }}
          contentContainerStyle={styles.modal}
        >
          <ScrollView>
            <Text variant="headlineSmall" style={styles.modalTitle}>
              {editingTarget ? 'Editar Meta' : 'Nova Meta'}
            </Text>
            <TextInput
              label="Título"
              value={targetForm.title}
              onChangeText={(text) => setTargetForm({ ...targetForm, title: text })}
              style={styles.input}
            />
            <TextInput
              label="Descrição"
              multiline
              value={targetForm.description}
              onChangeText={(text) => setTargetForm({ ...targetForm, description: text })}
              style={styles.input}
            />
            <View style={styles.dropdownContainer}>
              <Text variant="bodySmall" style={styles.label}>Tipo de Meta</Text>
              <Menu
                visible={showTypeMenu}
                onDismiss={() => setShowTypeMenu(false)}
                anchor={
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowTypeMenu(true)}
                  >
                    <View style={styles.dropdownContent}>
                      <MaterialCommunityIcons
                        name={getTargetTypeIcon(targetForm.target_type) as any}
                        size={20}
                        color={getTargetTypeColor(targetForm.target_type)}
                        style={styles.dropdownIcon}
                      />
                      <Text variant="bodyLarge" style={styles.dropdownText}>
                        {targetForm.target_type === 'personal' ? 'Pessoal' :
                         targetForm.target_type === 'financial' ? 'Financeira' :
                         targetForm.target_type === 'career' ? 'Carreira' :
                         targetForm.target_type === 'health' ? 'Saúde' :
                         targetForm.target_type === 'education' ? 'Educação' :
                         targetForm.target_type === 'business' ? 'Negócio' : 'Outro'}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-down" size={20} color="#999" />
                  </TouchableOpacity>
                }
              >
                <Menu.Item
                  onPress={() => {
                    setTargetForm({ ...targetForm, target_type: 'personal' })
                    setShowTypeMenu(false)
                  }}
                  title="Pessoal"
                  leadingIcon={() => (
                    <MaterialCommunityIcons name="target" size={20} color="#ec4899" />
                  )}
                />
                <Menu.Item
                  onPress={() => {
                    setTargetForm({ ...targetForm, target_type: 'financial' })
                    setShowTypeMenu(false)
                  }}
                  title="Financeira"
                  leadingIcon={() => (
                    <MaterialCommunityIcons name="cash-multiple" size={20} color="#10b981" />
                  )}
                />
                <Menu.Item
                  onPress={() => {
                    setTargetForm({ ...targetForm, target_type: 'career' })
                    setShowTypeMenu(false)
                  }}
                  title="Carreira"
                  leadingIcon={() => (
                    <MaterialCommunityIcons name="briefcase" size={20} color="#6366f1" />
                  )}
                />
                <Menu.Item
                  onPress={() => {
                    setTargetForm({ ...targetForm, target_type: 'health' })
                    setShowTypeMenu(false)
                  }}
                  title="Saúde"
                  leadingIcon={() => (
                    <MaterialCommunityIcons name="heart" size={20} color="#ef4444" />
                  )}
                />
                <Menu.Item
                  onPress={() => {
                    setTargetForm({ ...targetForm, target_type: 'education' })
                    setShowTypeMenu(false)
                  }}
                  title="Educação"
                  leadingIcon={() => (
                    <MaterialCommunityIcons name="school" size={20} color="#f59e0b" />
                  )}
                />
                <Menu.Item
                  onPress={() => {
                    setTargetForm({ ...targetForm, target_type: 'business' })
                    setShowTypeMenu(false)
                  }}
                  title="Negócio"
                  leadingIcon={() => (
                    <MaterialCommunityIcons name="store" size={20} color="#8b5cf6" />
                  )}
                />
              </Menu>
            </View>
            <TextInput
              label="Valor Alvo (opcional)"
              keyboardType="numeric"
              value={targetForm.target_value}
              onChangeText={(text) => setTargetForm({ ...targetForm, target_value: text })}
              style={styles.input}
            />
            <TextInput
              label="Unidade (ex: KZ, kg, horas)"
              value={targetForm.unit}
              onChangeText={(text) => setTargetForm({ ...targetForm, unit: text })}
              style={styles.input}
            />
            <DatePicker
              label="Data de Início"
              value={targetForm.start_date}
              onChange={(date) => setTargetForm({ ...targetForm, start_date: date || new Date() })}
            />
            <DatePicker
              label="Data Alvo"
              value={targetForm.target_date}
              onChange={(date) => setTargetForm({ ...targetForm, target_date: date })}
            />
            {editingTarget && (
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={() => handleDeleteTarget(editingTarget.id)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="delete-outline" size={20} color="#fff" />
                <RNText style={styles.modalDeleteButtonText}>Excluir Meta</RNText>
              </TouchableOpacity>
            )}
            <Button mode="contained" onPress={handleSaveTarget} style={styles.modalButton}>
              Salvar
            </Button>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Progress Modal */}
      <Portal>
        <Modal
          visible={showProgressModal}
          onDismiss={() => {
            setShowProgressModal(false)
            setSelectedTarget(null)
            setProgressValue('')
          }}
          contentContainerStyle={styles.modal}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Atualizar Progresso
          </Text>
          {selectedTarget && (
            <>
              <Text variant="bodyLarge" style={styles.progressTargetTitle}>
                {selectedTarget.title}
              </Text>
              <Text variant="bodyMedium" style={styles.progressInfo}>
                Valor atual: {formatCurrency(parseFloat(selectedTarget.current_value))} {selectedTarget.unit}
              </Text>
              {selectedTarget.target_value && (
                <Text variant="bodyMedium" style={styles.progressInfo}>
                  Valor alvo: {formatCurrency(parseFloat(selectedTarget.target_value))} {selectedTarget.unit}
                </Text>
              )}
              <TextInput
                label="Novo Valor"
                keyboardType="numeric"
                value={progressValue}
                onChangeText={setProgressValue}
                style={styles.input}
              />
              <Button mode="contained" onPress={handleUpdateProgress} style={styles.modalButton}>
                Atualizar
              </Button>
            </>
          )}
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
    padding: 16,
    paddingTop: 8,
    backgroundColor: '#fff',
  },
  periodSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  periodLabel: {
    color: '#6b7280',
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
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
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
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
  targetCard: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  targetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  targetLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  targetInfo: {
    flex: 1,
  },
  targetTitle: {
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  targetDescription: {
    color: '#666',
  },
  statusChip: {
    height: 28,
  },
  progressSection: {
    marginTop: 16,
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontWeight: '600',
    color: '#1f2937',
  },
  progressPercentage: {
    fontWeight: '600',
    color: '#6366f1',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  remainingText: {
    color: '#666',
  },
  targetFooter: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  daysChip: {
    height: 28,
  },
  daysChipUrgent: {
    height: 28,
    backgroundColor: '#fee2e2',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  updateButton: {
    flex: 1,
  },
  editButton: {
    flex: 1,
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
  dropdownContainer: {
    marginBottom: 16,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dropdownIcon: {
    marginRight: 12,
  },
  dropdownText: {
    flex: 1,
    color: '#1f2937',
  },
  modalButton: {
    marginTop: 8,
  },
  deleteButton: {
    borderColor: '#ef4444',
  },
  modalUpdateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  targetActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  targetEditButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#6366f1',
  },
  targetDeleteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
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
  progressTargetTitle: {
    fontWeight: '600',
    marginBottom: 8,
    color: '#1f2937',
  },
  progressInfo: {
    color: '#666',
    marginBottom: 4,
  },
})

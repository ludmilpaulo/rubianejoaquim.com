/**
 * Functional "Tirar dinheiro do orçamento" screen
 * Allows users to track expenses from budgets with date filters and real-time tracking
 */
import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native'
import { Text, Card, Button, FAB, Chip, Portal, Modal, TextInput, Menu } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useRoute } from '@react-navigation/native'
import { personalFinanceApi } from '../services/api'
import { formatCurrency } from '../utils/currency'
import DatePicker from '../components/DatePicker'
import PeriodSelector, { getDefaultPeriod, getPeriodParams, type PeriodState } from '../components/PeriodSelector'

interface Budget {
  id: number
  category_name?: string
  amount: string
  period_type?: string
  date?: string
  start_date?: string
  end_date?: string
  month: number
  year: number
  spent: string
  remaining: string
  percentage_used: string
}

interface Expense {
  id: number
  category_name?: string
  category_icon?: string
  category_color?: string
  amount: string
  description: string
  date: string
  payment_method: string
}

export default function TirarDinheiroOrcamentoScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const routeParams = (route.params as { budgetId?: number }) || {}
  const [periodState, setPeriodState] = useState<PeriodState>(getDefaultPeriod)
  const [refreshing, setRefreshing] = useState(false)
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null)
  const [budgetExpenses, setBudgetExpenses] = useState<Expense[]>([])
  const [loadingExpenses, setLoadingExpenses] = useState(false)
  const [showBudgetMenu, setShowBudgetMenu] = useState(false)
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const [expenseForm, setExpenseForm] = useState({
    budget_id: '',
    amount: '',
    description: '',
    date: new Date(),
    payment_method: 'cash',
  })

  useEffect(() => {
    loadBudgets()
  }, [periodState.period, periodState.month, periodState.year, periodState.dateFrom, periodState.dateTo])

  useEffect(() => {
    if (selectedBudget) {
      loadBudgetExpenses(selectedBudget.id)
    }
  }, [selectedBudget])

  const loadBudgets = async () => {
    try {
      let budgetsRes
      if (periodState.period === 'custom' && periodState.dateFrom && periodState.dateTo) {
        const dateFrom = periodState.dateFrom.toISOString().split('T')[0]
        const dateTo = periodState.dateTo.toISOString().split('T')[0]
        budgetsRes = await personalFinanceApi.getBudgets(undefined, undefined, dateFrom, dateTo)
      } else if (periodState.period === 'daily' && periodState.dateFrom) {
        const dateFrom = periodState.dateFrom.toISOString().split('T')[0]
        const dateTo = periodState.dateFrom.toISOString().split('T')[0]
        budgetsRes = await personalFinanceApi.getBudgets(undefined, undefined, dateFrom, dateTo)
      } else {
        const month = periodState.period === 'monthly' ? periodState.month : new Date().getMonth() + 1
        const year = periodState.period === 'yearly' ? periodState.year : periodState.year
        budgetsRes = await personalFinanceApi.getBudgets(month, year)
      }
      
      const budgetsData = Array.isArray(budgetsRes) ? budgetsRes : budgetsRes.results || []
      setBudgets(budgetsData)
      
      // Auto-select budget if passed via route params
      if (routeParams.budgetId && !selectedBudget) {
        const budget = budgetsData.find((b: Budget) => b.id === routeParams.budgetId)
        if (budget) {
          setSelectedBudget(budget)
        }
      }
    } catch (error) {
      console.error('Error loading budgets:', error)
    }
  }

  const loadBudgetExpenses = async (budgetId: number) => {
    try {
      setLoadingExpenses(true)
      const response = await personalFinanceApi.getBudgetExpenses(budgetId)
      setBudgetExpenses(response.expenses || [])
    } catch (error) {
      console.error('Error loading budget expenses:', error)
      setBudgetExpenses([])
    } finally {
      setLoadingExpenses(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadBudgets()
    if (selectedBudget) {
      await loadBudgetExpenses(selectedBudget.id)
    }
    setRefreshing(false)
  }

  const handleSaveExpense = async () => {
    if (!selectedBudget) {
      Alert.alert('Erro', 'Selecione um orçamento primeiro')
      return
    }
    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) {
      Alert.alert('Erro', 'Digite um valor válido')
      return
    }
    if (!expenseForm.description.trim()) {
      Alert.alert('Erro', 'Digite uma descrição')
      return
    }

    try {
      // Find category ID from budget's category_name
      let categoryId: number | null = null
      if (selectedBudget.category_name) {
        const category = categories.find(c => c.name === selectedBudget.category_name)
        categoryId = category?.id || null
      }
      
      const expenseData = {
        category: categoryId,
        amount: expenseForm.amount,
        description: expenseForm.description.trim(),
        date: expenseForm.date.toISOString().split('T')[0],
        payment_method: expenseForm.payment_method,
      }
      
      await personalFinanceApi.createExpense(expenseData)
      setShowExpenseModal(false)
      setExpenseForm({
        budget_id: '',
        amount: '',
        description: '',
        date: new Date(),
        payment_method: 'cash',
      })
      await loadBudgets()
      await loadBudgetExpenses(selectedBudget.id)
      Alert.alert('Sucesso', 'Despesa adicionada ao orçamento')
    } catch (error: any) {
      console.error('Error saving expense:', error)
      Alert.alert('Erro', error.response?.data?.error || 'Erro ao adicionar despesa')
    }
  }

  const handleDeleteExpense = async (expenseId: number) => {
    Alert.alert(
      'Confirmar Exclusão',
      'Tem certeza que deseja excluir esta despesa?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await personalFinanceApi.deleteExpense(expenseId)
              if (selectedBudget) {
                await loadBudgetExpenses(selectedBudget.id)
                await loadBudgets()
              }
            } catch (error) {
              console.error('Error deleting expense:', error)
              Alert.alert('Erro', 'Não foi possível excluir a despesa')
            }
          },
        },
      ]
    )
  }

  const getBudgetPeriodLabel = (budget: Budget) => {
    if (budget.period_type === 'daily' && budget.date) {
      return new Date(budget.date).toLocaleDateString('pt-PT')
    }
    if (budget.period_type === 'monthly') {
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
      return `${months[budget.month - 1]} ${budget.year}`
    }
    if (budget.period_type === 'yearly') {
      return String(budget.year)
    }
    if (budget.period_type === 'custom' && budget.start_date && budget.end_date) {
      return `${new Date(budget.start_date).toLocaleDateString('pt-PT')} - ${new Date(budget.end_date).toLocaleDateString('pt-PT')}`
    }
    return `${budget.month}/${budget.year}`
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#1f2937" />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text variant="headlineSmall" style={styles.title}>Tirar dinheiro do orçamento</Text>
              <Text variant="bodySmall" style={styles.subtitle}>
                Adicione despesas e acompanhe o que resta do seu orçamento
              </Text>
            </View>
          </View>

          {/* Period Selector */}
          <View style={styles.periodSection}>
            <Text variant="labelMedium" style={styles.periodLabel}>Filtrar por período</Text>
            <PeriodSelector state={periodState} onChange={setPeriodState} />
          </View>

          {/* Budget Selection */}
          <View style={styles.content}>
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.sectionTitle}>Selecione o orçamento</Text>
                <Menu
                  visible={showBudgetMenu}
                  onDismiss={() => setShowBudgetMenu(false)}
                  anchor={
                    <TouchableOpacity
                      style={styles.budgetSelector}
                      onPress={() => setShowBudgetMenu(true)}
                    >
                      <View style={styles.budgetSelectorContent}>
                        <MaterialCommunityIcons name="wallet-outline" size={20} color="#6366f1" />
                        <Text variant="bodyLarge" style={styles.budgetSelectorText}>
                          {selectedBudget 
                            ? `${selectedBudget.category_name || 'Geral'} - ${getBudgetPeriodLabel(selectedBudget)}`
                            : 'Selecione um orçamento'}
                        </Text>
                      </View>
                      <MaterialCommunityIcons name="chevron-down" size={20} color="#9ca3af" />
                    </TouchableOpacity>
                  }
                >
                  {budgets.length === 0 ? (
                    <Menu.Item title="Nenhum orçamento disponível" disabled />
                  ) : (
                    budgets.map((budget) => (
                      <Menu.Item
                        key={budget.id}
                        onPress={() => {
                          setSelectedBudget(budget)
                          setShowBudgetMenu(false)
                        }}
                        title={`${budget.category_name || 'Geral'} - ${getBudgetPeriodLabel(budget)}`}
                        titleStyle={selectedBudget?.id === budget.id ? { fontWeight: '600' } : {}}
                      />
                    ))
                  )}
                </Menu>
              </Card.Content>
            </Card>

            {/* Selected Budget Info */}
            {selectedBudget && (
              <Card style={styles.budgetCard}>
                <Card.Content>
                  <View style={styles.budgetHeader}>
                    <View>
                      <Text variant="titleLarge" style={styles.budgetTitle}>
                        {selectedBudget.category_name || 'Geral'}
                      </Text>
                      <Text variant="bodySmall" style={styles.budgetPeriod}>
                        {getBudgetPeriodLabel(selectedBudget)}
                      </Text>
                    </View>
                    <View style={styles.budgetAmount}>
                      <Text variant="headlineMedium" style={styles.budgetAmountValue}>
                        {formatCurrency(parseFloat(selectedBudget.amount))}
                      </Text>
                      <Text variant="bodySmall" style={styles.budgetAmountLabel}>Orçamento</Text>
                    </View>
                  </View>

                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(parseFloat(selectedBudget.percentage_used), 100)}%`,
                          backgroundColor: parseFloat(selectedBudget.percentage_used) > 100 ? '#ef4444' : '#6366f1',
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.budgetStats}>
                    <View style={styles.statItem}>
                      <Text variant="bodySmall" style={styles.statLabel}>Gasto</Text>
                      <Text variant="titleMedium" style={styles.statValue}>
                        {formatCurrency(parseFloat(selectedBudget.spent))}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text variant="bodySmall" style={styles.statLabel}>Restante</Text>
                      <Text 
                        variant="titleMedium" 
                        style={[
                          styles.statValue,
                          parseFloat(selectedBudget.remaining) < 0 && styles.statValueNegative
                        ]}
                      >
                        {formatCurrency(parseFloat(selectedBudget.remaining))}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text variant="bodySmall" style={styles.statLabel}>Usado</Text>
                      <Text variant="titleMedium" style={styles.statValue}>
                        {parseFloat(selectedBudget.percentage_used).toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            )}

            {/* Expenses List */}
            {selectedBudget && (
              <View style={styles.expensesSection}>
                <View style={styles.sectionHeader}>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    Despesas ({budgetExpenses.length})
                  </Text>
                  <Button
                    mode="contained"
                    compact
                    icon="plus"
                    onPress={() => setShowExpenseModal(true)}
                  >
                    Adicionar
                  </Button>
                </View>

                {loadingExpenses ? (
                  <Card style={styles.card}>
                    <Card.Content style={styles.emptyContent}>
                      <Text variant="bodyMedium">Carregando despesas...</Text>
                    </Card.Content>
                  </Card>
                ) : budgetExpenses.length === 0 ? (
                  <Card style={styles.card}>
                    <Card.Content style={styles.emptyContent}>
                      <MaterialCommunityIcons name="cash-minus" size={48} color="#ccc" />
                      <Text variant="bodyMedium" style={styles.emptyText}>
                        Nenhuma despesa registada neste orçamento
                      </Text>
                      <Button mode="outlined" onPress={() => setShowExpenseModal(true)}>
                        Adicionar primeira despesa
                      </Button>
                    </Card.Content>
                  </Card>
                ) : (
                  budgetExpenses.map((expense) => (
                    <Card key={expense.id} style={styles.expenseCard}>
                      <Card.Content>
                        <View style={styles.expenseHeader}>
                          <View style={styles.expenseLeft}>
                            <View style={[
                              styles.categoryIcon,
                              { backgroundColor: expense.category_color || '#6366f1' }
                            ]}>
                              <MaterialCommunityIcons 
                                name={expense.category_icon as any || 'tag'} 
                                size={20} 
                                color="#fff" 
                              />
                            </View>
                            <View style={styles.expenseInfo}>
                              <Text variant="titleMedium">{expense.description}</Text>
                              <View style={styles.expenseMeta}>
                                <Chip icon="calendar" compact style={styles.chip}>
                                  {new Date(expense.date).toLocaleDateString('pt-PT')}
                                </Chip>
                                <Chip icon="credit-card" compact style={styles.chip}>
                                  {expense.payment_method}
                                </Chip>
                              </View>
                            </View>
                          </View>
                          <View style={styles.expenseRight}>
                            <Text variant="headlineSmall" style={styles.expenseAmount}>
                              {formatCurrency(parseFloat(expense.amount))}
                            </Text>
                            <TouchableOpacity
                              onPress={() => handleDeleteExpense(expense.id)}
                              style={styles.deleteButton}
                            >
                              <MaterialCommunityIcons name="delete-outline" size={20} color="#ef4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </Card.Content>
                    </Card>
                  ))
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Add Expense FAB */}
        {selectedBudget && (
          <FAB
            icon="plus"
            style={styles.fab}
            onPress={() => setShowExpenseModal(true)}
          />
        )}

        {/* Add Expense Modal */}
        <Portal>
          <Modal
            visible={showExpenseModal}
            onDismiss={() => {
              setShowExpenseModal(false)
              setExpenseForm({
                budget_id: '',
                amount: '',
                description: '',
                date: new Date(),
                payment_method: 'cash',
              })
            }}
            contentContainerStyle={styles.modal}
          >
            <ScrollView>
              <Text variant="headlineSmall" style={styles.modalTitle}>
                Adicionar despesa ao orçamento
              </Text>
              {selectedBudget && (
                <Text variant="bodyMedium" style={styles.modalSubtitle}>
                  {selectedBudget.category_name || 'Geral'} - {getBudgetPeriodLabel(selectedBudget)}
                </Text>
              )}

              <TextInput
                label="Valor (KZ)"
                value={expenseForm.amount}
                onChangeText={(text) => setExpenseForm({ ...expenseForm, amount: text })}
                keyboardType="decimal-pad"
                style={styles.input}
                left={<TextInput.Icon icon="currency-usd" />}
              />

              <TextInput
                label="Descrição"
                value={expenseForm.description}
                onChangeText={(text) => setExpenseForm({ ...expenseForm, description: text })}
                multiline
                numberOfLines={3}
                style={styles.input}
                left={<TextInput.Icon icon="text" />}
              />

              <DatePicker
                label="Data"
                value={expenseForm.date}
                onChange={(date) => setExpenseForm({ ...expenseForm, date: date || new Date() })}
              />

              <View style={styles.paymentMethodSection}>
                <Text variant="bodyMedium" style={styles.label}>Método de pagamento</Text>
                <View style={styles.paymentMethodGrid}>
                  {['cash', 'card', 'transfer', 'other'].map((method) => (
                    <Button
                      key={method}
                      mode={expenseForm.payment_method === method ? 'contained' : 'outlined'}
                      onPress={() => setExpenseForm({ ...expenseForm, payment_method: method })}
                      style={styles.paymentMethodButton}
                    >
                      {method === 'cash' ? 'Dinheiro' :
                       method === 'card' ? 'Cartão' :
                       method === 'transfer' ? 'Transferência' : 'Outro'}
                    </Button>
                  ))}
                </View>
              </View>

              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setShowExpenseModal(false)
                    setExpenseForm({
                      budget_id: '',
                      amount: '',
                      description: '',
                      date: new Date(),
                      payment_method: 'cash',
                    })
                  }}
                >
                  Cancelar
                </Button>
                <Button mode="contained" onPress={handleSaveExpense}>
                  Adicionar Despesa
                </Button>
              </View>
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
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    color: '#6b7280',
  },
  periodSection: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  periodLabel: {
    color: '#6b7280',
    marginBottom: 8,
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  budgetSelector: {
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
  budgetSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  budgetSelectorText: {
    flex: 1,
    color: '#1f2937',
  },
  budgetCard: {
    marginTop: 16,
    backgroundColor: '#6366f1',
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  budgetTitle: {
    color: '#ffffff',
    fontWeight: '700',
    marginBottom: 4,
  },
  budgetPeriod: {
    color: '#ffffff',
    opacity: 0.9,
  },
  budgetAmount: {
    alignItems: 'flex-end',
  },
  budgetAmountValue: {
    color: '#ffffff',
    fontWeight: '700',
  },
  budgetAmountLabel: {
    color: '#ffffff',
    opacity: 0.9,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 4,
  },
  statValue: {
    color: '#ffffff',
    fontWeight: '700',
  },
  statValueNegative: {
    color: '#fca5a5',
  },
  expensesSection: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 16,
    marginBottom: 24,
    color: '#9ca3af',
    textAlign: 'center',
  },
  expenseCard: {
    marginBottom: 12,
    borderRadius: 12,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  expenseLeft: {
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseInfo: {
    flex: 1,
  },
  expenseMeta: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  chip: {
    marginRight: 4,
  },
  expenseRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  expenseAmount: {
    fontWeight: '700',
    color: '#ef4444',
  },
  deleteButton: {
    padding: 4,
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
    maxHeight: '90%',
  },
  modalTitle: {
    fontWeight: '700',
    marginBottom: 8,
    color: '#1f2937',
  },
  modalSubtitle: {
    color: '#6b7280',
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  label: {
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: '600',
  },
  paymentMethodSection: {
    marginBottom: 24,
  },
  paymentMethodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  paymentMethodButton: {
    flex: 1,
    minWidth: '45%',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
})

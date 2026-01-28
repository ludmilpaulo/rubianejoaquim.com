import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Dimensions, Alert, Text as RNText } from 'react-native'
import { Text, Card, Button, FAB, Chip, Portal, Modal, TextInput, SegmentedButtons, Menu, IconButton } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit'
import { personalFinanceApi } from '../services/api'
import { formatCurrency } from '../utils/currency'
import DatePicker from '../components/DatePicker'

const { width } = Dimensions.get('window')

interface Expense {
  id: number
  category?: number
  category_id?: number
  category_name?: string
  category_icon?: string
  category_color?: string
  amount: string
  description: string
  date: string
  payment_method: string
}

interface Budget {
  id: number
  category_name?: string
  amount: string
  month: number
  year: number
  period_type?: string
  start_date?: string
  end_date?: string
  spent: string
  remaining: string
  percentage_used: string
}

interface Goal {
  id: number
  title: string
  target_amount: string
  current_amount: string
  target_date: string
  status: string
  progress_percentage: string
  remaining_amount: string
}

interface Debt {
  id: number
  creditor: string
  total_amount: string
  paid_amount: string
  due_date: string
  status: string
  progress_percentage: string
  remaining_amount: string
}

interface Category {
  id: number
  name: string
  icon: string
  color: string
}

export default function PersonalFinanceScreen() {
  const [activeTab, setActiveTab] = useState<'principios' | 'overview' | 'expenses' | 'budgets' | 'goals' | 'debts'>('principios')
  const [refreshing, setRefreshing] = useState(false)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  
  // Modals
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [showDebtModal, setShowDebtModal] = useState(false)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false)
  const [showBudgetPeriodMenu, setShowBudgetPeriodMenu] = useState(false)
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [addMoneyAmount, setAddMoneyAmount] = useState('')
  
  // Category form
  const [categoryForm, setCategoryForm] = useState({ name: '', icon: 'tag', color: '#6366f1' })
  
  // Form states
  const [expenseForm, setExpenseForm] = useState({ category: '', amount: '', description: '', date: new Date(), payment_method: 'cash' })
  const [budgetForm, setBudgetForm] = useState({ 
    category: '', 
    amount: '', 
    period_type: 'monthly',
    month: selectedMonth, 
    year: selectedYear,
    date: null as Date | null,
    start_date: null as Date | null,
    end_date: null as Date | null,
    description: '' 
  })
  const [goalForm, setGoalForm] = useState({ title: '', description: '', target_amount: '', target_date: null as Date | null, current_amount: '0' })
  const [debtForm, setDebtForm] = useState({ creditor: '', total_amount: '', paid_amount: '0', interest_rate: '0', due_date: null as Date | null, description: '' })

  // Regras de Ouro (Fundamentos das Finanças Pessoais)
  const [regrasRendimento, setRegrasRendimento] = useState('')
  const [regrasValorGastar, setRegrasValorGastar] = useState('')
  const [regrasDisponivel, setRegrasDisponivel] = useState('')

  useEffect(() => {
    loadData()
  }, [selectedMonth, selectedYear])

  const loadData = async () => {
    try {
      const [expensesRes, budgetsRes, goalsRes, debtsRes, categoriesRes, summaryRes] = await Promise.all([
        personalFinanceApi.getExpenses(selectedMonth, selectedYear),
        personalFinanceApi.getBudgets(selectedMonth, selectedYear),
        personalFinanceApi.getGoals(),
        personalFinanceApi.getDebts(),
        personalFinanceApi.getCategories(true),
        personalFinanceApi.getExpensesSummary(),
      ])
      
      setExpenses(Array.isArray(expensesRes) ? expensesRes : expensesRes.results || [])
      setBudgets(Array.isArray(budgetsRes) ? budgetsRes : budgetsRes.results || [])
      setGoals(Array.isArray(goalsRes) ? goalsRes : goalsRes.results || [])
      setDebts(Array.isArray(debtsRes) ? debtsRes : debtsRes.results || [])
      setCategories(Array.isArray(categoriesRes) ? categoriesRes : categoriesRes.results || [])
      setSummary(summaryRes)
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const handleSaveExpense = async () => {
    try {
      const expenseData: any = {
        amount: expenseForm.amount,
        description: expenseForm.description,
        date: expenseForm.date.toISOString().split('T')[0],
        payment_method: expenseForm.payment_method,
      }
      
      // Add category ID if selected
      if (expenseForm.category) {
        expenseData.category = parseInt(expenseForm.category)
      }
      
      if (editingItem) {
        await personalFinanceApi.updateExpense(editingItem.id, expenseData)
      } else {
        await personalFinanceApi.createExpense(expenseData)
      }
      setShowExpenseModal(false)
      setEditingItem(null)
      resetExpenseForm()
      loadData()
    } catch (error: any) {
      console.error('Error saving expense:', error)
      Alert.alert('Erro', error.response?.data?.error || 'Não foi possível salvar a despesa. Tente novamente.')
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
              loadData()
            } catch (error: any) {
              console.error('Error deleting expense:', error)
              Alert.alert('Erro', error.response?.data?.error || 'Não foi possível excluir a despesa. Tente novamente.')
            }
          },
        },
      ]
    )
  }

  const handleSaveCategory = async () => {
    try {
      await personalFinanceApi.createCategory({
        ...categoryForm,
        is_personal: true,
      })
      setShowCategoryModal(false)
      setCategoryForm({ name: '', icon: 'tag', color: '#6366f1' })
      loadData() // Reload to get new categories
    } catch (error: any) {
      console.error('Error saving category:', error)
      Alert.alert('Erro', error.response?.data?.error || 'Não foi possível criar a categoria. Tente novamente.')
    }
  }

  const handleSaveBudget = async () => {
    try {
      // Format budget data based on period type
      const budgetData: any = {
        category: budgetForm.category,
        amount: budgetForm.amount,
        period_type: budgetForm.period_type,
        description: budgetForm.description,
      }

      // Add period-specific fields
      if (budgetForm.period_type === 'daily' && budgetForm.date) {
        budgetData.date = budgetForm.date.toISOString().split('T')[0]
        budgetData.month = budgetForm.date.getMonth() + 1
        budgetData.year = budgetForm.date.getFullYear()
      } else if (budgetForm.period_type === 'monthly') {
        budgetData.month = budgetForm.month
        budgetData.year = budgetForm.year
      } else if (budgetForm.period_type === 'yearly') {
        budgetData.year = budgetForm.year
        budgetData.month = 1 // Default to January for yearly
      } else if (budgetForm.period_type === 'custom') {
        if (budgetForm.start_date) {
          budgetData.start_date = budgetForm.start_date.toISOString().split('T')[0]
          budgetData.month = budgetForm.start_date.getMonth() + 1
          budgetData.year = budgetForm.start_date.getFullYear()
        }
        if (budgetForm.end_date) {
          budgetData.end_date = budgetForm.end_date.toISOString().split('T')[0]
        }
      }

      if (editingItem) {
        await personalFinanceApi.updateBudget(editingItem.id, budgetData)
      } else {
        await personalFinanceApi.createBudget(budgetData)
      }
      setShowBudgetModal(false)
      setEditingItem(null)
      resetBudgetForm()
      loadData()
    } catch (error) {
      console.error('Error saving budget:', error)
    }
  }

  const handleSaveGoal = async () => {
    try {
      const goalData = {
        ...goalForm,
        target_date: goalForm.target_date 
          ? `${goalForm.target_date.getFullYear()}-${String(goalForm.target_date.getMonth() + 1).padStart(2, '0')}-${String(goalForm.target_date.getDate()).padStart(2, '0')}`
          : '',
      }
      if (editingItem) {
        await personalFinanceApi.updateGoal(editingItem.id, goalData)
      } else {
        await personalFinanceApi.createGoal(goalData)
      }
      setShowGoalModal(false)
      setEditingItem(null)
      resetGoalForm()
      loadData()
    } catch (error) {
      console.error('Error saving goal:', error)
    }
  }

  const handleAddMoneyToGoal = async () => {
    if (!selectedGoal || !addMoneyAmount || parseFloat(addMoneyAmount) <= 0) {
      Alert.alert('Erro', 'Por favor, insira um valor válido.')
      return
    }

    try {
      await personalFinanceApi.addMoneyToGoal(selectedGoal.id, parseFloat(addMoneyAmount))
      setShowAddMoneyModal(false)
      setSelectedGoal(null)
      setAddMoneyAmount('')
      loadData()
      Alert.alert('Sucesso', 'Valor adicionado ao objetivo com sucesso!')
    } catch (error: any) {
      console.error('Error adding money to goal:', error)
      Alert.alert('Erro', error.response?.data?.error || 'Não foi possível adicionar o valor. Tente novamente.')
    }
  }

  const openAddMoneyModal = (goal: Goal) => {
    setSelectedGoal(goal)
    setAddMoneyAmount('')
    setShowAddMoneyModal(true)
  }

  const handleSaveDebt = async () => {
    try {
      const debtData = {
        ...debtForm,
        due_date: debtForm.due_date
          ? `${debtForm.due_date.getFullYear()}-${String(debtForm.due_date.getMonth() + 1).padStart(2, '0')}-${String(debtForm.due_date.getDate()).padStart(2, '0')}`
          : '',
      }
      if (editingItem) {
        await personalFinanceApi.updateDebt(editingItem.id, debtData)
      } else {
        await personalFinanceApi.createDebt(debtData)
      }
      setShowDebtModal(false)
      setEditingItem(null)
      resetDebtForm()
      loadData()
    } catch (error) {
      console.error('Error saving debt:', error)
    }
  }

  const resetExpenseForm = () => setExpenseForm({ category: '', amount: '', description: '', date: new Date(), payment_method: 'cash' })
  const resetBudgetForm = () => setBudgetForm({ 
    category: '', 
    amount: '', 
    period_type: 'monthly',
    month: selectedMonth, 
    year: selectedYear,
    date: null,
    start_date: null,
    end_date: null,
    description: '' 
  })
  const resetGoalForm = () => setGoalForm({ title: '', description: '', target_amount: '', target_date: null, current_amount: '0' })
  const resetDebtForm = () => setDebtForm({ creditor: '', total_amount: '', paid_amount: '0', interest_rate: '0', due_date: null, description: '' })

  const openEditExpense = (expense: Expense) => {
    setEditingItem(expense)
    // Parse date string to Date object
    let expenseDate = new Date()
    if (expense.date) {
      const dateParts = expense.date.split('-')
      if (dateParts.length === 3) {
        expenseDate = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]))
      }
    }
    // Get category ID (could be category, category_id, or find by name)
    const categoryId = expense.category || expense.category_id || 
      (expense.category_name ? categories.find(c => c.name === expense.category_name)?.id?.toString() : '') || ''
    setExpenseForm({
      category: categoryId.toString(),
      amount: expense.amount,
      description: expense.description,
      date: expenseDate,
      payment_method: expense.payment_method,
    })
    setShowExpenseModal(true)
  }

  const openEditBudget = (budget: Budget) => {
    setEditingItem(budget)
    setBudgetForm({
      category: budget.category_name || '',
      amount: budget.amount,
      period_type: budget.period_type || 'monthly',
      month: budget.month,
      year: budget.year,
      date: budget.start_date ? new Date(budget.start_date) : null,
      start_date: budget.start_date ? new Date(budget.start_date) : null,
      end_date: budget.end_date ? new Date(budget.end_date) : null,
      description: '',
    })
    setShowBudgetModal(true)
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
  const activeGoals = goals.filter(g => g.status === 'active')
  const activeDebts = debts.filter(d => d.status === 'active' || d.status === 'overdue')

  const chartData = summary?.by_category?.slice(0, 5).map((cat: any) => ({
    name: cat.category__name || 'Outros',
    amount: parseFloat(cat.total),
    color: '#6366f1',
    legendFontColor: '#7F7F7F',
    legendFontSize: 12,
  })) || []

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerIconContainer}>
              <MaterialCommunityIcons name="wallet" size={28} color="#6366f1" />
            </View>
            <View style={styles.headerText}>
              <Text variant="headlineMedium" style={styles.title}>Finanças Pessoais</Text>
              <Text variant="bodySmall" style={styles.headerSubtitle}>
                {new Date(selectedYear, selectedMonth - 1).toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
              </Text>
            </View>
          </View>
        </View>


        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <Card.Content style={styles.summaryContent}>
            <View style={styles.summaryHeader}>
              <View>
                <Text variant="bodySmall" style={styles.summaryLabel}>Despesas do Mês</Text>
                <Text variant="headlineLarge" style={styles.summaryAmount}>
                  {formatCurrency(totalExpenses)}
                </Text>
              </View>
              <View style={styles.summaryIcon}>
                <MaterialCommunityIcons name="chart-line" size={32} color="#ffffff" />
              </View>
            </View>
            {summary && (
              <View style={styles.summaryStats}>
                <View style={styles.summaryStatItem}>
                  <MaterialCommunityIcons name="receipt" size={16} color="#ffffff" />
                  <Text variant="bodySmall" style={styles.summaryStat}>
                    {summary.count || 0} transações
                  </Text>
                </View>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
            {[
              { key: 'principios', label: 'Regras de Ouro', icon: 'lightbulb-on' },
              { key: 'overview', label: 'Visão Geral', icon: 'view-dashboard' },
              { key: 'expenses', label: 'Despesas', icon: 'cash-minus' },
              { key: 'budgets', label: 'Orçamentos', icon: 'wallet' },
              { key: 'goals', label: 'Objetivos', icon: 'target' },
              { key: 'debts', label: 'Dívidas', icon: 'credit-card' },
            ].map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key as any)}
              >
                <MaterialCommunityIcons
                  name={tab.icon as any}
                  size={20}
                  color={activeTab === tab.key ? '#6366f1' : '#666'}
                />
                <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content based on active tab */}
        {activeTab === 'principios' && (
          <View style={styles.content}>
            {/* Regra 1: Divisão dos 100% - Visual Calculator */}
            <Card style={styles.goldenRuleCard}>
              <Card.Content>
                <View style={styles.ruleHeader}>
                  <View style={styles.ruleIconContainer}>
                    <MaterialCommunityIcons name="chart-pie" size={32} color="#6366f1" />
                  </View>
                  <View style={styles.ruleHeaderText}>
                    <Text variant="titleLarge" style={styles.ruleTitle}>Divisão dos 100%</Text>
                    <Text variant="bodySmall" style={styles.ruleSubtitle}>50% Fixas • 30% Desejos • 20% Poupança</Text>
                  </View>
                </View>

                {/* Visual Pie Representation */}
                <View style={styles.pieVisual}>
                  <View style={styles.pieSegment50}>
                    <Text variant="headlineSmall" style={styles.piePercent}>50%</Text>
                  </View>
                  <View style={styles.pieSegment30}>
                    <Text variant="headlineSmall" style={styles.piePercent}>30%</Text>
                  </View>
                  <View style={styles.pieSegment20}>
                    <Text variant="headlineSmall" style={styles.piePercent}>20%</Text>
                  </View>
                </View>

                {/* Calculator */}
                <View style={styles.calculatorSection}>
                  <TextInput
                    mode="outlined"
                    label="Rendimento mensal (KZ)"
                    value={regrasRendimento}
                    onChangeText={setRegrasRendimento}
                    keyboardType="decimal-pad"
                    style={styles.calculatorInput}
                    left={<TextInput.Icon icon="currency-usd" />}
                  />
                  {regrasRendimento !== '' && parseFloat(regrasRendimento.replace(',', '.')) > 0 && (
                    <View style={styles.resultsGrid}>
                      <View style={[styles.resultCard, styles.resultCard50]}>
                        <View style={styles.resultIconContainer}>
                          <MaterialCommunityIcons name="home" size={32} color="#3b82f6" />
                        </View>
                        <Text variant="labelLarge" style={styles.resultPercentage}>50%</Text>
                        <Text variant="bodyMedium" style={styles.resultLabel}>Fixas</Text>
                        <Text variant="headlineSmall" style={styles.resultValue}>
                          {formatCurrency(parseFloat(regrasRendimento.replace(',', '.')) * 0.5)}
                        </Text>
                      </View>
                      <View style={[styles.resultCard, styles.resultCard30]}>
                        <View style={styles.resultIconContainer}>
                          <MaterialCommunityIcons name="heart" size={32} color="#ec4899" />
                        </View>
                        <Text variant="labelLarge" style={styles.resultPercentage}>30%</Text>
                        <Text variant="bodyMedium" style={styles.resultLabel}>Desejos</Text>
                        <Text variant="headlineSmall" style={styles.resultValue}>
                          {formatCurrency(parseFloat(regrasRendimento.replace(',', '.')) * 0.3)}
                        </Text>
                      </View>
                      <View style={[styles.resultCard, styles.resultCard20]}>
                        <View style={styles.resultIconContainer}>
                          <MaterialCommunityIcons name="piggy-bank" size={32} color="#10b981" />
                        </View>
                        <Text variant="labelLarge" style={styles.resultPercentage}>20%</Text>
                        <Text variant="bodyMedium" style={styles.resultLabel}>Poupança</Text>
                        <Text variant="headlineSmall" style={styles.resultValue}>
                          {formatCurrency(parseFloat(regrasRendimento.replace(',', '.')) * 0.2)}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </Card.Content>
            </Card>

            {/* Regra 2: 3x antes de gastar - Quick Check */}
            <Card style={[styles.goldenRuleCard, styles.ruleCard3x]}>
              <Card.Content>
                <View style={styles.ruleHeader}>
                  <View style={[styles.ruleIconContainer, styles.ruleIcon3x]}>
                    <MaterialCommunityIcons name="shield-check" size={32} color="#10b981" />
                  </View>
                  <View style={styles.ruleHeaderText}>
                    <Text variant="titleLarge" style={styles.ruleTitle}>Regra 3×</Text>
                    <Text variant="bodySmall" style={styles.ruleSubtitle}>Precisas de 3× o valor antes de gastar</Text>
                  </View>
                </View>

                <View style={styles.checkerSection}>
                  <TextInput
                    mode="outlined"
                    label="Quero gastar (KZ)"
                    value={regrasValorGastar}
                    onChangeText={setRegrasValorGastar}
                    keyboardType="decimal-pad"
                    style={styles.calculatorInput}
                    left={<TextInput.Icon icon="cash-minus" />}
                  />
                  <TextInput
                    mode="outlined"
                    label="Tenho disponível (KZ)"
                    value={regrasDisponivel}
                    onChangeText={setRegrasDisponivel}
                    keyboardType="decimal-pad"
                    style={styles.calculatorInput}
                    placeholder={regrasRendimento && parseFloat(regrasRendimento.replace(',', '.')) > 0 ? `Sugestão: ${formatCurrency(parseFloat(regrasRendimento.replace(',', '.')) * 0.3)}` : 'Opcional'}
                    left={<TextInput.Icon icon="wallet" />}
                  />
                  {(() => {
                    const parseNum = (s: string) => parseFloat((s || '').replace(',', '.')) || 0
                    const rend = parseNum(regrasRendimento)
                    const gastar = parseNum(regrasValorGastar)
                    const disp = parseNum(regrasDisponivel) || (rend > 0 ? rend * 0.3 : 0)
                    const precisa3x = gastar * 3
                    if (gastar > 0 && disp > 0) {
                      const pode = disp >= precisa3x
                      return (
                        <View style={[styles.verificationResult, pode ? styles.verificationOk : styles.verificationWarning]}>
                          <MaterialCommunityIcons 
                            name={pode ? 'check-circle' : 'alert-circle'} 
                            size={40} 
                            color={pode ? '#10b981' : '#f59e0b'} 
                          />
                          <View style={styles.verificationContent}>
                            <Text variant="titleLarge" style={[styles.verificationTitle, { color: pode ? '#10b981' : '#b45309' }]}>
                              {pode ? 'Podes gastar ✓' : 'Ainda não podes'}
                            </Text>
                            {pode ? (
                              <Text variant="bodyMedium" style={styles.verificationText}>
                                Tens {formatCurrency(disp)} disponível, suficiente para gastar {formatCurrency(gastar)}
                              </Text>
                            ) : (
                              <Text variant="bodyMedium" style={styles.verificationText}>
                                Precisas de {formatCurrency(precisa3x)} (3× {formatCurrency(gastar)}). Tens {formatCurrency(disp)}.
                              </Text>
                            )}
                          </View>
                        </View>
                      )
                    }
                    return null
                  })()}
                </View>
              </Card.Content>
            </Card>
          </View>
        )}

        {activeTab === 'overview' && (
          <View style={styles.content}>
            {/* Chart */}
            {chartData.length > 0 && (
              <Card style={styles.card}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.sectionTitle}>Despesas por Categoria</Text>
                  <PieChart
                    data={chartData}
                    width={width - 64}
                    height={220}
                    chartConfig={{
                      color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
                    }}
                    accessor="amount"
                    backgroundColor="transparent"
                    paddingLeft="15"
                  />
                </Card.Content>
              </Card>
            )}

            {/* Quick Stats */}
            <View style={styles.statsGrid}>
              <Card style={styles.statCard}>
                <Card.Content>
                  <MaterialCommunityIcons name="wallet" size={24} color="#6366f1" />
                  <Text variant="headlineSmall" style={styles.statValue}>{budgets.length}</Text>
                  <Text variant="bodySmall" style={styles.statLabel}>Orçamentos</Text>
                </Card.Content>
              </Card>
              <Card style={styles.statCard}>
                <Card.Content>
                  <MaterialCommunityIcons name="target" size={24} color="#10b981" />
                  <Text variant="headlineSmall" style={styles.statValue}>{activeGoals.length}</Text>
                  <Text variant="bodySmall" style={styles.statLabel}>Objetivos</Text>
                </Card.Content>
              </Card>
              <Card style={styles.statCard}>
                <Card.Content>
                  <MaterialCommunityIcons name="alert-circle" size={24} color="#ef4444" />
                  <Text variant="headlineSmall" style={styles.statValue}>{activeDebts.length}</Text>
                  <Text variant="bodySmall" style={styles.statLabel}>Dívidas</Text>
                </Card.Content>
              </Card>
            </View>
          </View>
        )}

        {activeTab === 'expenses' && (
          <View style={styles.content}>
            {expenses.length === 0 ? (
              <Card style={styles.card}>
                <Card.Content style={styles.emptyContent}>
                  <MaterialCommunityIcons name="cash-minus" size={64} color="#ccc" />
                  <Text variant="bodyLarge" style={styles.emptyText}>
                    Nenhuma despesa registada
                  </Text>
                  <Button mode="contained" onPress={() => setShowExpenseModal(true)}>
                    Adicionar Despesa
                  </Button>
                </Card.Content>
              </Card>
            ) : (
              expenses.map(expense => (
                <Card key={expense.id} style={styles.expenseCard}>
                  <Card.Content>
                    <TouchableOpacity onPress={() => openEditExpense(expense)}>
                      <View style={styles.expenseHeader}>
                        <View style={styles.expenseLeft}>
                          <View style={[styles.categoryIcon, { backgroundColor: expense.category_color || '#6366f1' }]}>
                            <MaterialCommunityIcons name={expense.category_icon as any || 'tag'} size={20} color="#fff" />
                          </View>
                          <View>
                            <Text variant="titleMedium">{expense.category_name || 'Sem categoria'}</Text>
                            <Text variant="bodySmall" style={styles.expenseDescription}>
                              {expense.description}
                            </Text>
                          </View>
                        </View>
                        <Text variant="titleLarge" style={styles.expenseAmount}>
                          {formatCurrency(parseFloat(expense.amount))}
                        </Text>
                      </View>
                      <View style={styles.expenseFooter}>
                        <Chip icon="calendar" compact>{new Date(expense.date).toLocaleDateString('pt-PT')}</Chip>
                        <Chip icon="credit-card" compact>{expense.payment_method}</Chip>
                      </View>
                    </TouchableOpacity>
                    <View style={styles.expenseActions}>
                      <TouchableOpacity
                        style={styles.editActionButton}
                        onPress={() => openEditExpense(expense)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.actionButtonContent}>
                          <MaterialCommunityIcons name="pencil" size={18} color="#6366f1" />
                          <RNText style={styles.editActionText}>Editar</RNText>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteActionButton}
                        onPress={() => handleDeleteExpense(expense.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.actionButtonContent}>
                          <MaterialCommunityIcons name="delete-outline" size={18} color="#ef4444" />
                          <Text style={styles.deleteActionText}>Excluir</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  </Card.Content>
                </Card>
              ))
            )}
          </View>
        )}

        {activeTab === 'budgets' && (
          <View style={styles.content}>
            {budgets.length === 0 ? (
              <Card style={styles.card}>
                <Card.Content style={styles.emptyContent}>
                  <MaterialCommunityIcons name="wallet" size={64} color="#ccc" />
                  <Text variant="bodyLarge" style={styles.emptyText}>
                    Nenhum orçamento criado
                  </Text>
                  <Button mode="contained" onPress={() => setShowBudgetModal(true)}>
                    Criar Orçamento
                  </Button>
                </Card.Content>
              </Card>
            ) : (
              budgets.map(budget => (
                <Card key={budget.id} style={styles.card} onPress={() => openEditBudget(budget)}>
                  <Card.Content>
                    <View style={styles.budgetHeader}>
                      <Text variant="titleMedium">{budget.category_name || 'Geral'}</Text>
                      <Text variant="headlineSmall">{formatCurrency(parseFloat(budget.amount))}</Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(parseFloat(budget.percentage_used), 100)}%`,
                            backgroundColor: parseFloat(budget.percentage_used) > 100 ? '#ef4444' : '#6366f1',
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.budgetFooter}>
                      <Text variant="bodySmall">Gasto: {formatCurrency(parseFloat(budget.spent))}</Text>
                      <Text variant="bodySmall">Restante: {formatCurrency(parseFloat(budget.remaining))}</Text>
                    </View>
                  </Card.Content>
                </Card>
              ))
            )}
          </View>
        )}

        {activeTab === 'goals' && (
          <View style={styles.content}>
            {goals.length === 0 ? (
              <Card style={styles.card}>
                <Card.Content style={styles.emptyContent}>
                  <MaterialCommunityIcons name="target" size={64} color="#ccc" />
                  <Text variant="bodyLarge" style={styles.emptyText}>
                    Nenhum objetivo definido
                  </Text>
                  <Button mode="contained" onPress={() => setShowGoalModal(true)}>
                    Criar Objetivo
                  </Button>
                </Card.Content>
              </Card>
            ) : (
              goals.map(goal => (
                <Card key={goal.id} style={styles.card}>
                  <Card.Content>
                    <View style={styles.goalHeader}>
                      <View style={styles.goalHeaderLeft}>
                        <Text variant="titleMedium">{goal.title}</Text>
                        <Text variant="bodySmall" style={styles.goalDescription}>{goal.description}</Text>
                      </View>
                      {goal.status === 'active' && (
                        <Chip
                          icon="check-circle"
                          style={styles.statusChip}
                        >
                          {goal.status === 'completed' ? 'Concluído' : goal.status === 'cancelled' ? 'Cancelado' : 'Ativo'}
                        </Chip>
                      )}
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(parseFloat(goal.progress_percentage), 100)}%`,
                            backgroundColor: goal.status === 'completed' ? '#10b981' : '#6366f1',
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.goalFooter}>
                      <Text variant="bodySmall">
                        {formatCurrency(parseFloat(goal.current_amount))} / {formatCurrency(parseFloat(goal.target_amount))}
                      </Text>
                      <Text variant="bodySmall">{parseFloat(goal.progress_percentage).toFixed(0)}%</Text>
                    </View>
                    {goal.status === 'active' && (
                      <Button
                        mode="contained"
                        onPress={() => openAddMoneyModal(goal)}
                        style={styles.addMoneyButton}
                        icon="plus-circle"
                      >
                        Adicionar Dinheiro
                      </Button>
                    )}
                  </Card.Content>
                </Card>
              ))
            )}
          </View>
        )}

        {activeTab === 'debts' && (
          <View style={styles.content}>
            {debts.length === 0 ? (
              <Card style={styles.card}>
                <Card.Content style={styles.emptyContent}>
                  <MaterialCommunityIcons name="credit-card" size={64} color="#ccc" />
                  <Text variant="bodyLarge" style={styles.emptyText}>
                    Nenhuma dívida registada
                  </Text>
                  <Button mode="contained" onPress={() => setShowDebtModal(true)}>
                    Adicionar Dívida
                  </Button>
                </Card.Content>
              </Card>
            ) : (
              debts.map(debt => (
                <Card key={debt.id} style={styles.card}>
                  <Card.Content>
                    <View style={styles.debtHeader}>
                      <Text variant="titleMedium">{debt.creditor}</Text>
                      <Chip
                        icon={debt.status === 'paid' ? 'check-circle' : debt.status === 'overdue' ? 'alert' : 'clock'}
                        style={[
                          styles.statusChip,
                          debt.status === 'paid' && styles.statusChipPaid,
                          debt.status === 'overdue' && styles.statusChipOverdue,
                        ]}
                      >
                        {debt.status === 'paid' ? 'Paga' : debt.status === 'overdue' ? 'Vencida' : 'Ativa'}
                      </Chip>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(parseFloat(debt.progress_percentage), 100)}%`,
                            backgroundColor: '#ef4444',
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.debtFooter}>
                      <Text variant="bodySmall">
                        Restante: {formatCurrency(parseFloat(debt.remaining_amount))}
                      </Text>
                      <Text variant="bodySmall">Vencimento: {new Date(debt.due_date).toLocaleDateString('pt-PT')}</Text>
                    </View>
                  </Card.Content>
                </Card>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      {activeTab !== 'principios' && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => {
            if (activeTab === 'expenses') setShowExpenseModal(true)
            else if (activeTab === 'budgets') setShowBudgetModal(true)
            else if (activeTab === 'goals') setShowGoalModal(true)
            else if (activeTab === 'debts') setShowDebtModal(true)
          }}
        />
      )}

      {/* Expense Modal */}
      <Portal>
        <Modal visible={showExpenseModal} onDismiss={() => { setShowExpenseModal(false); setEditingItem(null); resetExpenseForm() }} contentContainerStyle={styles.modal}>
          <ScrollView>
            <Text variant="headlineSmall" style={styles.modalTitle}>
              {editingItem ? 'Editar Despesa' : 'Nova Despesa'}
            </Text>
            
            {/* Category Selection */}
            <View style={styles.dropdownContainer}>
              <View style={styles.categoryHeader}>
                <Text variant="bodySmall" style={styles.label}>Categoria</Text>
                <Button
                  mode="text"
                  compact
                  onPress={() => setShowCategoryModal(true)}
                  icon="plus"
                >
                  Nova Categoria
                </Button>
              </View>
              <Menu
                visible={showCategoryMenu}
                onDismiss={() => setShowCategoryMenu(false)}
                anchor={
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowCategoryMenu(true)}
                  >
                    <View style={styles.dropdownContent}>
                      {expenseForm.category ? (
                        <>
                          {(() => {
                            const selectedCat = categories.find(c => c.id.toString() === expenseForm.category)
                            return selectedCat ? (
                              <>
                                <MaterialCommunityIcons
                                  name={selectedCat.icon as any || 'tag'}
                                  size={20}
                                  color={selectedCat.color || '#6366f1'}
                                  style={styles.dropdownIcon}
                                />
                                <Text variant="bodyLarge" style={styles.dropdownText}>
                                  {selectedCat.name}
                                </Text>
                              </>
                            ) : null
                          })()}
                        </>
                      ) : (
                        <>
                          <MaterialCommunityIcons name="tag" size={20} color="#999" style={styles.dropdownIcon} />
                          <Text variant="bodyLarge" style={[styles.dropdownText, styles.placeholderText]}>
                            Selecione uma categoria
                          </Text>
                        </>
                      )}
                    </View>
                    <MaterialCommunityIcons name="chevron-down" size={20} color="#999" />
                  </TouchableOpacity>
                }
              >
                <Menu.Item
                  onPress={() => {
                    setExpenseForm({ ...expenseForm, category: '' })
                    setShowCategoryMenu(false)
                  }}
                  title="Sem categoria"
                />
                {categories.map(category => (
                  <Menu.Item
                    key={category.id}
                    onPress={() => {
                      setExpenseForm({ ...expenseForm, category: category.id.toString() })
                      setShowCategoryMenu(false)
                    }}
                    title={category.name}
                    leadingIcon={() => (
                      <MaterialCommunityIcons
                        name={category.icon as any || 'tag'}
                        size={20}
                        color={category.color || '#6366f1'}
                      />
                    )}
                  />
                ))}
              </Menu>
            </View>
            
            <TextInput 
              label="Descrição" 
              value={expenseForm.description} 
              onChangeText={(text) => setExpenseForm({ ...expenseForm, description: text })} 
            />
            <TextInput 
              label="Valor" 
              keyboardType="numeric" 
              value={expenseForm.amount} 
              onChangeText={(text) => setExpenseForm({ ...expenseForm, amount: text })} 
            />
            <DatePicker
              label="Data"
              value={expenseForm.date}
              onChange={(date) => setExpenseForm({ ...expenseForm, date: date || new Date() })}
            />
            <Text variant="bodySmall" style={styles.label}>Método de Pagamento</Text>
            <SegmentedButtons
              value={expenseForm.payment_method}
              onValueChange={(value) => setExpenseForm({ ...expenseForm, payment_method: value })}
              buttons={[
                { value: 'cash', label: 'Dinheiro' },
                { value: 'card', label: 'Cartão' },
                { value: 'transfer', label: 'Transferência' },
              ]}
            />
            {editingItem && (
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={() => handleDeleteExpense(editingItem.id)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="delete-outline" size={20} color="#fff" />
                <RNText style={styles.modalDeleteButtonText}>Excluir Despesa</RNText>
              </TouchableOpacity>
            )}
            <Button mode="contained" onPress={handleSaveExpense} style={styles.modalButton}>
              Salvar
            </Button>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Category Modal */}
      <Portal>
        <Modal 
          visible={showCategoryModal} 
          onDismiss={() => { 
            setShowCategoryModal(false)
            setCategoryForm({ name: '', icon: 'tag', color: '#6366f1' })
          }} 
          contentContainerStyle={styles.modal}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Nova Categoria
          </Text>
          <TextInput
            label="Nome da Categoria"
            value={categoryForm.name}
            onChangeText={(text) => setCategoryForm({ ...categoryForm, name: text })}
            style={styles.input}
          />
          
          {/* Icon Selection */}
          <Text variant="bodySmall" style={styles.label}>Ícone</Text>
          <View style={styles.iconGrid}>
            {['tag', 'food', 'car', 'home', 'shopping', 'medical-bag', 'school', 'gamepad-variant', 'gift', 'bank'].map(icon => (
              <TouchableOpacity
                key={icon}
                style={[
                  styles.iconOption,
                  categoryForm.icon === icon && styles.iconOptionSelected,
                  { backgroundColor: categoryForm.color + '20' }
                ]}
                onPress={() => setCategoryForm({ ...categoryForm, icon })}
              >
                <MaterialCommunityIcons
                  name={icon as any}
                  size={24}
                  color={categoryForm.icon === icon ? categoryForm.color : '#666'}
                />
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Color Selection */}
          <Text variant="bodySmall" style={styles.label}>Cor</Text>
          <View style={styles.colorGrid}>
            {['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'].map(color => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  categoryForm.color === color && styles.colorOptionSelected,
                  { backgroundColor: color }
                ]}
                onPress={() => setCategoryForm({ ...categoryForm, color })}
              >
                {categoryForm.color === color && (
                  <MaterialCommunityIcons name="check" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            ))}
          </View>
          
          <Button 
            mode="contained" 
            onPress={handleSaveCategory} 
            style={styles.modalButton}
            disabled={!categoryForm.name.trim()}
          >
            Criar Categoria
          </Button>
        </Modal>
      </Portal>

      {/* Budget Modal */}
      <Portal>
        <Modal visible={showBudgetModal} onDismiss={() => { setShowBudgetModal(false); setEditingItem(null); resetBudgetForm() }} contentContainerStyle={styles.modal}>
          <ScrollView>
            <Text variant="headlineSmall" style={styles.modalTitle}>
              {editingItem ? 'Editar Orçamento' : 'Novo Orçamento'}
            </Text>
            <TextInput 
              label="Valor" 
              keyboardType="numeric" 
              value={budgetForm.amount} 
              onChangeText={(text) => setBudgetForm({ ...budgetForm, amount: text })} 
            />
            
            {/* Period Type Dropdown */}
            <View style={styles.dropdownContainer}>
              <Text variant="bodySmall" style={styles.label}>Período</Text>
              <Menu
                visible={showBudgetPeriodMenu}
                onDismiss={() => setShowBudgetPeriodMenu(false)}
                anchor={
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setShowBudgetPeriodMenu(true)}
                  >
                    <View style={styles.dropdownContent}>
                      <MaterialCommunityIcons
                        name={
                          budgetForm.period_type === 'daily' ? 'calendar-today' :
                          budgetForm.period_type === 'monthly' ? 'calendar-month' :
                          budgetForm.period_type === 'yearly' ? 'calendar-year' :
                          'calendar-range'
                        }
                        size={20}
                        color="#6366f1"
                        style={styles.dropdownIcon}
                      />
                      <Text variant="bodyLarge" style={styles.dropdownText}>
                        {budgetForm.period_type === 'daily' ? 'Diário' :
                         budgetForm.period_type === 'monthly' ? 'Mensal' :
                         budgetForm.period_type === 'yearly' ? 'Anual' :
                         'Personalizado'}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-down" size={20} color="#999" />
                  </TouchableOpacity>
                }
              >
                <Menu.Item
                  onPress={() => {
                    setBudgetForm({ ...budgetForm, period_type: 'daily' })
                    setShowBudgetPeriodMenu(false)
                  }}
                  title="Diário"
                  leadingIcon={() => (
                    <MaterialCommunityIcons name="calendar-today" size={20} color="#6366f1" />
                  )}
                />
                <Menu.Item
                  onPress={() => {
                    setBudgetForm({ ...budgetForm, period_type: 'monthly' })
                    setShowBudgetPeriodMenu(false)
                  }}
                  title="Mensal"
                  leadingIcon={() => (
                    <MaterialCommunityIcons name="calendar-month" size={20} color="#6366f1" />
                  )}
                />
                <Menu.Item
                  onPress={() => {
                    setBudgetForm({ ...budgetForm, period_type: 'yearly' })
                    setShowBudgetPeriodMenu(false)
                  }}
                  title="Anual"
                  leadingIcon={() => (
                    <MaterialCommunityIcons name="calendar-year" size={20} color="#6366f1" />
                  )}
                />
                <Menu.Item
                  onPress={() => {
                    setBudgetForm({ ...budgetForm, period_type: 'custom' })
                    setShowBudgetPeriodMenu(false)
                  }}
                  title="Personalizado"
                  leadingIcon={() => (
                    <MaterialCommunityIcons name="calendar-range" size={20} color="#6366f1" />
                  )}
                />
              </Menu>
            </View>

            {/* Date inputs based on period type */}
            {budgetForm.period_type === 'daily' && (
              <DatePicker
                label="Data"
                value={budgetForm.date}
                onChange={(date) => setBudgetForm({ ...budgetForm, date: date })}
              />
            )}

            {budgetForm.period_type === 'monthly' && (
              <>
                <TextInput 
                  label="Mês" 
                  keyboardType="numeric" 
                  value={budgetForm.month.toString()} 
                  onChangeText={(text) => setBudgetForm({ ...budgetForm, month: parseInt(text) || 1 })} 
                />
                <TextInput 
                  label="Ano" 
                  keyboardType="numeric" 
                  value={budgetForm.year.toString()} 
                  onChangeText={(text) => setBudgetForm({ ...budgetForm, year: parseInt(text) || new Date().getFullYear() })} 
                />
              </>
            )}

            {budgetForm.period_type === 'yearly' && (
              <TextInput 
                label="Ano" 
                keyboardType="numeric" 
                value={budgetForm.year.toString()} 
                onChangeText={(text) => setBudgetForm({ ...budgetForm, year: parseInt(text) || new Date().getFullYear() })} 
              />
            )}

            {budgetForm.period_type === 'custom' && (
              <>
                <DatePicker
                  label="Data de Início"
                  value={budgetForm.start_date}
                  onChange={(date) => setBudgetForm({ ...budgetForm, start_date: date })}
                />
                <DatePicker
                  label="Data de Fim"
                  value={budgetForm.end_date}
                  onChange={(date) => setBudgetForm({ ...budgetForm, end_date: date })}
                  minimumDate={budgetForm.start_date || undefined}
                />
              </>
            )}

            <Button mode="contained" onPress={handleSaveBudget} style={styles.modalButton}>
              Salvar
            </Button>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Goal Modal */}
      <Portal>
        <Modal visible={showGoalModal} onDismiss={() => { setShowGoalModal(false); setEditingItem(null); resetGoalForm() }} contentContainerStyle={styles.modal}>
          <Text variant="headlineSmall" style={styles.modalTitle}>
            {editingItem ? 'Editar Objetivo' : 'Novo Objetivo'}
          </Text>
          <TextInput label="Título" value={goalForm.title} onChangeText={(text) => setGoalForm({ ...goalForm, title: text })} />
          <TextInput label="Descrição" multiline value={goalForm.description} onChangeText={(text) => setGoalForm({ ...goalForm, description: text })} />
          <TextInput label="Valor Alvo" keyboardType="numeric" value={goalForm.target_amount} onChangeText={(text) => setGoalForm({ ...goalForm, target_amount: text })} />
          <DatePicker
            label="Data Alvo"
            value={goalForm.target_date}
            onChange={(date) => setGoalForm({ ...goalForm, target_date: date })}
          />
          <Button mode="contained" onPress={handleSaveGoal} style={styles.modalButton}>
            Salvar
          </Button>
        </Modal>
      </Portal>

      {/* Debt Modal */}
      <Portal>
        <Modal visible={showDebtModal} onDismiss={() => { setShowDebtModal(false); setEditingItem(null); resetDebtForm() }} contentContainerStyle={styles.modal}>
          <Text variant="headlineSmall" style={styles.modalTitle}>
            {editingItem ? 'Editar Dívida' : 'Nova Dívida'}
          </Text>
          <TextInput label="Credor" value={debtForm.creditor} onChangeText={(text) => setDebtForm({ ...debtForm, creditor: text })} />
          <TextInput label="Valor Total" keyboardType="numeric" value={debtForm.total_amount} onChangeText={(text) => setDebtForm({ ...debtForm, total_amount: text })} />
          <TextInput label="Valor Pago" keyboardType="numeric" value={debtForm.paid_amount} onChangeText={(text) => setDebtForm({ ...debtForm, paid_amount: text })} />
          <TextInput label="Taxa de Juros (%)" keyboardType="numeric" value={debtForm.interest_rate} onChangeText={(text) => setDebtForm({ ...debtForm, interest_rate: text })} />
          <DatePicker
            label="Data de Vencimento"
            value={debtForm.due_date}
            onChange={(date) => setDebtForm({ ...debtForm, due_date: date })}
          />
          <Button mode="contained" onPress={handleSaveDebt} style={styles.modalButton}>
            Salvar
          </Button>
        </Modal>
      </Portal>

      {/* Add Money to Goal Modal */}
      <Portal>
        <Modal 
          visible={showAddMoneyModal} 
          onDismiss={() => { 
            setShowAddMoneyModal(false)
            setSelectedGoal(null)
            setAddMoneyAmount('')
          }} 
          contentContainerStyle={styles.modal}
        >
          <ScrollView>
            <Text variant="headlineSmall" style={styles.modalTitle}>
              Adicionar Dinheiro ao Objetivo
            </Text>
            {selectedGoal && (
              <>
                <Card style={styles.infoCard}>
                  <Card.Content>
                    <Text variant="titleMedium">{selectedGoal.title}</Text>
                    <Text variant="bodySmall" style={styles.goalDescription}>
                      {selectedGoal.description}
                    </Text>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(parseFloat(selectedGoal.progress_percentage), 100)}%`,
                            backgroundColor: '#6366f1',
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.goalFooter}>
                      <Text variant="bodySmall">
                        {formatCurrency(parseFloat(selectedGoal.current_amount))} / {formatCurrency(parseFloat(selectedGoal.target_amount))}
                      </Text>
                      <Text variant="bodySmall">{parseFloat(selectedGoal.progress_percentage).toFixed(0)}%</Text>
                    </View>
                  </Card.Content>
                </Card>
                <TextInput
                  label="Valor a Adicionar"
                  keyboardType="numeric"
                  value={addMoneyAmount}
                  onChangeText={(text) => setAddMoneyAmount(text)}
                  style={styles.input}
                  left={<TextInput.Icon icon="currency-usd" />}
                />
                {addMoneyAmount && parseFloat(addMoneyAmount) > 0 && (
                  <Card style={styles.previewCard}>
                    <Card.Content>
                      <Text variant="bodySmall" style={styles.previewLabel}>Novo valor:</Text>
                      <Text variant="titleLarge" style={styles.previewValue}>
                        {formatCurrency(parseFloat(selectedGoal.current_amount) + parseFloat(addMoneyAmount))} / {formatCurrency(parseFloat(selectedGoal.target_amount))}
                      </Text>
                      <Text variant="bodySmall" style={styles.previewPercentage}>
                        {((parseFloat(selectedGoal.current_amount) + parseFloat(addMoneyAmount)) / parseFloat(selectedGoal.target_amount) * 100).toFixed(0)}% do objetivo
                      </Text>
                    </Card.Content>
                  </Card>
                )}
                <Button 
                  mode="contained" 
                  onPress={handleAddMoneyToGoal} 
                  style={styles.modalButton}
                  disabled={!addMoneyAmount || parseFloat(addMoneyAmount) <= 0}
                  icon="check-circle"
                >
                  Adicionar
                </Button>
              </>
            )}
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
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
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
  title: {
    fontWeight: '700',
    color: '#1f2937',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#6b7280',
    fontSize: 13,
  },
  principlesContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  principlesTitle: {
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
    paddingLeft: 4,
  },
  goldenRuleCard: {
    marginBottom: 20,
    borderRadius: 20,
    elevation: 4,
    backgroundColor: '#ffffff',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderLeftWidth: 5,
    borderLeftColor: '#6366f1',
  },
  ruleCard3x: {
    borderLeftColor: '#10b981',
  },
  ruleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  ruleIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  ruleIcon3x: {
    backgroundColor: '#ecfdf5',
  },
  ruleHeaderText: {
    flex: 1,
  },
  ruleTitle: {
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  ruleSubtitle: {
    color: '#6b7280',
    fontSize: 13,
  },
  pieVisual: {
    flexDirection: 'row',
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    elevation: 2,
  },
  pieSegment50: {
    flex: 0.5,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 2,
    borderRightColor: '#ffffff',
  },
  pieSegment30: {
    flex: 0.3,
    backgroundColor: '#fce7f3',
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 2,
    borderRightColor: '#ffffff',
  },
  pieSegment20: {
    flex: 0.2,
    backgroundColor: '#d1fae5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  piePercent: {
    fontWeight: '700',
    color: '#1f2937',
  },
  calculatorSection: {
    marginTop: 20,
  },
  calculatorInput: {
    marginBottom: 20,
    backgroundColor: '#ffffff',
    fontSize: 16,
  },
  resultsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  resultCard: {
    flex: 1,
    padding: 20,
    paddingTop: 16,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    minHeight: 160,
    justifyContent: 'center',
  },
  resultCard50: {
    backgroundColor: '#eff6ff',
    borderWidth: 2.5,
    borderColor: '#3b82f6',
  },
  resultCard30: {
    backgroundColor: '#fdf2f8',
    borderWidth: 2.5,
    borderColor: '#ec4899',
  },
  resultCard20: {
    backgroundColor: '#f0fdf4',
    borderWidth: 2.5,
    borderColor: '#10b981',
  },
  resultIconContainer: {
    marginBottom: 12,
  },
  resultPercentage: {
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
    fontSize: 16,
  },
  resultLabel: {
    color: '#374151',
    marginBottom: 12,
    fontWeight: '600',
    fontSize: 14,
  },
  resultValue: {
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  checkerSection: {
    marginTop: 8,
  },
  verificationResult: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
  },
  verificationOk: {
    backgroundColor: '#ecfdf5',
    borderColor: '#10b981',
  },
  verificationWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
  },
  verificationContent: {
    flex: 1,
    marginLeft: 16,
  },
  verificationTitle: {
    fontWeight: '700',
    marginBottom: 6,
  },
  verificationText: {
    color: '#374151',
    lineHeight: 20,
  },
  summaryCard: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#6366f1',
    borderRadius: 20,
    elevation: 6,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  summaryContent: {
    padding: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  summaryIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 8,
    fontSize: 14,
  },
  summaryAmount: {
    color: '#ffffff',
    fontWeight: '700',
    letterSpacing: -1,
  },
  summaryStats: {
    marginTop: 4,
  },
  summaryStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryStat: {
    color: '#ffffff',
    opacity: 0.9,
    fontSize: 13,
  },
  tabsContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabs: {
    flexDirection: 'row',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 6,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
  },
  tabActive: {
    backgroundColor: '#eef2ff',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabLabel: {
    marginLeft: 8,
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#6366f1',
    fontWeight: '700',
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
  expenseCard: {
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  expenseLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  expenseDescription: {
    color: '#666',
    marginTop: 4,
  },
  expenseAmount: {
    fontWeight: 'bold',
    color: '#ef4444',
  },
  expenseFooter: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  goalDescription: {
    color: '#666',
    marginTop: 4,
    marginBottom: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  goalHeaderLeft: {
    flex: 1,
  },
  goalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  addMoneyButton: {
    marginTop: 12,
  },
  infoCard: {
    marginBottom: 16,
    backgroundColor: '#f9fafb',
  },
  previewCard: {
    marginTop: 12,
    marginBottom: 12,
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
    borderWidth: 1,
  },
  previewLabel: {
    color: '#6b7280',
    marginBottom: 4,
  },
  previewValue: {
    color: '#1f2937',
    fontWeight: 'bold',
  },
  previewPercentage: {
    color: '#3b82f6',
    marginTop: 4,
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
  debtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusChip: {
    backgroundColor: '#e5e7eb',
  },
  statusChipPaid: {
    backgroundColor: '#d1fae5',
  },
  statusChipOverdue: {
    backgroundColor: '#fee2e2',
  },
  debtFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
    borderRadius: 12,
  },
  statValue: {
    fontWeight: 'bold',
    marginTop: 8,
    color: '#1f2937',
  },
  statLabel: {
    color: '#666',
    marginTop: 4,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1f2937',
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
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalButton: {
    marginTop: 16,
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
})

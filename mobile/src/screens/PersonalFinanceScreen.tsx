import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Dimensions, Alert, Text as RNText } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Text, Card, Button, FAB, Chip, Portal, Modal, TextInput, SegmentedButtons, Menu, IconButton, Switch } from 'react-native-paper'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit'
import { convertAmount, type ConvertResult } from '../services/exchangeRates'
import { personalFinanceApi } from '../services/api'
import { useCurrency } from '../contexts/CurrencyContext'
import { formatDate } from '../i18n/format'
import DatePicker from '../components/DatePicker'
import PeriodSelector, { getDefaultPeriod, getPeriodParams, type PeriodState } from '../components/PeriodSelector'
import PersonalIncomeTab from '../components/finance/PersonalIncomeTab'
import CurrencyPicker from '../components/CurrencyPicker'
import { colors } from '../theme'
import type { CurrencyCode } from '../utils/currency'
import { getApiErrorMessage, unwrapList, type BudgetPayload, type DebtPayload, type ExpenseCreateResponse, type ExpensePayload, type ExpenseSummary, type GoalPayload } from '../types/api'
import { handleBudgetAlerts } from '../utils/budgetAlerts'
import { syncGoalReminders, cancelGoalReminders, notifyGoalProgressLocal } from '../utils/goalReminders'
import { logger } from '../utils/logger'
import { useI18n } from '../contexts/I18nContext'
import { useAlert } from '../hooks/useAlert'
import { useActionFeedback } from '../hooks/useActionFeedback'
import { ZendaLoading } from '../components/ui/ZendaLoader'
import type { RouteProp } from '@react-navigation/native'
import type { StackNavigationProp } from '@react-navigation/stack'
import type { PersonalStackParamList } from '../navigation/types'
import type { PersonalFinanceRouteParams, PersonalFinanceTab } from './personalFinanceTypes'
import { materialIcon, type MaterialIconName } from '../utils/icons'

type PersonalFinanceNavigation = StackNavigationProp<PersonalStackParamList, 'PersonalMain'>
type PersonalFinanceRoute = RouteProp<PersonalStackParamList, 'PersonalMain'>

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
  currency?: string
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
  date?: string
  spent: string
  remaining: string
  percentage_used: string
  currency?: string
}

interface Goal {
  id: number
  title: string
  description?: string
  target_amount: string
  current_amount: string
  target_date: string
  status: string
  progress_percentage: string
  remaining_amount: string
  currency?: string
  reminder_enabled?: boolean
  reminder_time?: string | null
  reminder_frequency?: 'once' | 'daily' | 'weekly' | string
  reminder_offsets_minutes?: number[]
}

interface DebtPaymentRecord {
  id: number
  amount: string
  currency?: string
  exchange_rate?: string | null
  converted_amount?: string | null
  exchange_rate_source?: string
  exchange_rate_timestamp?: string | null
  status?: 'partial' | 'paid' | 'cancelled'
  payment_date: string
  note?: string
  created_at?: string
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
  payments?: DebtPaymentRecord[]
  currency?: string
}

interface Category {
  id: number
  name: string
  icon: string
  color: string
}

export default function PersonalFinanceScreen() {
  const { t, tw, resolve, locale } = useI18n()
  const { currency: preferredCurrency, format, formatDual } = useCurrency()

  const fmtDate = (dateStr: string, options?: Intl.DateTimeFormatOptions) =>
    formatDate(locale, new Date(dateStr), options)

  const paymentLabel = (method: string) => {
    if (method === 'cash') return t('business.paymentCash')
    if (method === 'card') return t('business.paymentCard')
    if (method === 'transfer') return t('business.paymentTransfer')
    return t('personal.paymentOther')
  }
  const alert = useAlert()
  const feedback = useActionFeedback()
  const navigation = useNavigation<PersonalFinanceNavigation>()
  const route = useRoute<PersonalFinanceRoute>()
  const routeParams: PersonalFinanceRouteParams = route.params ?? {}
  const [activeTab, setActiveTab] = useState<PersonalFinanceTab>(
    routeParams.initialTab || 'principios'
  )
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [debts, setDebts] = useState<Debt[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [summary, setSummary] = useState<ExpenseSummary | null>(null)
  const [periodState, setPeriodState] = useState<PeriodState>(() => {
    const now = new Date()
    return { period: 'monthly', month: now.getMonth() + 1, year: now.getFullYear(), dateFrom: null, dateTo: null, dailyDate: null }
  })
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  
  // Modals
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [showBudgetModal, setShowBudgetModal] = useState(false)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [showDebtModal, setShowDebtModal] = useState(false)
  const [showPayDebtModal, setShowPayDebtModal] = useState(false)
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentCurrency, setPaymentCurrency] = useState<CurrencyCode>(preferredCurrency)
  const [payQuote, setPayQuote] = useState<ConvertResult | null>(null)
  const [payQuoteLoading, setPayQuoteLoading] = useState(false)
  const [payQuoteError, setPayQuoteError] = useState<string | null>(null)
  const [contributeCurrency, setContributeCurrency] = useState<CurrencyCode>(preferredCurrency)
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false)
  const [showBudgetPeriodMenu, setShowBudgetPeriodMenu] = useState(false)
  const [showCategoryMenu, setShowCategoryMenu] = useState(false)
  const [editingItem, setEditingItem] = useState<Expense | Budget | Goal | Debt | null>(null)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [addMoneyAmount, setAddMoneyAmount] = useState('')
  const [showBudgetExpensesModal, setShowBudgetExpensesModal] = useState(false)
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null)
  const [budgetExpenses, setBudgetExpenses] = useState<Expense[]>([])
  const [loadingBudgetExpenses, setLoadingBudgetExpenses] = useState(false)
  
  // Category form
  const [categoryForm, setCategoryForm] = useState({ name: '', icon: 'tag', color: '#3534C9' })
  
  // Form states
  const [expenseForm, setExpenseForm] = useState({ category: '', amount: '', description: '', date: new Date(), payment_method: 'cash', currency: preferredCurrency })
  const [budgetForm, setBudgetForm] = useState({ 
    category: '', 
    amount: '', 
    period_type: 'monthly',
    month: selectedMonth, 
    year: selectedYear,
    date: null as Date | null,
    start_date: null as Date | null,
    end_date: null as Date | null,
    description: '',
    currency: preferredCurrency,
  })
  const [goalForm, setGoalForm] = useState({
    title: '',
    description: '',
    target_amount: '',
    target_date: null as Date | null,
    current_amount: '0',
    currency: preferredCurrency,
    reminder_enabled: false,
    reminder_time: null as Date | null,
    reminder_frequency: 'once' as 'once' | 'daily' | 'weekly',
  })
  const [debtForm, setDebtForm] = useState({ creditor: '', total_amount: '', paid_amount: '0', interest_rate: '0', due_date: null as Date | null, description: '', currency: preferredCurrency })

  // Regras de Ouro (Fundamentos das {t('personal.title')})
  const [regrasRendimento, setRegrasRendimento] = useState('')
  const [regrasValorGastar, setRegrasValorGastar] = useState('')
  const [regrasDisponivel, setRegrasDisponivel] = useState('')

  useEffect(() => {
    loadData()
  }, [periodState.period, periodState.month, periodState.year, periodState.dateFrom, periodState.dateTo])

  useEffect(() => {
    const amount = parseFloat(paymentAmount.replace(',', '.'))
    const debtCcy = (selectedDebt?.currency || preferredCurrency).toUpperCase()
    if (!showPayDebtModal || !selectedDebt || !Number.isFinite(amount) || amount <= 0) {
      setPayQuote(null)
      setPayQuoteError(null)
      setPayQuoteLoading(false)
      return
    }
    let cancelled = false
    setPayQuoteLoading(true)
    setPayQuoteError(null)
    convertAmount(amount, paymentCurrency, debtCcy)
      .then((res) => {
        if (cancelled) return
        setPayQuote(res)
        setPayQuoteLoading(false)
        if (!res) setPayQuoteError(t('personal.quoteFailed'))
      })
      .catch(() => {
        if (cancelled) return
        setPayQuote(null)
        setPayQuoteLoading(false)
        setPayQuoteError(t('personal.quoteFailed'))
      })
    return () => {
      cancelled = true
    }
  }, [showPayDebtModal, selectedDebt, paymentAmount, paymentCurrency, preferredCurrency, t])

  const loadData = async () => {
    try {
      const periodParams = getPeriodParams(periodState)
      let dateFrom: string | undefined
      let dateTo: string | undefined
      const month = periodState.period === 'monthly' ? periodState.month : new Date().getMonth() + 1
      const year = periodState.period === 'yearly' ? periodState.year : periodState.year
      if (periodState.period === 'custom' && periodState.dateFrom && periodState.dateTo) {
        dateFrom = periodState.dateFrom.toISOString().split('T')[0]
        dateTo = periodState.dateTo.toISOString().split('T')[0]
      } else if (periodState.period === 'daily') {
        const d = periodState.dailyDate || new Date()
        dateFrom = dateTo = d.toISOString().split('T')[0]
      } else if (periodState.period === 'monthly') {
        dateFrom = `${year}-${String(month).padStart(2, '0')}-01`
        const lastDay = new Date(year, month, 0).getDate()
        dateTo = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      } else if (periodState.period === 'yearly') {
        dateFrom = `${year}-01-01`
        dateTo = `${year}-12-31`
      }
      const endpointNames = ['expenses', 'budgets', 'goals', 'debts', 'categories', 'summary'] as const
      const results = await Promise.allSettled([
        personalFinanceApi.getExpenses(month, year, undefined, dateFrom, dateTo),
        personalFinanceApi.getBudgets(month, year),
        personalFinanceApi.getGoals(),
        personalFinanceApi.getDebts(),
        personalFinanceApi.getCategories(true),
        personalFinanceApi.getExpensesSummary(periodParams),
      ])

      results.forEach((result, i) => {
        const name = endpointNames[i]
        if (result.status === 'fulfilled') {
          const data = result.value
          switch (name) {
            case 'expenses': setExpenses(unwrapList(data as Expense[])); break
            case 'budgets': setBudgets(unwrapList(data as Budget[])); break
            case 'goals': {
              const list = unwrapList(data as Goal[])
              setGoals(list)
              syncGoalReminders(list).catch((error) => logger.warn('syncGoalReminders failed', error))
              break
            }
            case 'debts': setDebts(unwrapList(data as Debt[])); break
            case 'categories': setCategories(unwrapList(data as Category[])); break
            case 'summary': setSummary(data as ExpenseSummary); break
          }
        } else {
          logger.error(`[PersonalFinance] Endpoint "${name}" failed:`, result.reason)
        }
      })
    } finally {
      setInitialLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const handleSaveExpense = async () => {
    await feedback.run(
      async () => {
        const expenseData: ExpensePayload = {
          amount: expenseForm.amount,
          description: expenseForm.description,
          date: expenseForm.date.toISOString().split('T')[0],
          payment_method: expenseForm.payment_method,
          currency: expenseForm.currency,
        }

        if (expenseForm.category) {
          expenseData.category = parseInt(expenseForm.category, 10)
        }

        if (editingItem && 'payment_method' in editingItem) {
          const updated = await personalFinanceApi.updateExpense(editingItem.id, expenseData)
          await handleBudgetAlerts((updated as ExpenseCreateResponse).budget_alerts)
        } else {
          const created = await personalFinanceApi.createExpense(expenseData)
          await handleBudgetAlerts((created as ExpenseCreateResponse).budget_alerts)
        }
        setShowExpenseModal(false)
        setEditingItem(null)
        resetExpenseForm()
        await loadData()
        if (showBudgetExpensesModal && selectedBudget) {
          await loadBudgetExpenses(selectedBudget.id)
        }
      },
      {
        pendingKey: 'saveExpense',
        pendingMessage: 'feedback.savingExpense',
        successMessage: 'feedback.successSaved',
        errorFallback: 'personal.saveExpenseFailed',
        onError: (error) => logger.error('Error saving expense:', error),
      },
    )
  }

  const handleDeleteExpense = async (expenseId: number) => {
    Alert.alert(
      t('personal.deleteExpenseTitle'),
      t('personal.deleteExpenseConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await personalFinanceApi.deleteExpense(expenseId)
              await loadData()
              // Reload budget expenses if modal is open
              if (showBudgetExpensesModal && selectedBudget) {
                await loadBudgetExpenses(selectedBudget.id)
              }
            } catch (error: unknown) {
              logger.error('Error deleting expense:', error)
              alert.error(getApiErrorMessage(error, 'personal.deleteExpenseFailed'))
            }
          },
        },
      ]
    )
  }

  const handleSaveCategory = async () => {
    await feedback.run(
      async () => {
        await personalFinanceApi.createCategory({
          ...categoryForm,
          is_personal: true,
        })
        setShowCategoryModal(false)
        setCategoryForm({ name: '', icon: 'tag', color: '#3534C9' })
        await loadData()
      },
      {
        pendingKey: 'saveCategory',
        pendingMessage: 'feedback.savingCategory',
        successMessage: 'feedback.successSaved',
        errorFallback: 'personal.saveCategoryFailed',
        onError: (error) => logger.error('Error saving category:', error),
      },
    )
  }

  const handleSaveBudget = async () => {
    await feedback.run(
      async () => {
        const budgetData: BudgetPayload & { description?: string } = {
          category: budgetForm.category ? parseInt(budgetForm.category, 10) : undefined,
          amount: budgetForm.amount,
          period_type: budgetForm.period_type as BudgetPayload['period_type'],
          description: budgetForm.description,
          currency: budgetForm.currency,
        }

        if (budgetForm.period_type === 'daily' && budgetForm.date) {
          budgetData.date = budgetForm.date.toISOString().split('T')[0]
          budgetData.month = budgetForm.date.getMonth() + 1
          budgetData.year = budgetForm.date.getFullYear()
        } else if (budgetForm.period_type === 'monthly') {
          budgetData.month = budgetForm.month
          budgetData.year = budgetForm.year
        } else if (budgetForm.period_type === 'yearly') {
          budgetData.year = budgetForm.year
          budgetData.month = 1
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
        await loadData()
      },
      {
        pendingKey: 'saveBudget',
        pendingMessage: editingItem ? 'feedback.savingBudget' : 'feedback.creatingBudget',
        successMessage: 'feedback.successSaved',
        errorFallback: 'feedback.tryAgain',
        onError: (error) => logger.error('Error saving budget:', error),
      },
    )
  }

  const handleSaveGoal = async () => {
    await feedback.run(
      async () => {
        const reminderTime = goalForm.reminder_time
          ? `${String(goalForm.reminder_time.getHours()).padStart(2, '0')}:${String(goalForm.reminder_time.getMinutes()).padStart(2, '0')}`
          : null
        const goalData: GoalPayload = {
          title: goalForm.title,
          description: goalForm.description,
          target_amount: goalForm.target_amount,
          current_amount: goalForm.current_amount,
          currency: goalForm.currency,
          reminder_enabled: goalForm.reminder_enabled,
          reminder_time: reminderTime,
          reminder_frequency: goalForm.reminder_frequency,
          reminder_offsets_minutes: [10],
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
        await loadData()
      },
      {
        pendingKey: 'saveGoal',
        pendingMessage: 'feedback.savingGoal',
        successMessage: 'feedback.successSaved',
        errorFallback: 'feedback.tryAgain',
        onError: (error) => logger.error('Error saving goal:', error),
      },
    )
  }

  const handleAddMoneyToGoal = async () => {
    if (!selectedGoal || !addMoneyAmount || parseFloat(addMoneyAmount) <= 0) {
      alert.error(t('personal.invalidAmount'))
      return
    }

    await feedback.run(
      async () => {
        const updated = await personalFinanceApi.addMoneyToGoal(
          selectedGoal.id,
          parseFloat(addMoneyAmount),
          undefined,
          contributeCurrency,
        )
        const events = (updated as { progress_events?: string[] }).progress_events || []
        if (events.includes('75')) {
          await notifyGoalProgressLocal(selectedGoal.title, '75')
        }
        if (events.includes('100')) {
          await notifyGoalProgressLocal(selectedGoal.title, '100')
        }
        setShowAddMoneyModal(false)
        setSelectedGoal(null)
        setAddMoneyAmount('')
        setContributeCurrency(preferredCurrency)
        await loadData()
      },
      {
        pendingKey: 'contributeGoal',
        pendingMessage: 'feedback.addingContribution',
        successMessage: 'personal.goalFunded',
        errorFallback: 'personal.addGoalFailed',
        onError: (error) => logger.error('Error adding money to goal:', getApiErrorMessage(error)),
      },
    )
  }

  const openAddMoneyModal = (goal: Goal) => {
    setSelectedGoal(goal)
    setAddMoneyAmount('')
    setContributeCurrency((goal.currency || preferredCurrency) as CurrencyCode)
    setShowAddMoneyModal(true)
  }

  const handleSaveDebt = async () => {
    if (!debtForm.creditor.trim()) {
      alert.error(t('personal.creditorRequired'))
      return
    }
    const total = parseFloat(String(debtForm.total_amount).replace(',', '.'))
    if (!Number.isFinite(total) || total <= 0) {
      alert.error(t('personal.invalidAmount'))
      return
    }
    if (!debtForm.due_date) {
      alert.error(t('personal.dueDateRequired'))
      return
    }

    const due = debtForm.due_date
    const dueDate = `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`
    const paid = parseFloat(String(debtForm.paid_amount).replace(',', '.')) || 0
    const interest = parseFloat(String(debtForm.interest_rate).replace(',', '.')) || 0

    await feedback.run(
      async () => {
        const debtData: DebtPayload = {
          creditor: debtForm.creditor.trim(),
          total_amount: total,
          paid_amount: paid,
          interest_rate: interest,
          due_date: dueDate,
          description: debtForm.description.trim(),
          currency: debtForm.currency,
        }
        if (editingItem) {
          await personalFinanceApi.updateDebt(editingItem.id, debtData)
        } else {
          await personalFinanceApi.createDebt(debtData)
        }
        setShowDebtModal(false)
        setEditingItem(null)
        resetDebtForm()
        await loadData()
      },
      {
        pendingKey: 'saveDebt',
        pendingMessage: 'feedback.savingDebt',
        successMessage: 'feedback.successSaved',
        errorFallback: 'feedback.tryAgain',
        onError: (error) => logger.error('Error saving debt:', error),
      },
    )
  }

  const resetExpenseForm = () => setExpenseForm({ category: '', amount: '', description: '', date: new Date(), payment_method: 'cash', currency: preferredCurrency })
  const resetBudgetForm = () => setBudgetForm({ 
    category: '', 
    amount: '', 
    period_type: 'monthly',
    month: selectedMonth, 
    year: selectedYear,
    date: null,
    start_date: null,
    end_date: null,
    description: '',
    currency: preferredCurrency,
  })
  const resetGoalForm = () => setGoalForm({
    title: '',
    description: '',
    target_amount: '',
    target_date: null,
    current_amount: '0',
    currency: preferredCurrency,
    reminder_enabled: false,
    reminder_time: null,
    reminder_frequency: 'once',
  })

  const openEditGoal = (goal: Goal) => {
    let reminderTime: Date | null = null
    if (goal.reminder_time) {
      const [hh, mm] = goal.reminder_time.split(':').map(Number)
      const d = new Date()
      d.setHours(hh || 0, mm || 0, 0, 0)
      reminderTime = d
    }
    setEditingItem(goal)
    setGoalForm({
      title: goal.title,
      description: goal.description || '',
      target_amount: String(goal.target_amount),
      target_date: goal.target_date ? new Date(`${goal.target_date}T00:00:00`) : null,
      current_amount: String(goal.current_amount),
      currency: (goal.currency || preferredCurrency) as CurrencyCode,
      reminder_enabled: Boolean(goal.reminder_enabled),
      reminder_time: reminderTime,
      reminder_frequency: (goal.reminder_frequency as 'once' | 'daily' | 'weekly') || 'once',
    })
    setShowGoalModal(true)
  }

  const handleDeleteGoal = async (goalId: number) => {
    await feedback.run(
      async () => {
        await personalFinanceApi.deleteGoal(goalId)
        await cancelGoalReminders(goalId)
        setShowGoalModal(false)
        setEditingItem(null)
        resetGoalForm()
        await loadData()
      },
      {
        pendingKey: 'deleteGoal',
        pendingMessage: 'feedback.deleting',
        successMessage: 'feedback.successDeleted',
        errorFallback: 'feedback.tryAgain',
        onError: (error) => logger.error('Error deleting goal:', error),
      },
    )
  }
  const resetDebtForm = () => setDebtForm({ creditor: '', total_amount: '', paid_amount: '0', interest_rate: '0', due_date: null, description: '', currency: preferredCurrency })

  const handlePayDebt = async () => {
    if (!selectedDebt || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert.error(t('personal.invalidPayment'))
      return
    }

    const paymentValue = parseFloat(paymentAmount)
    const currentPaid = parseFloat(selectedDebt.paid_amount)
    const totalAmount = parseFloat(selectedDebt.total_amount)
    const debtCurrency = selectedDebt.currency || preferredCurrency
    if (paymentCurrency === debtCurrency) {
      const newPaidAmount = currentPaid + paymentValue
      if (newPaidAmount > totalAmount) {
        alert.error(tw('personal.paymentExceeds', { amount: format(totalAmount - currentPaid, debtCurrency) }))
        return
      }
    }

    await feedback.run(
      async () => {
        await personalFinanceApi.payDebt(selectedDebt.id, {
          amount: paymentValue,
          payment_date: new Date().toISOString().slice(0, 10),
          currency: paymentCurrency,
        })
        setShowPayDebtModal(false)
        setPaymentAmount('')
        setPaymentCurrency(preferredCurrency)
        setSelectedDebt(null)
        await loadData()
        alert.success(tw('personal.paymentRecorded', { amount: format(paymentValue, paymentCurrency) }))
      },
      {
        pendingKey: 'payDebt',
        pendingMessage: 'feedback.processingPayment',
        silentSuccess: true,
        errorFallback: 'personal.paymentFailed',
        onError: (error) => logger.error('Error paying debt:', getApiErrorMessage(error)),
      },
    )
  }

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
      currency: (expense.currency || preferredCurrency) as CurrencyCode,
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
      currency: (budget.currency || preferredCurrency) as CurrencyCode,
    })
    setShowBudgetModal(true)
  }

  const loadBudgetExpenses = async (budgetId: number) => {
    setLoadingBudgetExpenses(true)
    try {
      const data = await personalFinanceApi.getBudgetExpenses(budgetId)
      setBudgetExpenses(data.expenses || [])
      // Also reload budget data to get updated spent/remaining
      await loadData()
    } catch (error) {
      logger.error('Error loading budget expenses:', error)
      setBudgetExpenses([])
    } finally {
      setLoadingBudgetExpenses(false)
    }
  }

  const openBudgetExpenses = async (budget: Budget) => {
    setSelectedBudget(budget)
    setShowBudgetExpensesModal(true)
    await loadBudgetExpenses(budget.id)
  }

  const openAddExpenseFromBudget = (budget: Budget) => {
    // Pre-fill expense form with budget category and today's date
    const today = new Date()
    // Find category ID by name (budget.category_name is the name, not ID)
    const categoryId = categories.find(c => c.name === budget.category_name)?.id?.toString() || ''
    setExpenseForm({
      category: categoryId,
      amount: '',
      description: '',
      date: today,
      payment_method: 'cash',
      currency: (budget.currency || preferredCurrency) as CurrencyCode,
    })
    setEditingItem(null)
    setShowExpenseModal(true)
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
  const activeGoals = goals.filter(g => g.status === 'active')
  const activeDebts = debts.filter(d => d.status === 'active' || d.status === 'overdue')

  // Brand chart palette (logo blues / growth green / semantic accents)
  const pieChartColors = [...colors.chart]

  const chartData = summary?.by_category?.slice(0, 5).map((cat, index: number) => ({
    name: cat.category__name || cat.category_name || t('personal.others'),
    amount: parseFloat(String(cat.total ?? cat.amount ?? 0)),
    color: pieChartColors[index % pieChartColors.length],
    legendFontColor: '#7F7F7F',
    legendFontSize: 12,
  })) || []

  // Group expenses and budgets by period type for comparison
  const today = new Date()
  const currentDate = today.getDate()
  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()

  // Filter expenses by period
  const dailyExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date)
    return expDate.getDate() === currentDate && 
           expDate.getMonth() + 1 === currentMonth && 
           expDate.getFullYear() === currentYear
  })
  
  const monthlyExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date)
    return expDate.getMonth() + 1 === currentMonth && 
           expDate.getFullYear() === currentYear
  })
  
  const yearlyExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date)
    return expDate.getFullYear() === currentYear
  })

  // Calculate totals
  const dailyExpensesTotal = dailyExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
  const monthlyExpensesTotal = monthlyExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)
  const yearlyExpensesTotal = yearlyExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0)

  // Filter budgets by period type (fallback to monthly if period_type not available)
  const dailyBudgets = budgets.filter(b => b.period_type === 'daily' || (b.period_type === undefined && b.date))
  const monthlyBudgets = budgets.filter(b => b.period_type === 'monthly' || (b.period_type === undefined && b.month === currentMonth && b.year === currentYear))
  const yearlyBudgets = budgets.filter(b => b.period_type === 'yearly' || (b.period_type === undefined && b.year === currentYear && !b.month))

  // Calculate budget totals for each period
  const dailyBudgetTotal = dailyBudgets.reduce((sum, b) => sum + parseFloat(b.amount || '0'), 0)
  const monthlyBudgetTotal = monthlyBudgets.reduce((sum, b) => sum + parseFloat(b.amount || '0'), 0)
  const yearlyBudgetTotal = yearlyBudgets.reduce((sum, b) => sum + parseFloat(b.amount || '0'), 0)

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ZendaLoading visible fill message={t('loading.personal')} />
      </SafeAreaView>
    )
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
          <View style={styles.headerContent}>
            <View style={styles.headerIconContainer}>
              <MaterialCommunityIcons name="wallet" size={28} color={colors.brand.primary} />
            </View>
            <View style={styles.headerText}>
              <Text variant="headlineMedium" style={styles.title}>{t('personal.title')}</Text>
              <Text variant="bodySmall" style={styles.headerSubtitle}>
                {formatDate(locale, new Date(selectedYear, selectedMonth - 1), { month: 'long', year: 'numeric' })}
              </Text>
            </View>
            <Chip
              icon="calendar-month"
              mode="outlined"
              onPress={() => navigation.navigate('MonthlyPlan')}
              style={styles.planChip}
              textStyle={styles.planChipText}
            >
              {t('navigation.monthlyPlan')}
            </Chip>
          </View>
        </View>


        {/* Summary Card */}
        <Card style={styles.summaryCard}>
          <Card.Content style={styles.summaryContent}>
            <View style={styles.summaryHeader}>
              <View>
                <Text variant="bodySmall" style={styles.summaryLabel}>{t('personal.monthExpenses')}</Text>
                <Text variant="headlineLarge" style={styles.summaryAmount}>
                  {format(totalExpenses)}
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
                    {tw('personal.transactions', { count: summary.count || 0 })}
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
              { key: 'principios', label: t('personal.tabPrinciples'), icon: 'lightbulb-on' },
              { key: 'overview', label: t('personal.tabOverview'), icon: 'view-dashboard' },
              { key: 'expenses', label: t('personal.tabExpenses'), icon: 'cash-minus' },
              { key: 'income', label: t('personal.tabIncome'), icon: 'cash-plus' },
              { key: 'budgets', label: t('personal.tabBudgets'), icon: 'wallet' },
              { key: 'goals', label: t('personal.tabGoals'), icon: 'target' },
              { key: 'debts', label: t('personal.tabDebts'), icon: 'credit-card' },
            ].map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key as PersonalFinanceTab)}
              >
                <MaterialCommunityIcons
                  name={materialIcon(tab.icon) as MaterialIconName}
                  size={20}
                  color={activeTab === tab.key ? '#3534C9' : '#666'}
                />
                <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Period Selector - shown for all finance tabs except principios */}
        {activeTab !== 'principios' && (
          <View style={styles.periodSection}>
            <Text variant="labelMedium" style={styles.periodLabel}>{t('personal.periodStats')}</Text>
            <PeriodSelector state={periodState} onChange={setPeriodState} />
          </View>
        )}

        {/* Content based on active tab */}
        {activeTab === 'principios' && (
          <View style={styles.content}>
            {/* Regra 1: {t('personal.rules100Title')} - Visual Calculator */}
            <Card style={styles.goldenRuleCard}>
              <Card.Content>
                <View style={styles.ruleHeader}>
                  <View style={styles.ruleIconContainer}>
                    <MaterialCommunityIcons name="chart-pie" size={32} color={colors.brand.primary} />
                  </View>
                  <View style={styles.ruleHeaderText}>
                    <Text variant="titleLarge" style={styles.ruleTitle}>{t('personal.rules100Title')}</Text>
                    <Text variant="bodySmall" style={styles.ruleSubtitle}>{t('personal.rules100Subtitle')}</Text>
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
                    label={tw('personal.monthlyIncome', { currency: preferredCurrency })}
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
                          <MaterialCommunityIcons name="home" size={32} color={colors.brand.primary} />
                        </View>
                        <Text variant="labelLarge" style={styles.resultPercentage}>50%</Text>
                        <Text variant="bodyMedium" style={styles.resultLabel}>{t('personal.fixed')}</Text>
                        <Text variant="headlineSmall" style={styles.resultValue}>
                          {format(parseFloat(regrasRendimento.replace(',', '.')) * 0.5)}
                        </Text>
                      </View>
                      <View style={[styles.resultCard, styles.resultCard30]}>
                        <View style={styles.resultIconContainer}>
                          <MaterialCommunityIcons name="heart" size={32} color="#5B5AD6" />
                        </View>
                        <Text variant="labelLarge" style={styles.resultPercentage}>30%</Text>
                        <Text variant="bodyMedium" style={styles.resultLabel}>{t('personal.wishes')}</Text>
                        <Text variant="headlineSmall" style={styles.resultValue}>
                          {format(parseFloat(regrasRendimento.replace(',', '.')) * 0.3)}
                        </Text>
                      </View>
                      <View style={[styles.resultCard, styles.resultCard20]}>
                        <View style={styles.resultIconContainer}>
                          <MaterialCommunityIcons name="piggy-bank" size={32} color={colors.brand.growth} />
                        </View>
                        <Text variant="labelLarge" style={styles.resultPercentage}>20%</Text>
                        <Text variant="bodyMedium" style={styles.resultLabel}>{t('personal.savings')}</Text>
                        <Text variant="headlineSmall" style={styles.resultValue}>
                          {format(parseFloat(regrasRendimento.replace(',', '.')) * 0.2)}
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
                    <MaterialCommunityIcons name="shield-check" size={32} color={colors.brand.growth} />
                  </View>
                  <View style={styles.ruleHeaderText}>
                    <Text variant="titleLarge" style={styles.ruleTitle}>{t('personal.rule3xTitle')}</Text>
                    <Text variant="bodySmall" style={styles.ruleSubtitle}>{t('personal.rule3xSubtitle')}</Text>
                  </View>
                </View>

                <View style={styles.checkerSection}>
                  <TextInput
                    mode="outlined"
                    label={tw('personal.wantToSpend', { currency: preferredCurrency })}
                    value={regrasValorGastar}
                    onChangeText={setRegrasValorGastar}
                    keyboardType="decimal-pad"
                    style={styles.calculatorInput}
                    left={<TextInput.Icon icon="cash-minus" />}
                  />
                  <TextInput
                    mode="outlined"
                    label={tw('personal.available', { currency: preferredCurrency })}
                    value={regrasDisponivel}
                    onChangeText={setRegrasDisponivel}
                    keyboardType="decimal-pad"
                    style={styles.calculatorInput}
                    placeholder={regrasRendimento && parseFloat(regrasRendimento.replace(',', '.')) > 0 ? tw('personal.suggestion', { amount: format(parseFloat(regrasRendimento.replace(',', '.')) * 0.3) }) : t('personal.optional')}
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
                            color={pode ? '#4DB83D' : '#E67E22'} 
                          />
                          <View style={styles.verificationContent}>
                            <Text variant="titleLarge" style={[styles.verificationTitle, { color: pode ? '#4DB83D' : '#b45309' }]}>
                              {pode ? t('personal.canSpend') : t('personal.cannotSpendYet')}
                            </Text>
                            {pode ? (
                              <Text variant="bodyMedium" style={styles.verificationText}>
                                {tw('personal.enoughToSpend', { available: format(disp), amount: format(gastar) })}
                              </Text>
                            ) : (
                              <Text variant="bodyMedium" style={styles.verificationText}>
                                {tw('personal.needAmount', { needed: format(precisa3x), amount: format(gastar), available: format(disp) })}
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

            {/* {t('personal.budgetWithdrawTitle')} - functional tool */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('TirarDinheiroOrcamento')}
            >
              <Card style={[styles.goldenRuleCard, styles.orcamentoCard]}>
                <Card.Content>
                  <View style={styles.ruleHeader}>
                    <View style={[styles.ruleIconContainer, { backgroundColor: '#eef2ff' }]}>
                      <MaterialCommunityIcons name="wallet-outline" size={32} color={colors.brand.primary} />
                    </View>
                    <View style={styles.ruleHeaderText}>
                      <Text variant="titleLarge" style={styles.ruleTitle}>{t('personal.budgetWithdrawTitle')}</Text>
                      <Text variant="bodySmall" style={styles.ruleSubtitle}>
                        {t('personal.budgetWithdrawSubtitle')}
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={28} color={colors.brand.primary} />
                  </View>
                  <Text variant="bodySmall" style={styles.orcamentoCta}>
                    {t('personal.budgetWithdrawCta')}
                  </Text>
                </Card.Content>
              </Card>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'overview' && (
          <View style={styles.content}>
            {/* Chart */}
            {chartData.length > 0 && (
              <Card style={styles.card}>
                <Card.Content>
                  <Text variant="titleMedium" style={styles.sectionTitle}>{t('personal.expensesByCategory')}</Text>
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
                  <MaterialCommunityIcons name="wallet" size={24} color={colors.brand.primary} />
                  <Text variant="headlineSmall" style={styles.statValue}>{budgets.length}</Text>
                  <Text variant="bodySmall" style={styles.statLabel}>{t('personal.statBudgets')}</Text>
                </Card.Content>
              </Card>
              <Card style={styles.statCard}>
                <Card.Content>
                  <MaterialCommunityIcons name="target" size={24} color={colors.brand.growth} />
                  <Text variant="headlineSmall" style={styles.statValue}>{activeGoals.length}</Text>
                  <Text variant="bodySmall" style={styles.statLabel}>{t('personal.statGoals')}</Text>
                </Card.Content>
              </Card>
              <Card style={styles.statCard}>
                <Card.Content>
                  <MaterialCommunityIcons name="alert-circle" size={24} color={colors.danger} />
                  <Text variant="headlineSmall" style={styles.statValue}>{activeDebts.length}</Text>
                  <Text variant="bodySmall" style={styles.statLabel}>{t('personal.statDebts')}</Text>
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
                    {t('personal.emptyExpenses')}
                  </Text>
                  <Button mode="contained" onPress={() => setShowExpenseModal(true)}>
                    {t('personal.addExpense')}
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
                          <View style={[styles.categoryIcon, { backgroundColor: expense.category_color || '#3534C9' }]}>
                            <MaterialCommunityIcons name={materialIcon(expense.category_icon)} size={20} color="#fff" />
                          </View>
                          <View>
                            <Text variant="titleMedium">{expense.category_name || t('personal.noCategory')}</Text>
                            <Text variant="bodySmall" style={styles.expenseDescription}>
                              {expense.description}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.amountCol}>
                          {(() => {
                            const dual = formatDual(expense.amount, expense.currency || preferredCurrency)
                            return (
                              <>
                                <Text variant="titleLarge" style={styles.expenseAmount}>{dual.primary}</Text>
                                {dual.secondary ? (
                                  <Text variant="bodySmall" style={styles.mutedText}>{dual.secondary}</Text>
                                ) : null}
                              </>
                            )
                          })()}
                        </View>
                      </View>
                      <View style={styles.expenseFooter}>
                        <Chip icon="calendar" compact>{fmtDate(expense.date)}</Chip>
                        <Chip icon="credit-card" compact>{paymentLabel(expense.payment_method)}</Chip>
                      </View>
                    </TouchableOpacity>
                    <View style={styles.expenseActions}>
                      <TouchableOpacity
                        style={styles.editActionButton}
                        onPress={() => openEditExpense(expense)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.actionButtonContent}>
                          <MaterialCommunityIcons name="pencil" size={18} color={colors.brand.primary} />
                          <RNText style={styles.editActionText}>{t('common.edit')}</RNText>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteActionButton}
                        onPress={() => handleDeleteExpense(expense.id)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.actionButtonContent}>
                          <MaterialCommunityIcons name="delete-outline" size={18} color={colors.danger} />
                          <Text style={styles.deleteActionText}>{t('common.delete')}</Text>
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
                    {t('personal.emptyBudgets')}
                  </Text>
                  <Button mode="contained" onPress={() => setShowBudgetModal(true)}>
                    {t('personal.createBudget')}
                  </Button>
                </Card.Content>
              </Card>
            ) : (
              budgets.map(budget => (
                <Card key={budget.id} style={styles.card}>
                  <Card.Content>
                    <TouchableOpacity onPress={() => openEditBudget(budget)} activeOpacity={0.7}>
                      <View style={styles.budgetHeader}>
                        <Text variant="titleMedium">{budget.category_name || t('personal.general')}</Text>
                        <Text variant="headlineSmall">
                          {(() => {
                            const dual = formatDual(budget.amount, budget.currency || preferredCurrency)
                            return dual.secondary ? `${dual.primary}\n${dual.secondary}` : dual.primary
                          })()}
                        </Text>
                      </View>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${Math.min(parseFloat(budget.percentage_used), 100)}%`,
                              backgroundColor: parseFloat(budget.percentage_used) > 100 ? colors.danger : '#3534C9',
                            },
                          ]}
                        />
                      </View>
                      <View style={styles.budgetFooter}>
                        <Text variant="bodySmall">{t('personal.spentLabel')} {format(parseFloat(budget.spent))}</Text>
                        <Text variant="bodySmall">{t('personal.remainingLabel')} {format(parseFloat(budget.remaining))}</Text>
                      </View>
                    </TouchableOpacity>
                    <View style={styles.budgetActions}>
                      <Button
                        mode="outlined"
                        compact
                        onPress={() => navigation.navigate('TirarDinheiroOrcamento', { budgetId: budget.id })}
                        icon="wallet-outline"
                        style={styles.budgetActionButton}
                      >
                        {t('personal.manageBudget')}
                      </Button>
                      <Button
                        mode="contained"
                        compact
                        onPress={() => navigation.navigate('TirarDinheiroOrcamento', { budgetId: budget.id })}
                        icon="plus"
                        style={styles.budgetActionButton}
                        buttonColor={colors.brand.primary}
                      >
                        {t('personal.addSpend')}
                      </Button>
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
                    {t('personal.emptyGoals')}
                  </Text>
                  <Button mode="contained" onPress={() => setShowGoalModal(true)}>
                    {t('personal.createGoal')}
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
                      <IconButton icon="pencil" onPress={() => openEditGoal(goal)} />
                      {(goal.status === 'active' || goal.status === 'completed' || goal.status === 'cancelled') && (
                        <Chip
                          icon="check-circle"
                          style={styles.statusChip}
                        >
                          {goal.status === 'completed' ? t('personal.statusCompleted') : goal.status === 'cancelled' ? t('personal.statusCancelled') : t('personal.statusActive')}
                        </Chip>
                      )}
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(parseFloat(goal.progress_percentage), 100)}%`,
                            backgroundColor: goal.status === 'completed' ? '#4DB83D' : '#3534C9',
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.goalFooter}>
                      <Text variant="bodySmall">
                        {(() => {
                          const curDual = formatDual(goal.current_amount, goal.currency || preferredCurrency)
                          const tgtDual = formatDual(goal.target_amount, goal.currency || preferredCurrency)
                          return `${curDual.primary} / ${tgtDual.primary}`
                        })()}
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
                        {t('personal.addMoney')}
                      </Button>
                    )}
                  </Card.Content>
                </Card>
              ))
            )}
          </View>
        )}

        {activeTab === 'income' && (
          <View style={styles.content}>
            <PersonalIncomeTab periodState={periodState} onRefreshParent={loadData} />
          </View>
        )}

        {activeTab === 'debts' && (
          <View style={styles.content}>
            {debts.length === 0 ? (
              <Card style={styles.card}>
                <Card.Content style={styles.emptyContent}>
                  <MaterialCommunityIcons name="credit-card" size={64} color="#ccc" />
                  <Text variant="bodyLarge" style={styles.emptyText}>
                    {t('personal.emptyDebts')}
                  </Text>
                  <Button mode="contained" onPress={() => setShowDebtModal(true)}>
                    {t('personal.addDebt')}
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
                        {debt.status === 'paid' ? t('personal.statusPaid') : debt.status === 'overdue' ? t('personal.statusOverdue') : t('personal.statusActive')}
                      </Chip>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(parseFloat(debt.progress_percentage), 100)}%`,
                            backgroundColor: colors.danger,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.debtInfo}>
                      <View style={styles.debtInfoRow}>
                        <Text variant="bodySmall" style={styles.debtInfoLabel}>
                          {t('personal.totalLabel')}
                        </Text>
                        <Text variant="bodyMedium" style={styles.debtInfoValue}>
                          {formatDual(debt.total_amount, debt.currency || preferredCurrency).primary}
                        </Text>
                      </View>
                      <View style={styles.debtInfoRow}>
                        <Text variant="bodySmall" style={styles.debtInfoLabel}>
                          {t('personal.paidLabel')}
                        </Text>
                        <Text variant="bodyMedium" style={styles.debtInfoValue}>
                          {formatDual(debt.paid_amount, debt.currency || preferredCurrency).primary}
                        </Text>
                      </View>
                      <View style={styles.debtInfoRow}>
                        <Text variant="bodySmall" style={styles.debtInfoLabel}>
                          {t('personal.remainingLabel')}
                        </Text>
                        <Text variant="bodyMedium" style={[styles.debtInfoValue, styles.remainingAmount]}>
                          {formatDual(debt.remaining_amount, debt.currency || preferredCurrency).primary}
                        </Text>
                      </View>
                      <View style={styles.debtInfoRow}>
                        <Text variant="bodySmall" style={styles.debtInfoLabel}>
                          {t('personal.dueDateLabel')}
                        </Text>
                        <Text variant="bodySmall" style={styles.debtInfoValue}>
                          {fmtDate(debt.due_date)}
                        </Text>
                      </View>
                    </View>
                    {debt.status !== 'paid' && parseFloat(debt.remaining_amount) > 0 && (
                      <Button
                        mode="contained"
                        icon="cash-check"
                        onPress={() => {
                          setSelectedDebt(debt)
                          setPaymentAmount('')
                          setPaymentCurrency((debt.currency || preferredCurrency) as CurrencyCode)
                          setShowPayDebtModal(true)
                        }}
                        style={styles.payDebtButton}
                        buttonColor={colors.brand.secondary}
                      >
                        {t('personal.payDebt')}
                      </Button>
                    )}
                    {debt.payments && debt.payments.length > 0 && (
                      <View style={styles.paymentHistory}>
                        <Text variant="labelMedium" style={styles.paymentHistoryTitle}>
                          {t('personal.paymentHistory')}
                        </Text>
                        {debt.payments.slice(0, 5).map((p) => {
                          const payCcy = p.currency || debt.currency || preferredCurrency
                          const converted = p.converted_amount
                          const rate = p.exchange_rate
                          const debtCcy = debt.currency || preferredCurrency
                          return (
                            <View key={p.id} style={styles.paymentHistoryItem}>
                              <Text variant="bodySmall" style={styles.mutedText}>
                                {fmtDate(p.payment_date)} · {format(parseFloat(p.amount), payCcy)}
                              </Text>
                              {converted && payCcy.toUpperCase() !== debtCcy.toUpperCase() ? (
                                <Text variant="bodySmall" style={styles.mutedText}>
                                  {t('personal.equivalent')} {format(parseFloat(converted), debtCcy)}
                                  {rate ? ` · 1 ${payCcy} = ${rate} ${debtCcy}` : ''}
                                </Text>
                              ) : null}
                              {p.exchange_rate_source ? (
                                <Text variant="bodySmall" style={styles.mutedText}>
                                  {t('personal.rateSource')} {p.exchange_rate_source}
                                  {p.exchange_rate_timestamp
                                    ? ` · ${tw('personal.rateAt', { date: fmtDate(p.exchange_rate_timestamp) })}`
                                    : ''}
                                </Text>
                              ) : null}
                              <Text variant="labelSmall" style={styles.mutedText}>
                                {p.status === 'paid' ? t('personal.statusPaidInFull') : t('personal.statusPartial')}
                              </Text>
                            </View>
                          )
                        })}
                      </View>
                    )}
                  </Card.Content>
                </Card>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      {activeTab !== 'principios' && activeTab !== 'income' && (
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
              {editingItem ? t('personal.editExpense') : t('personal.newExpense')}
            </Text>
            
            {/* Category Selection */}
            <View style={styles.dropdownContainer}>
              <View style={styles.categoryHeader}>
                <Text variant="bodySmall" style={styles.label}>{t('personal.category')}</Text>
                <Button
                  mode="text"
                  compact
                  onPress={() => setShowCategoryModal(true)}
                  icon="plus"
                >
                  {t('personal.newCategory')}
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
                                  name={materialIcon(selectedCat.icon)}
                                  size={20}
                                  color={selectedCat.color || '#3534C9'}
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
                            {t('personal.selectCategory')}
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
                  title={t('personal.noCategory')}
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
                        name={materialIcon(category.icon)}
                        size={20}
                        color={category.color || '#3534C9'}
                      />
                    )}
                  />
                ))}
              </Menu>
            </View>
            
            <TextInput 
              label={t('personal.description')} 
              value={expenseForm.description} 
              onChangeText={(text) => setExpenseForm({ ...expenseForm, description: text })} 
            />
            <TextInput 
              label={t('personal.amount')} 
              keyboardType="numeric" 
              value={expenseForm.amount} 
              onChangeText={(text) => setExpenseForm({ ...expenseForm, amount: text })} 
            />
            <CurrencyPicker
              value={expenseForm.currency}
              onChange={(code) => setExpenseForm({ ...expenseForm, currency: code })}
              label={t('market.selectCurrency')}
            />
            <DatePicker
              label={t('personal.date')}
              value={expenseForm.date}
              onChange={(date) => setExpenseForm({ ...expenseForm, date: date || new Date() })}
            />
            <Text variant="bodySmall" style={styles.label}>{t('personal.paymentMethod')}</Text>
            <SegmentedButtons
              value={expenseForm.payment_method}
              onValueChange={(value) => setExpenseForm({ ...expenseForm, payment_method: value })}
              buttons={[
                { value: 'cash', label: t('business.paymentCash') },
                { value: 'card', label: t('business.paymentCard') },
                { value: 'transfer', label: t('business.paymentTransfer') },
              ]}
            />
            {editingItem && (
              <TouchableOpacity
                style={styles.modalDeleteButton}
                onPress={() => handleDeleteExpense(editingItem.id)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name="delete-outline" size={20} color="#fff" />
                <RNText style={styles.modalDeleteButtonText}>{t('personal.deleteExpense')}</RNText>
              </TouchableOpacity>
            )}
            <Button
              mode="contained"
              onPress={handleSaveExpense}
              style={styles.modalButton}
              {...feedback.buttonProps('saveExpense')}
            >
              {feedback.actionLabel('common.save', 'saveExpense', 'feedback.savingExpense')}
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
            setCategoryForm({ name: '', icon: 'tag', color: '#3534C9' })
          }} 
          contentContainerStyle={styles.modal}
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>
            {t('personal.newCategory')}
          </Text>
          <TextInput
            label={t('personal.categoryName')}
            value={categoryForm.name}
            onChangeText={(text) => setCategoryForm({ ...categoryForm, name: text })}
            style={styles.input}
          />
          
          {/* Icon Selection */}
          <Text variant="bodySmall" style={styles.label}>{t('personal.icon')}</Text>
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
                  name={materialIcon(icon)}
                  size={24}
                  color={categoryForm.icon === icon ? categoryForm.color : '#666'}
                />
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Color Selection */}
          <Text variant="bodySmall" style={styles.label}>{t('personal.color')}</Text>
          <View style={styles.colorGrid}>
            {[...colors.chart].map(color => (
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
            loading={feedback.isPending('saveCategory')}
            disabled={!categoryForm.name.trim() || feedback.isPending('saveCategory')}
          >
            {feedback.actionLabel('personal.createCategory', 'saveCategory', 'feedback.savingCategory')}
          </Button>
        </Modal>
      </Portal>

      {/* Budget Modal */}
      <Portal>
        <Modal visible={showBudgetModal} onDismiss={() => { setShowBudgetModal(false); setEditingItem(null); resetBudgetForm() }} contentContainerStyle={styles.modal}>
          <ScrollView>
            <Text variant="headlineSmall" style={styles.modalTitle}>
              {editingItem ? t('personal.editBudget') : t('personal.newBudget')}
            </Text>
            <TextInput 
              label={t('personal.amount')} 
              keyboardType="numeric" 
              value={budgetForm.amount} 
              onChangeText={(text) => setBudgetForm({ ...budgetForm, amount: text })} 
            />
            <CurrencyPicker
              value={budgetForm.currency}
              onChange={(code) => setBudgetForm({ ...budgetForm, currency: code })}
              label={t('market.selectCurrency')}
            />
            
            {/* Period Type Dropdown */}
            <View style={styles.dropdownContainer}>
              <Text variant="bodySmall" style={styles.label}>{t('personal.period')}</Text>
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
                          budgetForm.period_type === 'yearly' ? 'calendar' :
                          'calendar-range'
                        }
                        size={20}
                        color={colors.brand.primary}
                        style={styles.dropdownIcon}
                      />
                      <Text variant="bodyLarge" style={styles.dropdownText}>
                        {budgetForm.period_type === 'daily' ? t('personal.periodDaily') :
                         budgetForm.period_type === 'monthly' ? t('personal.periodMonthly') :
                         budgetForm.period_type === 'yearly' ? t('personal.periodYearly') :
                         t('personal.periodCustom')}
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
                  title={t('personal.periodDaily')}
                  leadingIcon={() => (
                    <MaterialCommunityIcons name="calendar-today" size={20} color={colors.brand.primary} />
                  )}
                />
                <Menu.Item
                  onPress={() => {
                    setBudgetForm({ ...budgetForm, period_type: 'monthly' })
                    setShowBudgetPeriodMenu(false)
                  }}
                  title={t('personal.periodMonthly')}
                  leadingIcon={() => (
                    <MaterialCommunityIcons name="calendar-month" size={20} color={colors.brand.primary} />
                  )}
                />
                <Menu.Item
                  onPress={() => {
                    setBudgetForm({ ...budgetForm, period_type: 'yearly' })
                    setShowBudgetPeriodMenu(false)
                  }}
                  title={t('personal.periodYearly')}
                  leadingIcon={() => (
                    <MaterialCommunityIcons name="calendar" size={20} color={colors.brand.primary} />
                  )}
                />
                <Menu.Item
                  onPress={() => {
                    setBudgetForm({ ...budgetForm, period_type: 'custom' })
                    setShowBudgetPeriodMenu(false)
                  }}
                  title={t('personal.periodCustom')}
                  leadingIcon={() => (
                    <MaterialCommunityIcons name="calendar-range" size={20} color={colors.brand.primary} />
                  )}
                />
              </Menu>
            </View>

            {/* Date inputs based on period type */}
            {budgetForm.period_type === 'daily' && (
              <DatePicker
                label={t('personal.date')}
                value={budgetForm.date}
                onChange={(date) => setBudgetForm({ ...budgetForm, date: date })}
              />
            )}

            {budgetForm.period_type === 'monthly' && (
              <>
                <TextInput 
                  label={t('personal.month')} 
                  keyboardType="numeric" 
                  value={budgetForm.month.toString()} 
                  onChangeText={(text) => setBudgetForm({ ...budgetForm, month: parseInt(text) || 1 })} 
                />
                <TextInput 
                  label={t('personal.year')} 
                  keyboardType="numeric" 
                  value={budgetForm.year.toString()} 
                  onChangeText={(text) => setBudgetForm({ ...budgetForm, year: parseInt(text) || new Date().getFullYear() })} 
                />
              </>
            )}

            {budgetForm.period_type === 'yearly' && (
              <TextInput 
                label={t('personal.year')} 
                keyboardType="numeric" 
                value={budgetForm.year.toString()} 
                onChangeText={(text) => setBudgetForm({ ...budgetForm, year: parseInt(text) || new Date().getFullYear() })} 
              />
            )}

            {budgetForm.period_type === 'custom' && (
              <>
                <DatePicker
                  label={t('personal.startDate')}
                  value={budgetForm.start_date}
                  onChange={(date) => setBudgetForm({ ...budgetForm, start_date: date })}
                />
                <DatePicker
                  label={t('personal.endDate')}
                  value={budgetForm.end_date}
                  onChange={(date) => setBudgetForm({ ...budgetForm, end_date: date })}
                  minimumDate={budgetForm.start_date || undefined}
                />
              </>
            )}

            <Button
              mode="contained"
              onPress={handleSaveBudget}
              style={styles.modalButton}
              {...feedback.buttonProps('saveBudget')}
            >
              {feedback.actionLabel(
                'common.save',
                'saveBudget',
                editingItem ? 'feedback.savingBudget' : 'feedback.creatingBudget',
              )}
            </Button>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Goal Modal */}
      <Portal>
        <Modal visible={showGoalModal} onDismiss={() => { setShowGoalModal(false); setEditingItem(null); resetGoalForm() }} contentContainerStyle={styles.modal}>
          <Text variant="headlineSmall" style={styles.modalTitle}>
            {editingItem ? t('personal.editGoal') : t('personal.newGoal')}
          </Text>
          <TextInput label={t('personal.goalTitle')} value={goalForm.title} onChangeText={(text) => setGoalForm({ ...goalForm, title: text })} />
          <TextInput label={t('personal.description')} multiline value={goalForm.description} onChangeText={(text) => setGoalForm({ ...goalForm, description: text })} />
          <TextInput label={t('personal.targetAmount')} keyboardType="numeric" value={goalForm.target_amount} onChangeText={(text) => setGoalForm({ ...goalForm, target_amount: text })} />
          <CurrencyPicker
            value={goalForm.currency}
            onChange={(code) => setGoalForm({ ...goalForm, currency: code })}
            label={t('market.selectCurrency')}
          />
          <DatePicker
            label={t('personal.targetDate')}
            value={goalForm.target_date}
            onChange={(date) => setGoalForm({ ...goalForm, target_date: date })}
          />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text variant="bodyMedium">{t('personal.goalReminder')}</Text>
            <Switch
              value={goalForm.reminder_enabled}
              onValueChange={(value) => setGoalForm({ ...goalForm, reminder_enabled: value })}
            />
          </View>
          {goalForm.reminder_enabled ? (
            <>
              <DatePicker
                label={t('personal.reminderTime')}
                value={goalForm.reminder_time}
                onChange={(date) => setGoalForm({ ...goalForm, reminder_time: date })}
                mode="time"
              />
              <SegmentedButtons
                value={goalForm.reminder_frequency}
                onValueChange={(value) =>
                  setGoalForm({ ...goalForm, reminder_frequency: value as 'once' | 'daily' | 'weekly' })
                }
                buttons={[
                  { value: 'once', label: t('personal.reminderOnce') },
                  { value: 'daily', label: t('personal.reminderDaily') },
                  { value: 'weekly', label: t('personal.reminderWeekly') },
                ]}
              />
              <Text variant="bodySmall" style={{ marginTop: 8, marginBottom: 8 }}>
                {t('personal.reminderTenMinutes')}
              </Text>
            </>
          ) : null}
          <Button
            mode="contained"
            onPress={handleSaveGoal}
            style={styles.modalButton}
            {...feedback.buttonProps('saveGoal')}
          >
            {feedback.actionLabel('common.save', 'saveGoal', 'feedback.savingGoal')}
          </Button>
          {editingItem && 'target_amount' in editingItem && 'current_amount' in editingItem ? (
            <Button
              mode="outlined"
              onPress={() => handleDeleteGoal(editingItem.id)}
              style={styles.modalButton}
              textColor="#E53935"
            >
              {t('common.delete')}
            </Button>
          ) : null}
        </Modal>
      </Portal>

      {/* Debt Modal */}
      <Portal>
        <Modal visible={showDebtModal} onDismiss={() => { setShowDebtModal(false); setEditingItem(null); resetDebtForm() }} contentContainerStyle={styles.modal}>
          <ScrollView>
            <Text variant="headlineSmall" style={styles.modalTitle}>
              {editingItem ? t('personal.editDebt') : t('personal.newDebt')}
            </Text>
            <TextInput label={t('personal.creditor')} value={debtForm.creditor} onChangeText={(text) => setDebtForm({ ...debtForm, creditor: text })} style={styles.input} />
            <TextInput label={t('personal.totalAmount')} keyboardType="numeric" value={debtForm.total_amount} onChangeText={(text) => setDebtForm({ ...debtForm, total_amount: text })} style={styles.input} />
            <CurrencyPicker
              value={debtForm.currency}
              onChange={(code) => setDebtForm({ ...debtForm, currency: code })}
              label={t('market.selectCurrency')}
            />
            <TextInput label={t('personal.paidAmount')} keyboardType="numeric" value={debtForm.paid_amount} onChangeText={(text) => setDebtForm({ ...debtForm, paid_amount: text })} style={styles.input} />
            <TextInput label={t('personal.interestRate')} keyboardType="numeric" value={debtForm.interest_rate} onChangeText={(text) => setDebtForm({ ...debtForm, interest_rate: text })} style={styles.input} />
            <DatePicker
              label={t('personal.dueDateLabel')}
              value={debtForm.due_date}
              onChange={(date) => setDebtForm({ ...debtForm, due_date: date })}
            />
            <TextInput label={t('personal.description')} value={debtForm.description} onChangeText={(text) => setDebtForm({ ...debtForm, description: text })} multiline numberOfLines={3} style={styles.input} />
            <Button
              mode="contained"
              onPress={handleSaveDebt}
              style={styles.modalButton}
              {...feedback.buttonProps('saveDebt')}
            >
              {feedback.actionLabel('common.save', 'saveDebt', 'feedback.savingDebt')}
            </Button>
          </ScrollView>
        </Modal>
      </Portal>

      {/* Pay Debt Modal */}
      <Portal>
        <Modal 
          visible={showPayDebtModal} 
          onDismiss={() => { 
            setShowPayDebtModal(false)
            setSelectedDebt(null)
            setPaymentAmount('')
            setPaymentCurrency(preferredCurrency)
          }} 
          contentContainerStyle={styles.modal}
        >
          <ScrollView>
            <Text variant="headlineSmall" style={styles.modalTitle}>
              {t('personal.payDebt')}
            </Text>
            {selectedDebt && (
              <>
                <Card style={styles.infoCard}>
                  <Card.Content>
                    <Text variant="titleMedium" style={styles.debtModalTitle}>
                      {selectedDebt.creditor}
                    </Text>
                    <View style={styles.debtModalInfo}>
                      <View style={styles.debtModalRow}>
                        <Text variant="bodySmall" style={styles.debtModalLabel}>
                          {t('personal.totalAmount')}:
                        </Text>
                        <Text variant="bodyMedium" style={styles.debtModalValue}>
                          {format(parseFloat(selectedDebt.total_amount), selectedDebt.currency || preferredCurrency)}
                        </Text>
                      </View>
                      <View style={styles.debtModalRow}>
                        <Text variant="bodySmall" style={styles.debtModalLabel}>
                          {t('personal.alreadyPaid')}
                        </Text>
                        <Text variant="bodyMedium" style={styles.debtModalValue}>
                          {format(parseFloat(selectedDebt.paid_amount), selectedDebt.currency || preferredCurrency)}
                        </Text>
                      </View>
                      <View style={styles.debtModalRow}>
                        <Text variant="bodySmall" style={styles.debtModalLabel}>
                          {t('personal.remainingLabel')}
                        </Text>
                        <Text variant="bodyMedium" style={[styles.debtModalValue, styles.remainingAmount]}>
                          {format(parseFloat(selectedDebt.remaining_amount), selectedDebt.currency || preferredCurrency)}
                        </Text>
                      </View>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${Math.min(parseFloat(selectedDebt.progress_percentage), 100)}%`,
                              backgroundColor: colors.danger,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </Card.Content>
                </Card>
                <TextInput
                  label={t('personal.paymentAmount')}
                  keyboardType="numeric"
                  value={paymentAmount}
                  onChangeText={(text) => setPaymentAmount(text)}
                  style={styles.input}
                  placeholder="0.00"
                />
                <CurrencyPicker
                  value={paymentCurrency}
                  onChange={setPaymentCurrency}
                  label={t('market.selectCurrency')}
                />
                {payQuoteLoading ? (
                  <Text variant="bodySmall" style={styles.previewLabel}>{t('personal.quoteLoading')}</Text>
                ) : null}
                {payQuoteError ? (
                  <Text variant="bodySmall" style={styles.remainingAmount}>{payQuoteError}</Text>
                ) : null}
                {paymentAmount && parseFloat(paymentAmount) > 0 && payQuote && selectedDebt && (
                  <Card style={styles.previewCard}>
                    <Card.Content>
                      <Text variant="bodySmall" style={styles.previewLabel}>{t('personal.afterPayment')}</Text>
                      <View style={styles.previewRow}>
                        <Text variant="bodySmall" style={styles.previewLabel}>{t('personal.paidIn')}</Text>
                        <Text variant="titleMedium" style={styles.previewValue}>
                          {format(parseFloat(paymentAmount.replace(',', '.')), paymentCurrency)}
                        </Text>
                      </View>
                      {paymentCurrency.toUpperCase() !== (selectedDebt.currency || preferredCurrency).toUpperCase() ? (
                        <>
                          <View style={styles.previewRow}>
                            <Text variant="bodySmall" style={styles.previewLabel}>{t('personal.equivalent')}</Text>
                            <Text variant="titleMedium" style={styles.previewValue}>
                              {format(payQuote.amount, selectedDebt.currency || preferredCurrency)}
                            </Text>
                          </View>
                          <Text variant="bodySmall" style={styles.previewLabel}>
                            {tw('market.rateLine', {
                              from: paymentCurrency,
                              rate: String(payQuote.rate),
                              to: selectedDebt.currency || preferredCurrency,
                            })}
                          </Text>
                          {payQuote.source ? (
                            <Text variant="bodySmall" style={styles.previewLabel}>
                              {t('personal.rateSource')} {payQuote.source}
                            </Text>
                          ) : null}
                          {payQuote.updatedAt ? (
                            <Text variant="bodySmall" style={styles.previewLabel}>
                              {tw('personal.rateAt', { date: fmtDate(payQuote.updatedAt) })}
                            </Text>
                          ) : null}
                        </>
                      ) : null}
                      <View style={styles.previewRow}>
                        <Text variant="bodySmall" style={styles.previewLabel}>{t('personal.totalPaid')}</Text>
                        <Text variant="titleMedium" style={styles.previewValue}>
                          {format(parseFloat(selectedDebt.paid_amount) + payQuote.amount, selectedDebt.currency || preferredCurrency)}
                        </Text>
                      </View>
                      <View style={styles.previewRow}>
                        <Text variant="bodySmall" style={styles.previewLabel}>{t('personal.remainingLabel')}</Text>
                        <Text variant="titleMedium" style={[styles.previewValue, parseFloat(selectedDebt.remaining_amount) - payQuote.amount <= 0 ? styles.paidAmount : null]}>
                          {format(Math.max(parseFloat(selectedDebt.remaining_amount) - payQuote.amount, 0), selectedDebt.currency || preferredCurrency)}
                        </Text>
                      </View>
                      {parseFloat(selectedDebt.remaining_amount) - payQuote.amount <= 0 && (
                        <Chip icon="check-circle" style={styles.willBePaidChip} textStyle={styles.willBePaidChipText}>
                          {t('personal.debtFullyPaid')}
                        </Chip>
                      )}
                    </Card.Content>
                  </Card>
                )}
                <Button 
                  mode="contained" 
                  onPress={handlePayDebt} 
                  style={styles.modalButton}
                  disabled={
                    !paymentAmount ||
                    parseFloat(paymentAmount) <= 0 ||
                    feedback.isPending('payDebt')
                  }
                  loading={feedback.isPending('payDebt')}
                  icon="cash-check"
                  buttonColor="#4DB83D"
                >
                  {feedback.actionLabel(
                    'personal.recordPayment',
                    'payDebt',
                    'feedback.processingPayment',
                  )}
                </Button>
              </>
            )}
          </ScrollView>
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
            setContributeCurrency(preferredCurrency)
          }} 
          contentContainerStyle={styles.modal}
        >
          <ScrollView>
            <Text variant="headlineSmall" style={styles.modalTitle}>
              {t('personal.addMoney')} ao Objetivo
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
                            backgroundColor: '#3534C9',
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.goalFooter}>
                      <Text variant="bodySmall">
                        {format(parseFloat(selectedGoal.current_amount), selectedGoal.currency || preferredCurrency)} / {format(parseFloat(selectedGoal.target_amount), selectedGoal.currency || preferredCurrency)}
                      </Text>
                      <Text variant="bodySmall">{parseFloat(selectedGoal.progress_percentage).toFixed(0)}%</Text>
                    </View>
                  </Card.Content>
                </Card>
                <TextInput
                  label={t('personal.amountToAdd')}
                  keyboardType="numeric"
                  value={addMoneyAmount}
                  onChangeText={(text) => setAddMoneyAmount(text)}
                  style={styles.input}
                />
                <CurrencyPicker
                  value={contributeCurrency}
                  onChange={setContributeCurrency}
                  label={t('market.selectCurrency')}
                />
                {addMoneyAmount && parseFloat(addMoneyAmount) > 0 && contributeCurrency === (selectedGoal.currency || preferredCurrency) && (
                  <Card style={styles.previewCard}>
                    <Card.Content>
                      <Text variant="bodySmall" style={styles.previewLabel}>{t('personal.newValue')}</Text>
                      <Text variant="titleLarge" style={styles.previewValue}>
                        {format(parseFloat(selectedGoal.current_amount) + parseFloat(addMoneyAmount), selectedGoal.currency || preferredCurrency)} / {format(parseFloat(selectedGoal.target_amount), selectedGoal.currency || preferredCurrency)}
                      </Text>
                      <Text variant="bodySmall" style={styles.previewPercentage}>
                        {tw('personal.goalProgress', { percent: ((parseFloat(selectedGoal.current_amount) + parseFloat(addMoneyAmount)) / parseFloat(selectedGoal.target_amount) * 100).toFixed(0) })}
                      </Text>
                    </Card.Content>
                  </Card>
                )}
                <Button 
                  mode="contained" 
                  onPress={handleAddMoneyToGoal} 
                  style={styles.modalButton}
                  disabled={
                    !addMoneyAmount ||
                    parseFloat(addMoneyAmount) <= 0 ||
                    feedback.isPending('contributeGoal')
                  }
                  loading={feedback.isPending('contributeGoal')}
                  icon="check-circle"
                >
                  {feedback.actionLabel('common.add', 'contributeGoal', 'feedback.addingContribution')}
                </Button>
              </>
            )}
          </ScrollView>
        </Modal>
      </Portal>

      {/* Budget Expenses Modal */}
      <Portal>
        <Modal
          visible={showBudgetExpensesModal}
          onDismiss={() => {
            setShowBudgetExpensesModal(false)
            setSelectedBudget(null)
            setBudgetExpenses([])
          }}
          contentContainerStyle={styles.modal}
        >
          <ScrollView>
            <Text variant="headlineSmall" style={styles.modalTitle}>
              {t('personal.budgetExpenses')}
            </Text>
            {selectedBudget && (
              <>
                <Card style={styles.infoCard}>
                  <Card.Content>
                    <View style={styles.budgetHeader}>
                      <Text variant="titleMedium">{selectedBudget.category_name || t('personal.general')}</Text>
                      <Text variant="headlineSmall">{format(parseFloat(selectedBudget.amount))}</Text>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(parseFloat(selectedBudget.percentage_used), 100)}%`,
                            backgroundColor: parseFloat(selectedBudget.percentage_used) > 100 ? colors.danger : '#3534C9',
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.budgetFooter}>
                      <Text variant="bodySmall">{t('personal.spentLabel')} {format(parseFloat(selectedBudget.spent))}</Text>
                      <Text variant="bodySmall">{t('personal.remainingLabel')} {format(parseFloat(selectedBudget.remaining))}</Text>
                    </View>
                    <Text variant="bodySmall" style={{ marginTop: 8, color: '#6b7280' }}>
                      {selectedBudget.period_type === 'daily' && selectedBudget.date
                        ? tw('personal.periodSingle', { date: fmtDate(selectedBudget.date) })
                        : selectedBudget.period_type === 'monthly'
                        ? `Período: ${['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][selectedBudget.month]} ${selectedBudget.year}`
                        : selectedBudget.period_type === 'yearly'
                        ? `Período: ${selectedBudget.year}`
                        : selectedBudget.start_date && selectedBudget.end_date
                        ? tw('personal.periodRange', { from: fmtDate(selectedBudget.start_date), to: fmtDate(selectedBudget.end_date) })
                        : ''}
                    </Text>
                  </Card.Content>
                </Card>
                <View style={{ marginTop: 16 }}>
                  <Button
                    mode="contained"
                    onPress={() => {
                      setShowBudgetExpensesModal(false)
                      openAddExpenseFromBudget(selectedBudget)
                    }}
                    icon="plus"
                    buttonColor={colors.brand.primary}
                    style={{ marginBottom: 16 }}
                  >
                    {t('personal.addSpend')}
                  </Button>
                </View>
                {loadingBudgetExpenses ? (
                  <View style={styles.emptyContent}>
                    <Text variant="bodyMedium">Carregando gastos...</Text>
                  </View>
                ) : budgetExpenses.length === 0 ? (
                  <Card style={styles.card}>
                    <Card.Content style={styles.emptyContent}>
                      <MaterialCommunityIcons name="cash-minus" size={48} color="#ccc" />
                      <Text variant="bodyMedium" style={styles.emptyText}>
                        Nenhum gasto registado neste orçamento
                      </Text>
                    </Card.Content>
                  </Card>
                ) : (
                  budgetExpenses.map(expense => (
                    <Card key={expense.id} style={styles.expenseCard}>
                      <Card.Content>
                        <View style={styles.expenseHeader}>
                          <View style={styles.expenseLeft}>
                            {expense.category_icon && (
                              <View style={[styles.categoryIcon, { backgroundColor: (expense.category_color || '#3534C9') + '20' }]}>
                                <MaterialCommunityIcons
                                  name={materialIcon(expense.category_icon)}
                                  size={20}
                                  color={expense.category_color || '#3534C9'}
                                />
                              </View>
                            )}
                            <View style={{ flex: 1 }}>
                              <Text variant="titleSmall">{expense.description}</Text>
                              <Text variant="bodySmall" style={styles.expenseDescription}>
                                {fmtDate(expense.date)} • {paymentLabel(expense.payment_method)}
                              </Text>
                            </View>
                          </View>
                          <Text variant="titleMedium" style={styles.expenseAmount}>
                            {formatDual(expense.amount, expense.currency || preferredCurrency).primary}
                          </Text>
                        </View>
                      </Card.Content>
                    </Card>
                  ))
                )}
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
    backgroundColor: colors.background.default,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
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
  planChip: {
    backgroundColor: '#eef2ff',
    borderColor: '#c7d2fe',
  },
  planChipText: {
    color: '#1E2070',
    fontSize: 12,
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
    shadowColor: '#3534C9',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderLeftWidth: 5,
    borderLeftColor: '#3534C9',
  },
  ruleCard3x: {
    borderLeftColor: '#4DB83D',
  },
  orcamentoCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#3534C9',
  },
  orcamentoCta: {
    marginTop: 8,
    color: '#3534C9',
    fontWeight: '600',
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
    borderColor: colors.brand.primary,
  },
  resultCard30: {
    backgroundColor: '#fdf2f8',
    borderWidth: 2.5,
    borderColor: '#5B5AD6',
  },
  resultCard20: {
    backgroundColor: '#f0fdf4',
    borderWidth: 2.5,
    borderColor: '#4DB83D',
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
    borderColor: '#4DB83D',
  },
  verificationWarning: {
    backgroundColor: '#fffbeb',
    borderColor: '#E67E22',
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
    backgroundColor: '#3534C9',
    borderRadius: 20,
    elevation: 6,
    shadowColor: '#3534C9',
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
    shadowColor: '#3534C9',
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
    color: '#3534C9',
    fontWeight: '700',
  },
  periodSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  periodLabel: {
    color: '#6b7280',
    marginBottom: 8,
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
    color: colors.danger,
  },
  amountCol: {
    alignItems: 'flex-end',
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
  budgetActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  budgetActionButton: {
    flex: 1,
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
    borderColor: colors.brand.primary,
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
    color: colors.brand.primary,
    marginTop: 4,
  },
  modalDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 12,
    gap: 8,
    shadowColor: colors.danger,
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
  debtInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  debtInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  debtInfoLabel: {
    color: '#6b7280',
  },
  debtInfoValue: {
    fontWeight: '600',
    color: '#1f2937',
  },
  remainingAmount: {
    color: colors.danger,
    fontWeight: '700',
  },
  payDebtButton: {
    marginTop: 16,
  },
  paymentHistory: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  paymentHistoryTitle: {
    marginBottom: 6,
    color: colors.text.secondary,
  },
  paymentHistoryItem: {
    marginBottom: 10,
  },
  mutedText: {
    color: colors.text.muted,
  },
  debtModalTitle: {
    fontWeight: '700',
    marginBottom: 12,
    color: '#1f2937',
  },
  debtModalInfo: {
    marginTop: 8,
  },
  debtModalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  debtModalLabel: {
    color: '#6b7280',
  },
  debtModalValue: {
    fontWeight: '600',
    color: '#1f2937',
  },
  willBePaidChip: {
    backgroundColor: '#d1fae5',
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  willBePaidChipText: {
    color: '#4DB83D',
    fontSize: 12,
  },
  paidAmount: {
    color: '#4DB83D',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  budgetComparisonCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  budgetComparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  budgetComparisonTitle: {
    fontWeight: '600',
    color: '#1f2937',
  },
  budgetComparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  budgetComparisonItem: {
    flex: 1,
    alignItems: 'center',
  },
  budgetComparisonLabel: {
    color: '#6b7280',
    marginBottom: 4,
  },
  budgetComparisonValue: {
    fontWeight: '700',
    color: '#1f2937',
  },
  budgetComparisonPercentage: {
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyComparison: {
    alignItems: 'center',
    padding: 32,
  },
  emptyComparisonText: {
    color: '#9ca3af',
    marginTop: 12,
    textAlign: 'center',
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
    backgroundColor: '#3534C9',
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
  expenseActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  editActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#3534C9',
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editActionText: {
    color: '#3534C9',
    fontWeight: '600',
  },
  deleteActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteActionText: {
    color: colors.danger,
    fontWeight: '600',
  },
  categoryHeader: {
    marginBottom: 8,
  },
  label: {
    color: '#6b7280',
    marginBottom: 4,
    fontWeight: '600',
  },
  placeholderText: {
    color: '#9ca3af',
  },
  input: {
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOptionSelected: {
    borderColor: '#3534C9',
    backgroundColor: '#eef2ff',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: '#1f2937',
  },
})

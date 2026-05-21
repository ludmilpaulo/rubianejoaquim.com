export interface FinancialHealth {
  score: number
  grade: 'excellent' | 'good' | 'fair' | 'needs_attention' | 'critical'
  month: number
  year: number
  income: number
  expenses: number
  balance: number
  debt_remaining: number
  components: {
    spending: number
    budget: number
    goals: number
    debt: number
    savings: number
  }
  tips: string[]
}

export interface DashboardGoal {
  id: number
  title: string
  current_amount: number
  target_amount: number
  progress_percentage: number
  target_date: string
}

export interface DashboardBudget {
  id: number
  category: string | null
  amount: number
  spent: number
  remaining: number
  percentage_used: number
}

export interface DashboardData {
  health: FinancialHealth
  month: number
  year: number
  currency: string
  summary: {
    income: number
    expenses: number
    balance: number
    business_profit: number
  }
  expenses_by_category: { name: string; color: string; total: number }[]
  goals: DashboardGoal[]
  debts: {
    id: number
    creditor: string
    remaining_amount: number
    due_date: string
    progress_percentage: number
  }[]
  budgets: DashboardBudget[]
  tasks_today: number
  unread_notifications: number
}

export interface PersonalIncome {
  id: number
  amount: string | number
  description: string
  date: string
  source_type: string
  currency: string
  category?: number
  category_name?: string
  is_recurring?: boolean
  recurrence?: string
  notes?: string
}

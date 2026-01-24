// User Types
export interface User {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
  is_staff: boolean
  is_superuser: boolean
  is_admin: boolean
}

export interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  hasPaidAccess: boolean
}

// Enrollment & Mentorship Types
export interface Enrollment {
  id: number
  course: {
    id: number
    title: string
    slug: string
  }
  status: 'pending' | 'active' | 'cancelled'
  created_at: string
}

export interface MentorshipRequest {
  id: number
  package: {
    id: number
    title: string
  }
  status: 'pending' | 'approved' | 'scheduled' | 'completed' | 'cancelled'
  created_at: string
}

// Personal Finance Types
export interface Expense {
  id: number
  amount: number
  category: string
  description: string
  date: string
  created_at: string
}

export interface Budget {
  id: number
  category: string
  amount: number
  period: 'weekly' | 'monthly' | 'yearly'
  spent: number
  created_at: string
}

export interface Goal {
  id: number
  title: string
  target_amount: number
  current_amount: number
  deadline: string
  created_at: string
}

// Business Finance Types
export interface Sale {
  id: number
  amount: number
  description: string
  date: string
  created_at: string
}

export interface BusinessExpense {
  id: number
  amount: number
  category: string
  description: string
  date: string
  created_at: string
}

export interface BusinessMetrics {
  total_sales: number
  total_expenses: number
  profit: number
  period: string
}

// Education Types
export interface Lesson {
  id: number
  title: string
  description: string
  duration: number
  is_completed: boolean
  course: {
    id: number
    title: string
  }
}

export interface Progress {
  level: number
  xp: number
  streak: number
  lessons_completed: number
  certificates: number
}

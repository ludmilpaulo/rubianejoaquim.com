import type { PersonalFinanceTab } from '../screens/personalFinanceTypes'

export type HomeStackParamList = {
  HomeMain: undefined
  ToDoList: undefined
  Targets: undefined
  Notifications: undefined
  AICopilot: undefined
  Market: undefined
  HealthHistory: undefined
  Analytics: undefined
  FinancialHealth: undefined
  FamilyFinance: { inviteCode?: string; spaceId?: number } | undefined
  ReceiptScanner: undefined
  ScanReceipt: undefined
  ReviewReceipt: { receiptId: number }
  TransactionHistory: undefined
  WalletHome: undefined
}

export type PersonalStackParamList = {
  PersonalMain: { initialTab?: PersonalFinanceTab } | undefined
  MonthlyPlan: undefined
  OrcamentoPrincipios: undefined
  TirarDinheiroOrcamento: { budgetId?: number } | undefined
}

export type EducationStackParamList = {
  EducationMain: undefined
  CourseLessons: { courseId: number; enrollmentId: number }
  CourseProgress: { courseId: number; enrollmentId: number }
  LessonDetail: { lessonId: number }
  LessonQuiz: { lessonId: number; quizId: number }
  CourseList: undefined
}

export type ProfileStackParamList = {
  ProfileMain: undefined
  Settings: undefined
  About: undefined
  HelpSupport: undefined
  InstructorDashboard: undefined
}

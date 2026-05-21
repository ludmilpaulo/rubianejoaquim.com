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
  FamilyFinance: undefined
  ReceiptScanner: undefined
}

export type PersonalStackParamList = {
  PersonalMain: { initialTab?: PersonalFinanceTab } | undefined
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
}

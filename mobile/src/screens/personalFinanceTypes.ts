export type PersonalFinanceTab =
  | 'principios'
  | 'overview'
  | 'expenses'
  | 'income'
  | 'budgets'
  | 'goals'
  | 'debts'

export type PersonalFinanceRouteParams = {
  initialTab?: PersonalFinanceTab
}

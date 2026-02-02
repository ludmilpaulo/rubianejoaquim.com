# Budget Expense Tracking - Test Checklist

## Test Credentials
- Email: Maitland@2025
- Password: (as provided)

## Pre-Test Setup
1. ✅ TypeScript compilation passes (`npx tsc --noEmit`)
2. ✅ Backend endpoint `/finance/personal/budgets/{id}/expenses/` is implemented
3. ✅ Mobile API service includes `getBudgetExpenses` method

## Test Scenarios

### 1. Budget Management
- [ ] Login with Maitland@2025
- [ ] Navigate to "Pessoal" tab → "Orçamentos" tab
- [ ] Create a new budget:
  - Select category (or leave as "Geral")
  - Set amount (e.g., 10,000 KZ)
  - Choose period type (daily/monthly/yearly/custom)
  - Set dates if custom period
  - Save budget
- [ ] Verify budget appears in list
- [ ] Verify budget shows 0% used initially

### 2. View Budget Expenses
- [ ] Tap on a budget card
- [ ] Tap "Ver Gastos" button
- [ ] Verify modal opens showing:
  - Budget details (category, amount, period)
  - Progress bar
  - Spent/Remaining amounts
  - Empty state if no expenses
- [ ] Verify period information displays correctly

### 3. Add Expense from Budget
- [ ] From budget card, tap "Adicionar Gasto" button
- [ ] Verify expense form opens with:
  - Category pre-filled (matching budget category)
  - Date set to today
- [ ] Fill in expense details:
  - Amount (e.g., 2,000 KZ)
  - Description
  - Payment method
- [ ] Save expense
- [ ] Verify:
  - Expense is created
  - Budget modal closes
  - Budget spent amount updates
  - Budget percentage used updates
  - Expense appears in budget expenses list

### 4. Date Filtering - Daily Period
- [ ] Create a daily budget for a specific date
- [ ] Add expenses on that date
- [ ] Add expenses on different dates
- [ ] View budget expenses
- [ ] Verify only expenses from the budget date appear
- [ ] Test PeriodSelector:
  - Select "Diário" period
  - Select a specific date using date picker
  - Verify expenses filter correctly

### 5. Date Filtering - Monthly Period
- [ ] Create a monthly budget (e.g., January 2025)
- [ ] Add expenses in January
- [ ] Add expenses in February
- [ ] View budget expenses
- [ ] Verify only January expenses appear
- [ ] Test PeriodSelector:
  - Select "Mensal" period
  - Select month and year
  - Verify expenses filter correctly

### 6. Date Filtering - Yearly Period
- [ ] Create a yearly budget (e.g., 2025)
- [ ] Add expenses throughout 2025
- [ ] Add expenses in 2024
- [ ] View budget expenses
- [ ] Verify only 2025 expenses appear
- [ ] Test PeriodSelector:
  - Select "Anual" period
  - Select year
  - Verify expenses filter correctly

### 7. Date Filtering - Custom Period
- [ ] Create a custom budget (e.g., Jan 1 - Jan 15, 2025)
- [ ] Add expenses within the range
- [ ] Add expenses outside the range
- [ ] View budget expenses
- [ ] Verify only expenses within date range appear
- [ ] Test PeriodSelector:
  - Select "Custom" period
  - Set start and end dates
  - Verify expenses filter correctly

### 8. Budget Expense Tracking Accuracy
- [ ] Create budget: 10,000 KZ for category "Alimentação"
- [ ] Add expense: 3,000 KZ in "Alimentação" category
- [ ] Add expense: 2,000 KZ in "Transporte" category
- [ ] View budget expenses
- [ ] Verify:
  - Only "Alimentação" expense appears (3,000 KZ)
  - Budget spent = 3,000 KZ
  - Budget remaining = 7,000 KZ
  - Percentage used = 30%

### 9. Budget Updates After Expense Changes
- [ ] Create budget and add expense
- [ ] View budget expenses
- [ ] Edit expense amount from expenses list
- [ ] Verify budget totals update automatically
- [ ] Delete expense from expenses list
- [ ] Verify budget totals update automatically

### 10. OrcamentoPrincipiosScreen Navigation
- [ ] Navigate to "Pessoal" tab → "Princípios" tab
- [ ] Scroll to bottom
- [ ] Verify "Gerir Orçamentos" card appears
- [ ] Tap "Ver Orçamentos" button
- [ ] Verify navigates to budgets tab
- [ ] Tap "Ver Gastos" button
- [ ] Verify navigates to expenses tab
- [ ] Tap "Gerir Orçamentos e Gastos" button
- [ ] Verify navigates to budgets tab

### 11. Multiple Budgets with Same Category
- [ ] Create monthly budget for "Alimentação" in January
- [ ] Create monthly budget for "Alimentação" in February
- [ ] Add expense in January
- [ ] Add expense in February
- [ ] View January budget expenses
- [ ] Verify only January expense appears
- [ ] View February budget expenses
- [ ] Verify only February expense appears

### 12. Budget Without Category (Geral)
- [ ] Create budget without selecting category
- [ ] Add expense without category
- [ ] View budget expenses
- [ ] Verify expense appears (both have no category)
- [ ] Add expense with category
- [ ] View budget expenses
- [ ] Verify only expense without category appears

## Expected Behavior

### Budget Card Actions
- Tap on card → Opens edit modal
- "Ver Gastos" button → Opens expenses modal
- "Adicionar Gasto" button → Opens expense form pre-filled with budget category

### Budget Expenses Modal
- Shows budget summary at top
- Shows period information
- Lists all expenses matching budget category and period
- "Adicionar Gasto" button creates new expense linked to budget
- Expenses reload when created/deleted

### Date Filters
- Daily: Filters by exact date
- Monthly: Filters by month and year
- Yearly: Filters by year
- Custom: Filters by date range (inclusive)

## Known Issues to Watch For
- [ ] Budget expenses not loading
- [ ] Date filters not applying correctly
- [ ] Budget totals not updating after expense changes
- [ ] Category matching not working correctly
- [ ] Period information not displaying correctly

## Notes
- All date comparisons should be timezone-aware
- Budget spent calculation uses category + period matching
- Expenses without category only match budgets without category
- PeriodSelector now supports date selection for daily period

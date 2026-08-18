# Zenda Financial Platform — Current State Audit

Baseline captured before production financial platform upgrade. Use this to avoid duplicating existing functionality.

## Backend apps

| App | Path | Purpose |
|-----|------|---------|
| `finance` | `backend/finance/` | Personal/business finance, receipts, FX, budgets, goals, debts |
| `finance_space` | `backend/finance_space/` | Shared/family finance spaces |
| `ai_copilot` | `backend/ai_copilot/` | AI assistant with deterministic facts |
| `subscriptions` | `backend/subscriptions/` | Mobile IAP + payment proofs (not user wallet) |

## Models (`backend/finance/models.py`)

| Model | Key fields | Notes |
|-------|------------|-------|
| `Category` | name, icon, color, is_personal, is_business | System categories when user=null |
| `PersonalIncome` | amount, currency, date, source_type, is_recurring | |
| `PersonalExpense` | amount, currency, date, category, payment_method, receipt_url | FX snapshot fields added in Phase 1 |
| `ExchangeRate` | base_currency, target_currency, rate, source | Cached FX |
| `Budget` | amount, currency, period_type, category | Computed spent/remaining |
| `Goal` | target_amount, current_amount, currency, target_date | |
| `GoalContribution` | amount, currency, exchange_rate, converted_amount | FX snapshot pattern |
| `Debt` / `DebtPayment` | creditor, paid_amount, FX snapshots | |
| `Receipt` | file, merchant, amount, currency, scanned_text, linked_expense | Extended in Phase 1 |
| `FinancialHealthSnapshot` | month, year, score, grade | Monthly health history |
| `MonthlyFinancialPlan` | salary, spending_limit, last_budget_alert_level | |

**Not present (pre-upgrade):** Wallet, LedgerEntry, PaymentTransaction, AIInsight.

## API endpoints (`/api/finance/`)

- `categories/` — CRUD
- `personal/expenses/` — CRUD + `summary/`
- `personal/income/` — CRUD + `summary/`
- `personal/budgets/` — CRUD + `{id}/expenses/`
- `personal/goals/` — CRUD + `{id}/add-money/`
- `personal/debts/` — CRUD + `{id}/pay/`
- `personal/monthly-plans/` — CRUD + `current/`, `dashboard/`
- `dashboard/` — health_score, health-history, analytics
- `exchange-rates/` — supported, convert
- `receipts/` — CRUD + `reprocess/`, `create-expense/`, `file/` (Phase 1)
- `transactions/history/` — unified feed (Phase 1)

## AI Copilot (`/api/ai-copilot/`)

- `conversations/` — CRUD
- `conversations/chat/` — facts + OpenAI + proposed_action
- `conversations/confirm-action/` — confirm writes only
- `financial-health/` — structured health summary (Phase 2)
- `insights/` — patterns (Phase 2)
- `goals/{id}/coach/` — goal coach (Phase 2)

## Mobile screens

| Screen | File | Status |
|--------|------|--------|
| Personal finance hub | `mobile/src/screens/PersonalFinanceScreen.tsx` | Expenses, budgets, goals, debts |
| Receipt scanner | `mobile/src/screens/ReceiptScannerScreen.tsx` | Upload + history |
| Scan receipt | `mobile/src/screens/ScanReceiptScreen.tsx` | Camera + ML Kit (Phase 1) |
| Review receipt | `mobile/src/screens/ReviewReceiptScreen.tsx` | Confirm extracted data (Phase 1) |
| Transaction history | `mobile/src/screens/TransactionHistoryScreen.tsx` | Unified feed (Phase 1) |
| AI Copilot | `mobile/src/screens/AICopilotScreen.tsx` | Chat + insights |
| Financial health | `mobile/src/screens/FinancialHealthScreen.tsx` | Phase 2 |
| Wallet | `mobile/src/screens/wallet/*` | Phase 3 (feature-flagged) |

## Gaps addressed by upgrade

1. Receipt OCR was regex stub — replaced with ML Kit + Django parser
2. No FX snapshot on expenses — added GoalContribution pattern
3. Budget alerts only 80/100 on monthly plan — per-budget 70/80/90/100
4. No wallet ledger — new `wallet/` app with MockProvider
5. Local media only — signed URL access for receipts
6. AI lacked pattern detection / health screen — Phase 2

## Regulatory references

See `docs/wallet-provider-decision-angola.md` for BNA links and provider comparison.

# Zenda Product Roadmap

**Positioning:** AI Financial Coach · Learning Platform · Personal Growth · Business Finance · Global Fintech

| Symbol | Meaning |
|--------|---------|
| ✅ | Shipped |
| 🟡 | Partial |
| 🔲 | Planned |

---

## Phase B — Differentiation ✅ (foundation shipped)

| Item | Status |
|------|--------|
| Health score history + snapshots | ✅ `FinancialHealthSnapshot`, `/dashboard/health-history/` |
| Health history screen + bar chart | ✅ `HealthHistoryScreen` |
| Advanced analytics (debt payoff, savings, forecast) | ✅ `build_analytics()`, `AnalyticsScreen` |
| AI monthly report | ✅ `/ai-copilot/.../monthly-report/` |
| AI savings plan | ✅ `/ai-copilot/.../savings-plan/` |
| AI debt strategy | ✅ `/ai-copilot/.../debt-strategy/` |
| Copilot report chips + insights | ✅ `AICopilotScreen` |
| Personal/Business full theme refresh | 🟡 Tab headers use Zenda colors; legacy screens retain internal styles |

---

## Phase C — Monetization & scale ✅ (foundation shipped)

| Item | Status |
|------|--------|
| Plan tiers (free/premium/business/family) | ✅ `MobileAppSubscription.plan_tier` + `subscriptions/tiers.py` |
| Feature list in `/subscriptions/mobile/me/` | ✅ `effective_tier`, `features` |
| Mobile tier utils | ✅ `utils/subscriptionTier.ts` |
| Family / shared finance | ✅ `finance_space` app — spaces, goals, budgets, contributions |
| `FamilyFinanceScreen` | ✅ create/join/view spaces |
| Landing tier comparison | ✅ (Phase A) |

**Still 🔲:** Strict UI gating on every premium screen, admin tier assignment UI, PDF export.

---

## Phase D — Enterprise ✅ (foundation shipped)

| Item | Status |
|------|--------|
| Receipt model + upload + OCR stub | ✅ `Receipt`, `/finance/receipts/`, `ReceiptScannerScreen` |
| Offline expense queue | ✅ `utils/offlineQueue.ts`, flush on app active |
| API response cache | ✅ `utils/apiCache.ts`, dashboard cached 2 min |
| Notification poll (WS alternative) | ✅ `/tasks/notifications/poll/` |

**Still 🔲:** Full OCR service, WebSockets/Channels, Reanimated transitions, lazy lists everywhere.

---

## Deploy after pull

```bash
cd backend
python manage.py migrate
python manage.py seed_exchange_rates
```

---

## Key API endpoints (new)

| Endpoint | Purpose |
|----------|---------|
| `GET /api/finance/dashboard/health-history/` | 6-month health trend |
| `GET /api/finance/dashboard/analytics/` | Debt/savings/forecast |
| `GET /api/ai-copilot/conversations/monthly-report/` | AI monthly summary |
| `GET /api/ai-copilot/conversations/savings-plan/` | Savings plans |
| `GET /api/ai-copilot/conversations/debt-strategy/` | Debt strategies |
| `GET/POST /api/finance/receipts/` | Receipt scanner |
| `GET/POST /api/finance-space/spaces/` | Family finance |
| `GET /api/tasks/notifications/poll/` | Live notification poll |
| `GET /api/subscriptions/mobile/me/` | Includes `plan_tier`, `features` |

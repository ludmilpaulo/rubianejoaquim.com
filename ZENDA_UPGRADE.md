# Zenda Premium Upgrade

Built on the existing Expo + Django stack — no rebuild.

## Mobile app

### Design system
- `mobile/src/theme/` — brand colors, spacing, typography, Paper MD3 theme
- Reusable UI: `ZendaCard`, `Skeleton`, `ProgressRing`, `FinancialHealthCard`

### Dashboard (Home)
- `GET /api/finance/dashboard/` — income, expenses, balance, health score, goals, debts, budgets, tasks, notifications
- Premium home with summary cards, quick actions, AI insight, daily tip

### Onboarding
- 4-slide flow on first launch (`OnboardingScreen`)
- Syncs `onboarding_completed` to Django profile

### i18n (PT · EN · FR · ES)
- Expanded catalogs in `mobile/src/i18n/locales/`
- Device locale + AsyncStorage + `User.preferred_locale`
- Language & currency in Settings

### Financial health score
- `GET /api/finance/dashboard/health_score/`
- Components: spending, budget, goals, debt, savings → grade + tips

### Income tracking (API)
- `PersonalIncome` model
- `GET/POST /api/finance/personal/income/`
- `GET /api/finance/personal/income/summary/`

### Multi-currency
- `ExchangeRate` + `UserFavoriteCurrency`
- `GET /api/finance/exchange-rates/`
- `GET /api/finance/exchange-rates/convert/?amount=&from=&to=`
- `python manage.py seed_exchange_rates`

### User preferences (Django)
- `preferred_locale`, `preferred_currency`, `onboarding_completed`, `dark_mode`, `profile_photo`

## Deploy backend

```bash
cd backend
python manage.py migrate
python manage.py seed_exchange_rates
```

## Roadmap (architecture ready, extend incrementally)

| Feature | Status |
|---------|--------|
| Premium dashboard | ✅ |
| Design system | ✅ |
| Onboarding | ✅ |
| i18n core | ✅ (expand screen-by-screen) |
| Income API | ✅ (UI in Personal tab — add forms next) |
| Health score | ✅ |
| FX rates | ✅ |
| Recurring expense fields | ✅ model |
| Family/shared finance | 🔲 new `finance_space` app |
| Gamification | 🔲 extend `UserPoints` / new app |
| OCR scanner | 🔲 `expo-camera` + backend upload |
| Voice assistant | 🔲 `expo-speech` + STT |
| Offline sync | 🔲 AsyncStorage queue |
| Full PersonalFinance UI refresh | 🔲 apply theme to 2700-line screen |

## Website

Upgrade `/zenda` landing with premium sections (hero, features, FAQ, pricing) — use same i18n pattern as main site.

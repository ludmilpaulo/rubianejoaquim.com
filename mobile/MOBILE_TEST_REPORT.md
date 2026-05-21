# Zenda Mobile App — Test Report

**Date:** 2026-05-21  
**Environment:** Windows, Expo SDK 54, Django backend `http://0.0.0.0:8000`

## Summary

| Area | Result |
|------|--------|
| TypeScript (`npm run typecheck`) | ✅ Pass |
| API smoke test (`npm run test:api`) | ✅ 35/35 endpoints (after `courses` migration 0005) |
| Android emulator (Expo Go) | ⚠️ Login works with `10.0.2.2`; push notifications limited in Expo Go |
| Expo Web + Playwright | ✅ 3/3 tests (`npm run test:web`, port 8090) |
| Maestro (native) | ✅ Flows in `.maestro/` (install Maestro CLI separately) |
| Automated E2E (Detox/Maestro) | ❌ Not configured |
| i18n coverage | ⚠️ Auth/help/about wired; finance & education screens still hardcoded PT |

---

## Automated tests run

### 1. TypeScript

```bash
cd mobile && npm run typecheck
```

**Result:** No errors.

### 2. API smoke test

```bash
cd mobile && npm run test:api
```

Uses test user `Maitland@2025` / `Maitland@2025` (seed with `python manage.py seed_test_data`).

**Passed (33):** Auth, config, finance (personal/business/dashboard), courses, lessons, tasks, AI copilot, finance-space, receipts, budgets + budget expenses.

**Initially failed (2)** — fixed by applying `courses.0005` migration (`referralpoints`, `userpoints` tables).

Re-run: `npm run test:api` → **35/35 passed**.

### 3. Paid access (test user)

After creating `MobileAppSubscription` with `status=active` and future `subscription_ends_at`:

- `GET /api/subscriptions/mobile/me/` → `has_access: true`, tier `premium`
- App should show **MainNavigator** (not AccessDenied)

For a **new** user without subscription, use **Subscribe** on AccessDenied or enroll in a course.

---

## Device / Expo logs (terminal 4)

Observed during emulator session:

1. **First load:** API used `http://127.0.0.1:8000/api` → connection failed on Android emulator (expected).
2. **After reload:** Dev fallback `http://10.0.2.2:8000/api` — correct for emulator.
3. **Login with invalid user `test`:** `api.errors.network` or 400 — expected.
4. **expo-notifications:** Remote push not supported in Expo Go (SDK 53+). Use a **development build** for full notification testing.

**Recommendation:** Ensure backend runs with `python manage.py runserver 0.0.0.0:8000`. On emulator, do not set `EXPO_PUBLIC_API_URL` to `127.0.0.1`.

---

## Manual test matrix (requires device)

Use credentials: **Maitland@2025** / **Maitland@2025** (and active subscription or enrollment).

### Auth flow

| Screen | Check |
|--------|--------|
| Login | Valid login, invalid password, network error message (i18n) |
| Register | Form validation, success |
| Forgot password | Email submit |
| Access denied | Subscribe / payment proof / verify again |

### Main tabs

| Tab | Screens / flows |
|-----|-----------------|
| Home | Dashboard, health score, shortcuts → ToDo, Targets, AI, Market, Analytics, Family, Receipts |
| Personal | Overview, expenses, income, budgets, goals, debts, principles, budget expenses (see `TEST_CHECKLIST.md`) |
| Business | Sales, expenses, metrics, categories |
| Education | Courses, lessons, quiz, progress, payment proof |
| Profile | Settings, About, Help, language switch (PT/EN/FR/ES) |

### Regression checklist

Full budget/expense scenarios: see `mobile/TEST_CHECKLIST.md` (12 scenarios).

---

## Known issues

1. **Referral / points APIs** — Fixed in this session via `courses` migration `0005`; pull latest backend migrations on other machines.
2. **i18n** — Many `Alert.alert` strings still hardcoded Portuguese in `PersonalFinanceScreen`, `BusinessFinanceScreen`, `TargetsScreen`, `EducationScreen`, `AccessDeniedScreen`, etc.
3. **Expo Go** — Push notifications and some native features need a dev build.
4. **Expo Web** — Not set up; install `react-dom` and `react-native-web` if browser testing is needed.

---

## How to re-test quickly

```bash
# Terminal 1 — backend
cd backend
python manage.py runserver 0.0.0.0:8000

# Terminal 2 — seed + API tests
cd backend
python manage.py seed_test_data
cd ../mobile
npm run test:api

# Terminal 3 — Expo
cd mobile
npx expo start
# Press 'a' for Android emulator
# Login: Maitland@2025 / Maitland@2025
```

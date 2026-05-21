# Zenda Mobile — E2E Testing

Repeatable UI tests in two layers:

| Layer | Tool | Target |
|-------|------|--------|
| **Browser** | Playwright | Expo Web (`react-dom` + `react-native-web`) |
| **Native** | Maestro | Android emulator, device, or dev build |

API smoke tests: `npm run test:api`

---

## Prerequisites

1. **Backend** on `0.0.0.0:8000`:
   ```bash
   cd backend
   python manage.py runserver 0.0.0.0:8000
   ```

2. **Test user** and data:
   ```bash
   cd backend
   python manage.py seed_test_data
   ```

3. **E2E prep** (skip onboarding, ensure subscription/trial):
   ```bash
   cd mobile
   npm run e2e:prep
   ```

Default credentials: `Maitland@2025` / `Maitland@2025`  
Override: `TEST_EMAIL`, `TEST_PASSWORD`, `API_BASE`.

---

## Playwright (Expo Web)

### Setup (once)

```bash
cd mobile
npm install
npx playwright install chromium
```

Web bundle requires `react-native-web-webview` (installed for YouTube lessons on web).

Web uses `http://127.0.0.1:8000/api` by default. Set in `mobile/.env`:

```
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

### Run

```bash
cd mobile
npm run test:web          # headless
npm run test:web:ui       # interactive UI
npm run test:web:headed   # visible browser
```

Playwright starts `expo start --web` on port **8090** (separate from native Metro on 8081).

### Tests

- `e2e-web/login.spec.ts` — login screen, login flow, tab bar

---

## Maestro (Android / iOS)

### Install Maestro CLI

- **macOS/Linux:** https://maestro.mobile.dev/docs/getting-started/installing-maestro  
- **Windows:** https://maestro.mobile.dev/docs/getting-started/installing-maestro (installer or WSL)

Verify: `maestro --version`

### Option A — Development build (recommended)

Build or install APK with `com.rubianejoaquim.zenda`, then:

```bash
cd mobile
npm run e2e:prep
maestro test .maestro/app-smoke-dev.yaml
```

### Option B — Expo Go

```bash
cd mobile
npx expo start
# Open Zenda on emulator (press 'a')
maestro test .maestro/app-smoke-expo-go.yaml
```

### Flows

| File | Purpose |
|------|---------|
| `.maestro/flows/login.yaml` | Email/password login → home |
| `.maestro/flows/onboarding-skip.yaml` | Tap skip on first-run slides |
| `.maestro/app-smoke-dev.yaml` | Login + all 5 tabs (dev build) |
| `.maestro/app-smoke-expo-go.yaml` | Login via Expo Go |

### testIDs

Stable selectors for automation:

- `login-screen`, `login-email`, `login-password`, `login-submit`
- `onboarding-skip`, `home-screen`
- `tab-home`, `tab-personal`, `tab-business`, `tab-education`, `tab-profile`

---

## npm scripts

| Script | Description |
|--------|-------------|
| `npm run web` | Expo web dev server |
| `npm run test:api` | Backend API smoke test |
| `npm run e2e:prep` | Prepare test user for UI E2E |
| `npm run test:web` | Playwright (Expo web) |
| `npm run test:e2e` | Maestro (dev build smoke) |
| `npm run test:e2e:login` | Maestro login flow only |

---

## CI sketch

```yaml
# API
- run: cd mobile && npm run test:api

# Web (Linux)
- run: cd mobile && npx playwright install --with-deps chromium
- run: cd mobile && npm run test:web
  env:
    CI: true
    TEST_EMAIL: ${{ secrets.E2E_EMAIL }}
    TEST_PASSWORD: ${{ secrets.E2E_PASSWORD }}

# Native (macOS runner + emulator)
- run: maestro test mobile/.maestro/app-smoke-dev.yaml
```

---

## Why not Detox?

Detox needs a custom dev client, native build hooks, and more maintenance with Expo. Maestro covers the same native E2E cases with YAML flows and works with Expo Go for local runs.

Use Detox later if you need deep native assertions inside React Native views.

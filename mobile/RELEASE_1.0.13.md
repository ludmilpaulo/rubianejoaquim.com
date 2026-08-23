# Zenda 1.0.13 local production release

Date: 23 August 2026  
Git: `49660c0` (`zenda-1.0.13`) after blank-launch fix `a44f62b`.  
Backup tag before bump: `zenda-1.0.12-pre-release`.

Identifiers were **not** changed:

| | Value |
|---|---|
| Android package | `com.rubianejoaquim.zenda` |
| iOS bundle | `com.rubianejoaquim.zenda` |
| ASC app | `6758412176` |
| Apple Team | `WF3T257QTW` |
| EAS project | `eed2db02-a05b-4292-9a7c-777b198b7b6e` |

## Versions

| | Value |
|---|---|
| User-facing / runtimeVersion | **1.0.13** |
| Android `versionCode` | **44** |
| iOS `buildNumber` | **45** |
| Production API in binaries | `https://ludmilpaulo.pythonanywhere.com/api` |

## Why this release

1. Production blank screen: native Expo runtime was stuck on `1.0.9` while JS was `1.0.12` (OTA mismatch risk).
2. `I18nProvider` could hang on `null` while AsyncStorage loaded.
3. Store build numbers must advance past 1.0.12 (`43` / `44`).

## iKhokha (card payments)

Code path verified in repo:

- Mobile: `GET /subscriptions/checkout-options/` + `POST /subscriptions/payments/create-session/`
- Backend: matching routes + `ikhokha/webhook/`
- Live mode follows `PaymentGatewayConfig.ENV_PRODUCTION` (not hardcoded sandbox)
- Webhook callback defaults from `API_PUBLIC_URL` → `https://ludmilpaulo.pythonanywhere.com/api/subscriptions/ikhokha/webhook/`
- No demo/test login strings in `mobile/src`

Production API smoke (unauthenticated):

- `POST /api/auth/login/` → 400 field validation (API up)
- `GET /api/subscriptions/checkout-options/` → 401 auth required (endpoint live)

**Admin must confirm in production Django admin / gateway config:**

- iKhokha row **active**
- environment = **production** (not sandbox)
- App ID + secret set
- Callback URL = production webhook above

Use admin “Test connection” after deploy if unsure.

## Build method

**Local only** — no EAS cloud build credits:

```bash
eas build --platform android --profile production --local
eas build --platform ios --profile production --local
```

Android signing: existing EAS upload keystore **Build Credentials f8tLWzVQWO** (remote credentials for local build).

## Artifacts (not in git)

- Android: `~/.zenda-build/artifacts/zenda-1.0.13.aab` *(pending / in progress)*
- iOS: `~/.zenda-build/artifacts/zenda-1.0.13.ipa` *(pending)*

## Store submission plan

1. Android → Play **internal** track first, then production after smoke.
2. iOS → TestFlight, then App Store version 1.0.13 submit for review.
3. Prefer `eas submit --path <artifact>` (submit does not consume build credits).

## Status checklist

### Android

- [ ] `.aab` build completed
- [ ] Signing verified (f8tLWzVQWO)
- [ ] Uploaded to Play Console
- [ ] Device smoke (login, API, iKhokha card pay if non-AO)
- [ ] Track / review status

### iOS

- [ ] `.ipa` build completed
- [ ] Uploaded to App Store Connect / TestFlight
- [ ] Device smoke
- [ ] App Review status

## Remaining risks

- First local Android 1.0.13 build is long (Gradle cold download + compile).
- Physical-device QA still required before 100% production rollout.
- iKhokha live credentials cannot be confirmed from this machine without admin auth; verify in PA admin before marketing card checkout.

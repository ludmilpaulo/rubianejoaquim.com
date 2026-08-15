# Zenda 1.0.8 local production release

Date: 15 August 2026  
Git: `78f7254` + tag `zenda-1.0.8`. Backup of the previous tree: tag `zenda-1.0.8-pre` (`4ba4099`).

Identifiers were not changed: `com.rubianejoaquim.zenda` (Android + iOS), ASC app `6758412176`, Team `WF3T257QTW`, EAS project `eed2db02-a05b-4292-9a7c-777b198b7b6e`.

## Versions

| | Value |
|---|---|
| User-facing / runtimeVersion | 1.0.8 |
| Android `versionCode` | 39 |
| iOS `buildNumber` | 40 |
| Production API in both binaries | `https://ludmilpaulo.pythonanywhere.com/api` |

## Artifacts (not in git)

- Android: `~/.zenda-build/artifacts/zenda-1.0.8.aab` (81 MB)
- iOS: `~/.zenda-build/artifacts/zenda-1.0.8.ipa` (27 MB)

Local EAS only (`eas build --profile production --local --freeze-credentials`). No cloud builds.

## Signing

- Android: existing EAS upload keystore **Build Credentials f8tLWzVQWO**, SHA-1 `6A:39:B3:15:C8:9C:20:FE:22:F4:BA:95:1F:39:D7:42:AD:7A:51:06`
- iOS: existing distribution cert serial `3DF9D2D2D35FEB55E0C0199BAF018D02`; App Store profile **`3CLYXMT6QQ`** with Associated Domains + Sign in with Apple + production APNs

## Store status

### Android — Play **internal** track (not production)

- Submit: https://expo.dev/accounts/ludmil/projects/zenda/submissions/44b8d350-c59d-431f-b298-239dfc4db111
- Track: internal, release status COMPLETED
- `com.google.android.gms.permission.AD_ID` remains blocked
- **Do not promote to production** until a physical device smoke test on the internal track passes

### iOS — TestFlight VALID; App Review **Waiting for Review**

- Submit: https://expo.dev/accounts/ludmil/projects/zenda/submissions/369c2042-3a6b-406c-ba77-08c8e24b38fd
- Build 40 processing = VALID (`5f3f6bad-de54-470c-932d-8fb1eab0ab10`)
- Replaced the 1.0.7 / build 39 review with version **1.0.8** + build **40**
- What’s New updated (en-US)
- Review submission: **WAITING_FOR_REVIEW** (`4ad9f58c-c05f-4a0f-8831-ebe590de13fc`)
- TestFlight: https://appstoreconnect.apple.com/apps/6758412176/testflight/ios
- Distribution: https://appstoreconnect.apple.com/apps/6758412176/distribution

Live store listing remains version **1.3** (READY_FOR_SALE) until 1.0.8 is approved.

## Device QA

No USB iPhone or Android was connected to this Mac (`adb devices` empty, `devicectl` none). Production IPA cannot run on Simulator.

Static checks on both binaries:

- Package/bundle `com.rubianejoaquim.zenda`, version 1.0.8 / 39 / 40
- API host PythonAnywhere only (no `localhost:8000` / `127.0.0.1:8000` in JS bundles)
- Native Google Sign-In + Facebook SDK present
- iOS entitlements: production APNs, associated domains `applinks:www.rubianejoaquim.com` + `applinks:rubianejoaquim.com`, Sign in with Apple, `get-task-allow` false
- Android signing SHA-1 matches the existing Play upload key

**Install from Play internal / TestFlight before relying on social login or Family Finance in production.** Checklist: login/register, production API, Google/Apple/Facebook/TikTok, IAP restore, family join `https://www.rubianejoaquim.com/family/join/{CODE}`, push token, no crash on launch.

## Remaining issues

- Meta `email` / `public_profile` still **Verification required** — real Facebook users may be blocked until Meta identity verification completes (`SOCIAL_LOGIN_SETUP.md`)
- Play production rollout was intentionally **not** done
- This machine could not complete physical-device smoke tests
- `expo-doctor` still warns that `eas-cli` is a project dependency and that committed `ios/` skips some CNG sync (Info.plist was updated to 1.0.8 / 40 by hand)

# Zenda 1.0.9 local production release

Date: 19 August 2026  
Git: `e19ea46` on `main` (version defaults) after `6f2a2fa` (P0 APIs / client gates).

Identifiers were not changed: `com.rubianejoaquim.zenda` (Android + iOS), ASC app `6758412176`, Team `WF3T257QTW`, EAS project `eed2db02-a05b-4292-9a7c-777b198b7b6e`.

Local Gradle + Xcode only. **No `eas build`.** Store upload used `eas submit --path` of the local AAB/IPA (not an EAS build id).

## Versions

| | Value |
|---|---|
| User-facing / runtimeVersion | 1.0.9 |
| Android `versionCode` | 40 |
| iOS `buildNumber` | 41 |
| Production API in both binaries | `https://ludmilpaulo.pythonanywhere.com/api` |

## Artifacts (not in git)

- Android: `~/.zenda-build/artifacts/zenda-1.0.9.aab` (101 MB)
- iOS: `~/.zenda-build/artifacts/zenda-1.0.9.ipa` (47 MB)
- Archive: `~/.zenda-build/Zenda-1.0.9.xcarchive`

## Signing

- Android: existing EAS upload keystore **Build Credentials f8tLWzVQWO**, SHA-1 `6A:39:B3:15:C8:9C:20:FE:22:F4:BA:95:1F:39:D7:42:AD:7A:51:06`
- iOS: existing distribution cert serial `3DF9D2D2D35FEB55E0C0199BAF018D02`; App Store profile **`3CLYXMT6QQ`** with Associated Domains + Sign in with Apple + production APNs

## Store status

### Android — Play **production** track

- Submit: https://expo.dev/accounts/ludmil/projects/zenda/submissions/fada46ed-7da1-4990-adb4-c0e0c93b3124
- Track: production, release status COMPLETED
- Package `com.rubianejoaquim.zenda`, versionCode 40

### iOS — TestFlight VALID; version 1.0.9 attached

- Submit: https://expo.dev/accounts/ludmil/projects/zenda/submissions/1e098fa4-5337-4e29-ab45-61617c43264d
- Build 41 processing = VALID (`729f69d3-ab15-4948-8e24-50b683ea5ab9`)
- App Store version **1.0.9** (`b1ba69cc-dee9-47f7-91d0-3b035b5e0c18`) is **PREPARE_FOR_SUBMISSION**, release type AFTER_APPROVAL
- Listing, What’s New, review notes, and demo account copied from 1.0.8 (no new store copy)
- Privacy: `https://www.rubianejoaquim.com/privacy-policy`
- Account deletion: `https://www.rubianejoaquim.com/delete-account`
- TestFlight: https://appstoreconnect.apple.com/apps/6758412176/testflight/ios
- Distribution: https://appstoreconnect.apple.com/apps/6758412176/distribution

Live store listing remains **1.0.8** (`READY_FOR_SALE`) until you tap **Submit for Review** on 1.0.9 in App Store Connect.

## PythonAnywhere (this Mac cannot SSH)

`ssh ludmilpaulo@ssh.pythonanywhere.com` returns Permission denied (publickey,password). Run this in a PA Bash console — never flush:

```bash
bash ~/rubianejoaquim.com/backend/scripts/deploy_zenda_109_pythonanywhere.sh
```

That pull/migrates/collectstatic/reloads and sets `APP_LATEST_VERSION_*=1.0.9` without changing `APP_MINIMUM_VERSION_*` (leave at `1.0.0`, `APP_FORCE_UPDATE=False`).

Until that runs, production still serves the legacy `/api/config/app-version/` payload (`ios`/`android` `1.0.0`) and `/api/app/version/` is 404.

## Device QA

No USB iPhone or Android was used for install. Production IPA cannot run on Simulator.

Static checks on both binaries:

- Package/bundle `com.rubianejoaquim.zenda`, version 1.0.9 / 40 / 41
- API host PythonAnywhere only (no `localhost:8000` in the JS bundle)
- iOS entitlements: production APNs, associated domains `applinks:www.rubianejoaquim.com` + `applinks:rubianejoaquim.com`, Sign in with Apple, `get-task-allow` false
- Android signing SHA-1 matches the existing Play upload key

**Install from Play production / TestFlight before relying on social login or Family Finance.** Checklist: login/register, production API, Google/Apple/Facebook/TikTok, IAP restore, family join, push token, no crash on launch.

## Remaining issues

- TikTok Login Kit is still sandbox (`enter_from=dev_aws0wuv2weiy18dw`). Switch the **existing** TikTok app to Production; keep redirect `https://ludmilpaulo.pythonanywhere.com/api/auth/social/tiktok/callback/`.
- Wallet remains mock (`WALLET_LIVE_ENABLED=False`).
- This machine could not complete physical-device smoke tests or the PythonAnywhere pull.
- Do **not** raise `APP_MINIMUM_VERSION_*` until 1.0.9 is actually live on both stores.

# Zenda 1.0.7 local production release

Date: 14–15 August 2026  
Git: `0335850` + tag `zenda-1.0.7` (APNs production entitlement). AD_ID block is a follow-up on `main` after Play rejected the first AAB.

Identifiers were not changed: `com.rubianejoaquim.zenda` (Android + iOS), ASC app `6758412176`, Team `WF3T257QTW`, EAS project `eed2db02-a05b-4292-9a7c-777b198b7b6e`.

## Versions

| | Value |
|---|---|
| User-facing / runtimeVersion | 1.0.7 |
| Android `versionCode` | 38 |
| iOS `buildNumber` | 39 |
| Production API in both binaries | `https://ludmilpaulo.pythonanywhere.com/api` |

## Artifacts (not in git)

- Android: `~/.zenda-build/artifacts/zenda-1.0.7.aab` (81 MB, rebuilt without `com.google.android.gms.permission.AD_ID`)
- iOS: `~/.zenda-build/artifacts/zenda-1.0.7.ipa` (27 MB)
- First AAB (Play rejected): `~/.zenda-build/artifacts/zenda-1.0.7.aab.with-adid.bak`

Local EAS only (`eas build --local`). No cloud builds.

## Signing

- Android: existing EAS upload keystore **Build Credentials f8tLWzVQWO**, SHA-1 `6A:39:B3:15:C8:9C:20:FE:22:F4:BA:95:1F:39:D7:42:AD:7A:51:06` (`--freeze-credentials`)
- iOS: existing distribution cert serial `3DF9D2D2D35FEB55E0C0199BAF018D02`; App Store profile **`3CLYXMT6QQ`** with Associated Domains + Sign in with Apple + production APNs

## Store status

### Android — Play **internal** track (not production)

- First submit failed: Play Console advertising-ID declaration vs Facebook-merged `AD_ID` permission
- Fix: `android.blockedPermissions` = `com.google.android.gms.permission.AD_ID` in `app.json` (Facebook advertiser collection already off)
- Resubmit succeeded: https://expo.dev/accounts/ludmil/projects/zenda/submissions/6abf6ee8-05fd-4796-bb8a-58941dbdb00f
- **Do not promote to production** until a physical device smoke test on the internal track passes

### iOS — TestFlight uploaded; App Review **Waiting for Review**

- Submit: https://expo.dev/accounts/ludmil/projects/zenda/submissions/cef641f9-73e3-439d-97ea-542b751e88f1
- Build 39 processing = VALID
- App Store version 1.0.7 attached, What’s New set, export compliance already `ITSAppUsesNonExemptEncryption: false`
- Review submission state: **WAITING_FOR_REVIEW** (submitted 14 Aug 2026)
- TestFlight: https://appstoreconnect.apple.com/apps/6758412176/testflight/ios
- Distribution: https://appstoreconnect.apple.com/apps/6758412176/distribution

Live store listing remains version **1.3** (READY_FOR_SALE, build 30) until 1.0.7 is approved. Apple accepted creating version 1.0.7 alongside it.

## Device QA

No USB iPhone or Android was connected to this Mac (`adb devices` empty, `devicectl` none). Production IPA cannot run on Simulator.

Static checks on both binaries:

- Package/bundle `com.rubianejoaquim.zenda`, version 1.0.7 / 38 / 39
- API host PythonAnywhere only (no `localhost:8000` / `127.0.0.1:8000` in JS bundles)
- Native Google Sign-In + Facebook SDK present
- iOS entitlements: production APNs, associated domains `applinks:www.rubianejoaquim.com` + `applinks:rubianejoaquim.com`, Sign in with Apple, `get-task-allow` false

**Install from Play internal / TestFlight before relying on social login in production.** Checklist: login/register, production API, Google/Apple/Facebook/TikTok, IAP restore, family join `https://www.rubianejoaquim.com/family/join/{CODE}`, push token, no crash on launch.

## Remaining issues

- Meta `email` / `public_profile` still **Verification required** — real Facebook users may be blocked until Meta identity verification completes (`SOCIAL_LOGIN_SETUP.md`)
- TikTok Login Kit should be confirmed in **Production** (not sandbox) in the TikTok portal
- Play production rollout was intentionally **not** done
- This machine could not complete physical-device smoke tests

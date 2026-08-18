# Production Social Login Setup (Google, Facebook, TikTok, Apple)

This document covers provider console configuration for the social login implementation.
Application code expects **separate development and production credentials**. Never commit secrets.

Native Google and Facebook SDKs require a **new EAS / `expo run` development or production build**. OTA updates cannot add native modules. **Do not open this app in Expo Go** — `@react-native-google-signin/google-signin` calls `TurboModuleRegistry.getEnforcing('RNGoogleSignin')` and will crash any binary that does not contain that native module.

After adding or updating the Google/Facebook native packages:

```bash
cd mobile
npx expo install @react-native-google-signin/google-signin
npx expo prebuild --clean   # or let EAS prebuild
eas build --profile development --platform android
# or: npx expo run:android
```

Uninstall the old APK, install the new development/production binary, then `npx expo start --dev-client`. Do **not** scan the QR code into Expo Go.

`runtimeVersion` must change when native modules are added so an OTA cannot ship this JS onto an older Play Store/App Store binary that lacks `RNGoogleSignin`.

## Architecture (implemented)

```
Google (native SDK / GIS web) / Facebook (native SDK / JS SDK) / TikTok (Login Kit) / Sign in with Apple
        ↓ (verified server-side — never trust client email alone)
POST /api/auth/social/google|facebook|apple  OR  GET/POST TikTok → callback → exchange_code
        ↓
authenticate_social_user()  →  SocialAccount + User
        ↓
DRF Token session (same as email/password)
```

Identity is always the provider’s verified user id (`sub` / Facebook id / TikTok `open_id` / Apple `sub`), never a client-supplied email alone.

**App Store Guideline 4.8:** Because Google/Facebook/TikTok are offered, **Sign in with Apple** is implemented on iOS with equal prominence.

**Do not** use a custom WebView for Google. Mobile uses the native Google Sign-In SDK. Web uses Google Identity Services. TikTok uses the system browser (`ASWebAuthenticationSession` / Chrome Custom Tabs) against the backend Login Kit start URL.

## Backend environment

Set in `backend/.env` (see `backend/.env.example`):

| Variable | Notes |
|---|---|
| `GOOGLE_CLIENT_ID` | Web OAuth client ID (public). Required as `webClientId` so Android native Sign-In returns an ID token. |
| `GOOGLE_CLIENT_SECRET` | Server-only if used (ID-token flow does not need it) |
| `GOOGLE_CLIENT_ID_IOS` / `GOOGLE_CLIENT_ID_ANDROID` | ID-token audiences. Android may be comma-separated (Play App Signing + upload key). |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | Meta app credentials (secret stays server-side) |
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | Login Kit (secret stays server-side) |
| `TIKTOK_REDIRECT_URI` | Exact callback URL registered with TikTok (trailing slash included) |
| `APPLE_BUNDLE_ID` | `com.rubianejoaquim.zenda` (JWT audience) |
| `APPLE_SIGN_IN_ENABLED` | Default `True` |
| `APPLE_SIGN_IN_AUDIENCES` | Optional extra JWT audiences (Services ID) |
| `API_PUBLIC_URL` | e.g. `https://ludmilpaulo.pythonanywhere.com` |
| `FRONTEND_URL` | e.g. `https://www.rubianejoaquim.com` |
| `MOBILE_OAUTH_REDIRECT_URI` | `zenda://social-callback` |
| `CORS_ALLOWED_ORIGINS` | Production site origins |

Mobile EAS env (public IDs only — never secrets):

| Variable | Notes |
|---|---|
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Web client ID (`webClientId` for native SDK) |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | iOS client ID |
| `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | Android client ID (audience; SHA-1 is in Google Cloud) |
| `EXPO_PUBLIC_FACEBOOK_APP_ID` | Meta App ID |
| `EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN` | Meta **Client Token** (Settings → Advanced). Public. Required by the native Facebook SDK. |

Verify production config without printing secrets:

```bash
cd backend && source venv/bin/activate
python manage.py check_social_login
```

Run migration:

```bash
cd backend && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate accounts
```

## Google Cloud Console

Production app identifiers: Android package and iOS bundle `com.rubianejoaquim.zenda`.

1. Create a **production** project (separate from testing).
2. OAuth consent screen: **In production** (not Testing-only), app name Zenda, support email, logo, homepage `https://www.rubianejoaquim.com`, privacy `https://www.rubianejoaquim.com/privacy-policy`, scopes `openid email profile`.
3. Credentials → OAuth client ID:
   - **Web**: Authorized JavaScript origins `https://www.rubianejoaquim.com` and `https://rubianejoaquim.com`. GIS ID-token flow does not need a redirect URI. This Web client ID is also `webClientId` for the native Android SDK (required to obtain an ID token).
   - **iOS**: bundle ID exactly `com.rubianejoaquim.zenda`.
   - **Android**: package `com.rubianejoaquim.zenda`. Add **both** SHA-1 and SHA-256 fingerprints from Play Console → Release → Setup → App integrity:
     - **App signing key** (Play App Signing) — required for Play Store installs
     - **Upload key** (EAS) — required for local / internal APKs
     If Play App Signing uses a different cert than the upload key, register both (or two Android OAuth clients and put both IDs in `GOOGLE_CLIENT_ID_ANDROID` comma-separated).
4. Put Web client ID in `GOOGLE_CLIENT_ID`. Do **not** put the client secret in frontend/mobile.
5. Do not mix development client IDs into the production app, or production IDs with development redirect URIs.

Native SDK (mobile): `@react-native-google-signin/google-signin`. Browser `expo-auth-session` Google provider is not used (it sent Android client IDs to Google’s web authorize endpoint and produced `invalid_request`).

## Canonical production redirect URIs

Use these exact values everywhere. Do not invent extra callback paths.

| Provider | Web | Android | iOS |
|---|---|---|---|
| **Google** | GIS ID-token: JavaScript origins `https://www.rubianejoaquim.com` and `https://rubianejoaquim.com`. No redirect URI is used for GIS. Optional authorized redirects: `https://www.rubianejoaquim.com`, `https://www.rubianejoaquim.com/login`. Client: `Zenda Web` (`…sc5vf5kgoak181brsategi76po9mv6fq`). | Native SDK. Package `com.rubianejoaquim.zenda`. Play signing client `…r84rff44o3acsrcmlmiihmiadvcd23jn` SHA-1 `92:72:39:B9:4D:4C:9D:71:22:E4:32:A8:8D:E6:25:EA:39:5B:B7:46`. Upload-key client `…p4thqgjg9ratblhv0f5tosk2qi1bq3v5` SHA-1 `6A:39:B3:15:C8:9C:20:FE:22:F4:BA:95:1F:39:D7:42:AD:7A:51:06`. `webClientId` is the **Web** client. | Native SDK. Bundle `com.rubianejoaquim.zenda`. iOS client `…bt1io2ogtdl5focg0r25i2stg1sln4co`. URL scheme `com.googleusercontent.apps.112065604009-bt1io2ogtdl5focg0r25i2stg1sln4co`. |
| **Facebook** | JS SDK. Valid OAuth Redirect URIs: `https://www.rubianejoaquim.com/`, `https://www.rubianejoaquim.com/login`, `https://rubianejoaquim.com/`, `https://rubianejoaquim.com/login`. Allowed JS SDK domains: `www.rubianejoaquim.com`, `rubianejoaquim.com`. App ID `2691305731001778`. | Native SDK. Package `com.rubianejoaquim.zenda`, class `com.rubianejoaquim.zenda.MainActivity`. Key hashes `knI5uU1MnXEi5DKojeYl6jlbt0Y=` (Play) and `ajmzFcicIP4i9LqVHznXQq16UQY=` (upload). Scheme `fb2691305731001778`. | Native SDK. Bundle ID **must** be `com.rubianejoaquim.zenda`. App Store ID `6758412176`. Scheme `fb2691305731001778`. |
| **TikTok** | Login Kit **Web** on all platforms. Redirect URI (exact): `https://ludmilpaulo.pythonanywhere.com/api/auth/social/tiktok/callback/`. Scope `user.info.basic`. After callback, web goes to `https://www.rubianejoaquim.com/login/social-callback?exchange_code=…`. | Same HTTPS callback, then `zenda://social-callback?exchange_code=…`. | Same as Android. |

Mobile return scheme (all providers after backend session): `zenda://social-callback` (`MOBILE_OAUTH_REDIRECT_URI`).

## Meta (Facebook) Login

The production error **“Facebook Login is currently unavailable for this app…”** is returned by Meta when `email` / `public_profile` are stuck on **Advanced access → Inactive → Verification required**. Zenda cannot clear that from application code. In the existing app (ID `2691305731001778`): complete Meta identity verification, **or** click **Return to standard access** for `email` and `public_profile` (Meta will ask you to re-enter the Facebook password). The Live toggle is already on; Data Use Checkup is complete. Login with the JavaScript SDK must be **Yes**, and the redirect URIs / JS SDK domains above must be saved.

1. Create production app → add **Facebook Login**.
2. Settings → Basic: App Domains `rubianejoaquim.com`, Privacy Policy URL, Data Deletion instructions (`https://www.rubianejoaquim.com/delete-account`).
3. Complete **Data Use Checkup** and any “additional details” banner.
4. App Review → Permissions and features: `public_profile` and `email` must be **Standard access** and **Ready to use** (or Advanced access after Meta identity verification). **Inactive + Verification required** blocks Facebook Login for real users.
5. Keep the header Live toggle **on**. If the label still says Development, identity verification is unfinished — that is a Meta account action, not an app-code change.
6. Add platforms:
   - **Android**: package `com.rubianejoaquim.zenda`, class `com.rubianejoaquim.zenda.MainActivity`, Play Store URL. Paste **both** key hashes (Settings → Basic → Android → Key Hashes, or Facebook Login → Settings). Missing hashes produce *“This app has no Android key hashes configured”*.
     | Signing key | SHA-1 | Facebook key hash (paste this) |
     |---|---|---|
     | Play **App signing** (store / Play internal installs) | `92:72:39:B9:4D:4C:9D:71:22:E4:32:A8:8D:E6:25:EA:39:5B:B7:46` | `knI5uU1MnXEi5DKojeYl6jlbt0Y=` |
     | EAS **upload** key (local / sideloaded AAB) | `6A:39:B3:15:C8:9C:20:FE:22:F4:BA:95:1F:39:D7:42:AD:7A:51:06` | `ajmzFcicIP4i9LqVHznXQq16UQY=` |
   - **iOS**: bundle ID `com.rubianejoaquim.zenda`, App Store ID `6758412176`.
7. Facebook Login → Settings: Valid OAuth Redirect URIs for the **web JS SDK** (`https://www.rubianejoaquim.com/`, `https://rubianejoaquim.com/`).
8. Copy **Client Token** (Settings → Advanced) into EAS `EXPO_PUBLIC_FACEBOOK_CLIENT_TOKEN`. This is public; the App Secret stays on the backend only.
9. Set `FACEBOOK_APP_ID` + `FACEBOOK_APP_SECRET` on the backend.
10. Test with a **non-developer** Facebook account after Live + Advanced Access.

Mobile uses `react-native-fbsdk-next` (native SDK). Web uses the Facebook JS SDK. Both POST `access_token` to `/api/auth/social/facebook/`.

## TikTok Login Kit

Zenda uses **Web Login Kit** on all platforms (system browser → backend → TikTok → HTTPS callback). Mobile then returns via `zenda://social-callback?exchange_code=...`. The DRF session token is never placed in the URL.

1. Create TikTok developer app in **Production** mode (not sandbox-only).
2. Add **Login Kit** for Web.
3. Redirect URI (**exact**, including trailing slash):  
   `https://ludmilpaulo.pythonanywhere.com/api/auth/social/tiktok/callback/`
4. Scopes: `user.info.basic` (email is unavailable — accounts are created by `open_id`).
5. Submit for TikTok review before public launch if required.
6. Set `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REDIRECT_URI` on PythonAnywhere. They must match the portal exactly.
7. A **404 / “something went wrong”** on TikTok’s page is **not** a Zenda API 404. Production `GET /api/auth/social/tiktok/` already 302s to TikTok. If the authorize redirect includes `enter_from=dev_<client_key>` (currently `dev_aws0wuv2weiy18dw`), the TikTok app is still **sandbox**. In [TikTok for Developers](https://developers.tiktok.com/apps): switch Login Kit to **Production**, keep the redirect URI exact, and while still in sandbox add your TikTok account under **Target users**.

   **Production probe (18 Aug 2026):** Django start = HTTP 302 to `tiktok.com/v2/auth/authorize` (redirect URI correct, trailing slash present). Django callback = HTTP 302 (not 404). TikTok then 302s to `/login?enter_from=dev_aws0wuv2weiy18dw` — that sandbox flag is the production 404/Bad Request source. Next.js has no TikTok callback of its own; a safety-net route now 302s `www.rubianejoaquim.com/api/auth/social/tiktok/callback` to Django. The domain verification file is also served on PythonAnywhere (`/tiktokFpaaRaUmoGf5Zl6lZ8hX77igVQZVuzJS.txt`). Run `python manage.py check_social_login --probe-tiktok` after changing the portal.

8. A `400 Bad Request` on TikTok’s authorize page is almost always a portal mismatch (client key, redirect URI, sandbox, or Login Kit not enabled). Backend logs include TikTok `log_id` (no secrets) for support. Look for `oauth_step provider=tiktok step=… status=…`.

Web success contract: backend redirects to  
`https://www.rubianejoaquim.com/login/social-callback?status=authenticated&exchange_code=...&next=/area-do-aluno`  
The web app redeems `exchange_code` via `POST /api/auth/social/exchange/` (it must not expect a raw `token` query param).

## Sign in with Apple (required with other social buttons)

1. Apple Developer → Identifiers → App ID `com.rubianejoaquim.zenda` → enable **Sign In with Apple**.
2. App Store Connect / Xcode capability **Sign In with Apple** on the iOS target (EAS rebuild required).
3. Backend verifies the identity JWT against `https://appleid.apple.com/auth/keys` with audience = `APPLE_BUNDLE_ID`.
4. Private relay emails (`privaterelay.appleid.com`) are accepted and treated as verified when Apple says so.
5. First sign-in may include name; later sign-ins often omit email/name — identity remains Apple `sub`.

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/auth/social/config/` | Public client IDs / enabled flags |
| POST | `/api/auth/social/google/` | Verify Google ID token → session |
| POST | `/api/auth/social/facebook/` | Verify FB access token → session |
| POST | `/api/auth/social/apple/` | Verify Apple identity token → session |
| POST | `/api/auth/social/exchange/` | Redeem TikTok `exchange_code` → session |
| GET | `/api/auth/social/tiktok/` | Start OAuth (+ PKCE state) |
| POST | `/api/auth/social/tiktok/link-start/` | Authenticated TikTok link; returns `authorize_url` |
| GET | `/api/auth/social/tiktok/callback/` | OAuth callback (returns exchange_code, not raw token) |
| POST | `/api/auth/social/link-confirm/` | Password-confirm email collision link |
| GET | `/api/auth/social/methods/` | Linked login methods (auth) |
| DELETE | `/api/auth/social/<provider>/unlink/` | Unlink (blocks last method) |
| POST | `/api/auth/logout/` | Delete DRF token |

## Clients

- **Web**: `/login` social buttons (GIS + FB JS SDK); `/login/social-callback` redeems TikTok `exchange_code`; profile → Login e segurança uses `POST /tiktok/link-start/` for linking.
- **Mobile**: Login/Register social buttons (native Google + native Facebook + Apple on iOS; TikTok via system browser); Settings → Login e segurança; scheme `zenda://`.

## Security checklist

- [x] Provider tokens verified server-side
- [x] OAuth `state` + PKCE for TikTok
- [x] TikTok deep link uses short-lived `exchange_code` (not DRF token in URL)
- [x] Sign in with Apple (Guideline 4.8)
- [x] No provider secrets in frontend/mobile
- [x] Unique `(provider, provider_user_id)` DB constraint
- [x] No silent merge on email — `link_required` + password
- [x] Auth endpoint throttling
- [x] Account deletion removes social links + tokens
- [x] Logout revokes app token (not provider session)
- [x] Production credentials created in each console
- [x] Google Play App Signing SHA-1 on Android OAuth client `Zenda Android Play Signing` (`92:72:39:B9:4D:4C:9D:71:22:E4:32:A8:8D:E6:25:EA:39:5B:B7:46`); upload-key client `Zenda Android` (`6A:39:B3:15:C8:9C:20:FE:22:F4:BA:95:1F:39:D7:42:AD:7A:51:06`)
- [x] Meta app Live (since 11 Aug 2026) + Data Use Checkup complete; Facebook Client Token in EAS
- [x] Meta Android **Key Hashes** present: `knI5uU1MnXEi5DKojeYl6jlbt0Y=` (Play) and `ajmzFcicIP4i9LqVHznXQq16UQY=` (upload)
- [ ] Meta `email` / `public_profile` still **Advanced access → Inactive → Verification required** — complete identity verification (or Return to standard access; Meta will re-prompt the Facebook password)
- [ ] Meta iOS **Bundle ID** chip `com.rubianejoaquim.zenda` + App Store ID `6758412176` on Settings → Basic → iOS
- [x] TikTok Login Kit is **Production / Live**; authorize URL has no `enter_from=dev_` and redirect URI matches
- [ ] Sign in with Apple capability enabled on App ID + EAS iOS rebuild
- [ ] Production smoke test on real Android + iOS devices (not Expo Go)

## Production smoke test (after credentials)

1. Google signup → user + `SocialAccount` row → logout → login again (same user). **Android + iOS + Web.**
2. Facebook same. **Android + iOS + Web.** Test a non-developer Facebook account.
3. TikTok same. **Android + iOS + Web.**
4. Apple Sign In on **iOS** (new + returning; private relay email).
5. Existing email/password user → Google with same verified email → link prompt → password → one user, two methods.
6. Register screen: same email collision → link UI (not silent fail).
7. Unlink last method → blocked.
8. Cancel OAuth → back to login without error spam.
9. Invalid/expired token → clear error.
10. Network failure → clear error.
11. Reuse TikTok `code` / bad `state` / expired `exchange_code` → rejected.

Do **not** submit store builds until Google, Facebook, and TikTok have been tested on physical Android and iOS devices.

## Current native versions (2026-08-14)

| Item | Value |
|---|---|
| Expo SDK | 54.0.36 |
| React Native | 0.81.5 |
| `@react-native-google-signin/google-signin` | 16.1.4 |
| `react-native-fbsdk-next` | 13.4.3 |
| `expo-dev-client` | 6.0.21 |
| `runtimeVersion` | 1.0.7 |
| Android package / iOS bundle | `com.rubianejoaquim.zenda` |
| Google Web client (`webClientId`) | `112065604009-sc5vf5kgoak181brsategi76po9mv6fq` |
| Google iOS client | `112065604009-bt1io2ogtdl5focg0r25i2stg1sln4co` |
| Google Android Play Signing client | `112065604009-r84rff44o3acsrcmlmiihmiadvcd23jn` |
| Google Android upload-key client | `112065604009-p4thqgjg9ratblhv0f5tosk2qi1bq3v5` |
| Facebook App ID | `2691305731001778` |
| TikTok client key (public) | `aws0wuv2weiy18dw` |

The Play Store APK still used `expo-auth-session` Google (`invalid_request`). Mobile JS now uses only the native Google Sign-In SDK. **A new native binary is required:**

```bash
cd mobile
npx expo start --dev-client   # not Expo Go
eas build --profile development --platform android
eas build --profile production --platform android
eas build --profile production --platform ios
```

Put both Android OAuth client IDs in production `GOOGLE_CLIENT_ID_ANDROID` (comma-separated) so ID-token `aud` from either signing key verifies.

### Native rebuild status (2026-08-14)

- Android native project generated (`npx expo prebuild --platform android`). `autolinkLibrariesWithApp()` includes `@react-native-google-signin/google-signin`. Facebook Client Token is in `android/app/src/main/res/values/strings.xml`.
- iOS regenerated with `pod install`. `Podfile.lock` now includes `RNGoogleSignin` 16.1.4, `GoogleSignIn` 9.2.0, `ExpoAdapterGoogleSignIn`, `FBSDKCoreKit`, and `expo-dev-client`.
- `eas build --profile development --platform android` could not start: this Expo account has used its included Android builds for the month (resets 1 Sep 2026). Upgrade the EAS plan or run a local Gradle build once Android SDK is installed.
- `eas build --profile production --platform ios` uploaded then failed Fastlane: the App Store provisioning profile is missing **Associated Domains** and **Sign in with Apple**. Regenerate credentials interactively (`eas credentials -p ios`) so the profile includes `com.apple.developer.associated-domains` and `com.apple.developer.applesignin`, then rebuild.

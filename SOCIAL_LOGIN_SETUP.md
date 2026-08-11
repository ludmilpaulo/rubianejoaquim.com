# Production Social Login Setup (Google, Facebook, TikTok, Apple)

This document covers provider console configuration for the social login implementation.
Application code expects **separate development and production credentials**. Never commit secrets.

## Architecture (implemented)

```
Google / Facebook / TikTok / Sign in with Apple
        ↓ (verified server-side — never trust client email alone)
POST /api/auth/social/google|facebook|apple  OR  GET TikTok → callback → exchange_code
        ↓
authenticate_social_user()  →  SocialAccount + User
        ↓
DRF Token session (same as email/password)
```

Identity is always the provider’s verified user id (`sub` / Facebook id / TikTok `open_id` / Apple `sub`), never a client-supplied email alone.

**App Store Guideline 4.8:** Because Google/Facebook/TikTok are offered, **Sign in with Apple** is implemented on iOS with equal prominence.

## Backend environment

Set in `backend/.env` (see `backend/.env.example`):

| Variable | Notes |
|---|---|
| `GOOGLE_CLIENT_ID` | Web OAuth client ID (public) |
| `GOOGLE_CLIENT_SECRET` | Server-only if used |
| `GOOGLE_CLIENT_ID_IOS` / `GOOGLE_CLIENT_ID_ANDROID` | Optional ID-token audiences |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | Meta app credentials |
| `TIKTOK_CLIENT_KEY` / `TIKTOK_CLIENT_SECRET` | Login Kit |
| `TIKTOK_REDIRECT_URI` | Exact callback URL registered with TikTok |
| `APPLE_BUNDLE_ID` | `com.rubianejoaquim.zenda` (JWT audience) |
| `APPLE_SIGN_IN_ENABLED` | Default `True` |
| `APPLE_SIGN_IN_AUDIENCES` | Optional extra JWT audiences (Services ID) |
| `API_PUBLIC_URL` | e.g. `https://ludmilpaulo.pythonanywhere.com` |
| `FRONTEND_URL` | e.g. `https://www.rubianejoaquim.com` |
| `MOBILE_OAUTH_REDIRECT_URI` | `zenda://social-callback` |
| `CORS_ALLOWED_ORIGINS` | Production site origins |

Run migration:

```bash
cd backend && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate accounts
```

## Google Cloud Console

1. Create a **production** project (separate from testing).
2. OAuth consent screen: app name, support email, logo, homepage `https://www.rubianejoaquim.com`, privacy `https://www.rubianejoaquim.com/privacy-policy`, scopes `openid email profile`.
3. Credentials → OAuth client ID:
   - **Web**: Authorized JavaScript origins `https://www.rubianejoaquim.com` (and apex if used). For GIS button, redirect URI is often not required for the ID-token flow.
   - **iOS / Android** clients for the mobile app bundle `com.rubianejoaquim.zenda`.
4. Put Web client ID in `GOOGLE_CLIENT_ID`. Do **not** put the client secret in frontend/mobile.

## Meta (Facebook) Login

1. Create production app → add **Facebook Login**.
2. Settings → Basic: App Domains `rubianejoaquim.com`, Privacy Policy URL, Data Deletion instructions (`https://www.rubianejoaquim.com/delete-account`).
3. Facebook Login → Settings: Valid OAuth Redirect URIs as required by your Meta SDK / site.
4. Request only `public_profile` and `email`.
5. Switch app to **Live**. Complete App Review if Meta requires it for the permissions you use.
6. Set `FACEBOOK_APP_ID` + `FACEBOOK_APP_SECRET` on the backend.

## TikTok Login Kit

1. Create TikTok developer app in **Production** mode.
2. Add **Login Kit** for Web (and mobile if applicable).
3. Redirect URI (exact):  
   `https://ludmilpaulo.pythonanywhere.com/api/auth/social/tiktok/callback/`
4. Scopes: `user.info.basic` (email may be unavailable — accounts can still be created by `open_id`).
5. Submit for TikTok review before public launch if required.
6. Set `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REDIRECT_URI`.

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
| GET | `/api/auth/social/tiktok/callback/` | OAuth callback (returns exchange_code, not raw token) |
| POST | `/api/auth/social/link-confirm/` | Password-confirm email collision link |
| GET | `/api/auth/social/methods/` | Linked login methods (auth) |
| DELETE | `/api/auth/social/<provider>/unlink/` | Unlink (blocks last method) |
| POST | `/api/auth/logout/` | Delete DRF token |

## Clients

- **Web**: `/login` social buttons; `/login/social-callback` for TikTok; profile → Login e segurança.
- **Mobile**: Login/Register social buttons (Apple on iOS); Settings → Login e segurança; scheme `zenda://`.

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
- [ ] Production credentials created in each console
- [ ] Provider app review / Live mode completed
- [ ] Sign in with Apple capability enabled on App ID + EAS iOS rebuild
- [ ] Production smoke test on real Android + iOS devices

## Production smoke test (after credentials)

1. Google signup → user + `SocialAccount` row → logout → login again (same user). **Android + iOS.**
2. Facebook same. **Android + iOS.**
3. TikTok same. **Android + iOS.**
4. Apple Sign In on **iOS** (new + returning; private relay email).
5. Existing email/password user → Google with same verified email → link prompt → password → one user, two methods.
6. Register screen: same email collision → link UI (not silent fail).
7. Unlink last method → blocked.
8. Cancel OAuth → back to login without error spam.
9. Invalid/expired token → clear error.
10. Network failure → clear error.
11. Reuse TikTok `code` / bad `state` / expired `exchange_code` → rejected.

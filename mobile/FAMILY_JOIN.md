# Family join deep-link QA matrix

Production join URL (separate from growth referrals at `/invite/{referral_code}`):

`https://www.rubianejoaquim.com/family/join/{CODE}`

Handlers: `mobile/src/navigation/linking.ts` (`pending_family_invite`), web `frontend/app/family/join/[code]/page.tsx`, AASA `/family/join*`, Android `pathPrefix` `/family/join`.

| Installed | Platform | Auth | Code | Expected |
|---|---|---|---|---|
| Yes | iOS / Android | Logged in | Valid | Opens Family Finance with preview → join/request |
| Yes | iOS / Android | Logged out | Valid | Persist `pending_family_invite`, after login show invited banner |
| Yes | iOS / Android | Either | Invalid / expired | `family.invalidCode` (404 / 410) |
| Yes | Web | Logged in | Valid | Join/request UI on `/family/join/{CODE}` |
| Yes | Web | Logged out | Valid | Cookie + login/register `next=/family/join/{CODE}` |
| No | iOS / Android | — | Valid | Web join page sets cookie, then `/download?family={CODE}` → store |
| No | Web | Logged out | Valid | Same cookie + store links after persist |
| Either | Any | Unauthenticated | Any | Join API returns 401; preview (name, count, currency only) is public |

Do not mix family codes with `User.referral_code` / `ZENDA_PENDING_REF`.

# Spec — one phone and one web session per account

Issue: #660 · Status: draft · Intent: ./intent.md

## Data

`UserSession.platform TEXT NULL` (`web` | `mobile`; NULL = unknown or row created before #660).
Index `(userId, isActive, platform)`.

## Platform of a login — `detectClientPlatform(headers)` (`packages/utils`-free pure helper in `apps/api/lib/client-platform.ts`)

1. `X-Client-Platform`: `web` → `web`; `mobile` | `ios` | `android` → `mobile`. Any other value → step 2.
2. `User-Agent`:
   - app clients → `mobile`: `AnyRent-iOS/…`, `AnyRent-Android/…`, `… CFNetwork/… Darwin/…` (URLSession default),
     `… Alamofire/…` (Alamofire default), `okhttp/…` (OkHttp default), `Dalvik/…` (Android default).
   - browser `Mozilla/…` → `web`.
3. Otherwise NULL.

`/api/mobile/auth/login` is always `mobile`.

## createUserSession(userId, ip, ua, expiryDays, { absoluteDays?, platform? })

- platform NULL / missing: unchanged (deactivate all active sessions, revoke all unrevoked refresh tokens).
- platform P:
  - kept = active sessions of the user whose platform is set and is not P;
  - deactivate active sessions with platform P or NULL, `invalidatedAt = loginAt`;
  - revoke every unrevoked refresh token of the user except those bound (`RefreshToken.sessionId`) to a kept session;
  - create the new session with `platform = P`, `createdAt = loginAt`.

## getSessionStatus

Replaced = inactive, `invalidatedAt` equals the `createdAt` of another session of the user **of the same
platform or of NULL platform** (when the session has a platform). Sessions without platform: unchanged.

## Unchanged

Logout, `invalidateAllUserSessions`, `invalidateAllMerchantUserSessions`, token lifetimes (`detectPlatform`
keeps deciding 90-day vs 7-day), response shapes, refresh flow.

## Acceptance (tests)

1. Web then mobile → both active; the web session's refresh tokens are not touched by the mobile login and vice versa.
2. Second web login → first web session `replaced`; mobile session still `active`.
3. Old app UA (CFNetwork / Alamofire / okhttp / Dalvik) with no header → mobile.
4. Unknown UA → NULL → replaces everything (today).
5. `invalidateAllUserSessions` (password reset / admin lock) → both platforms logged out.
6. Refresh tokens of the other platform still rotate.

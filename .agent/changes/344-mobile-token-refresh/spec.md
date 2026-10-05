# Spec — Mobile token refresh (phase 2)

Issue: #344 · Status: accepted · Intent: ./intent.md

## Behavior

1. `POST /api/mobile/auth/login` applies the same checks as `/api/auth/login` (rate limit, credentials, active
   account, email verification) and returns the same `data.user` shape.
2. It creates a sliding mobile session (30 days idle, 90 days absolute), signing out older sessions.
3. It returns `data.token` (expires in 1 hour), `data.refreshToken` bound to the new session, `expiresIn: "1h"`,
   `refreshExpiresIn: "30d"`.
4. `/api/auth/login` responses are unchanged (no refresh token).
5. Refresh with a refresh token returns a 1-hour access token; legacy web refresh keeps 7 days.
6. iOS and Android log in through `/api/mobile/auth/login` with `X-Client-Platform: mobile` and a device type header.
7. The refresh token is stored in Keychain (iOS) / Keystore-encrypted storage (Android) and removed on logout.
8. On 401 `TOKEN_EXPIRED` both apps refresh once via `/api/mobile/auth/refresh`, save both tokens, and retry the
   original request once (Android `ApiClient.execute` and `authedBytes`; iOS `AuthInterceptor.retry`). iOS also
   refreshes before sending when the token expires within 60 seconds (server-clock aware). Concurrent requests share
   one refresh on both. A network error during refresh keeps the user signed in.
9. On 401 `SESSION_REPLACED` the app logs out and shows the localized "signed in on another device" message.
10. On any other 401, or when refresh fails, the app logs out as today.
11. Logout calls `/api/mobile/auth/logout` with the refresh token.

## Out of scope

- Web refresh tokens. Proactive refresh before expiry (reactive refresh on `TOKEN_EXPIRED` is enough).

## API and data

- `/api/mobile/auth/login` response = `/api/auth/login` response + `refreshToken`, `expiresIn`, `refreshExpiresIn`.
- No schema change.

## Acceptance

- [x] 1–5 covered by Jest tests (+ logout: `tests/api/mobile-logout.test.ts`)
- [x] 6–11: Android unit tests (`ApiClientRefreshTest`), `assembleDebug`, iOS `xcodebuild` green
- [x] iOS: `AuthSessionTests` (policy, expiry, refresh-and-retry through a stubbed session)
- [ ] Manual run against dev API on both apps

## Re-land on dev (2026-10-05)

#346 never reached `dev` (merged into `fix/343-token-expiry-refresh` after that branch was merged). The re-land
cherry-picks it onto `origin/dev` and adds:

- iOS retry after `TOKEN_EXPIRED` (above); `TabsV2APIService` and `loadOutletOperations` (new on `dev`) use `AuthSession`.
- Android `authedBytes` (downloads) refreshes and retries like `execute`.
- Android keeps the `X-Client-Platform` headers `dev` already sets in `applyAuth`; the #346 interceptor is dropped.
- NavHost keeps the #386 rule (no rebuild of the new login screen) and adds the #344 sign-out message.
- Uploads (multipart) on iOS rely on the proactive refresh only; they are not retried.

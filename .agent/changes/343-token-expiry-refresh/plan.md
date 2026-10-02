# Plan — Server-side session fixes for frequent mobile logouts (phase 1)

Issue: #343 · Status: accepted · Spec: ./spec.md

## Steps

1. Failing tests (`bug-fix-tdd`), commit them, then `FIX_MODE=1`:
   - `tests/packages/auth/auth-401-codes.test.ts` — behaviors 1–5 via `authenticateRequest` with mocked `db`
   - `tests/packages/database/sessions-sliding.test.ts` — behaviors 3, 4, 6–9, 11 via `sessions.ts` with mocked prisma
   - `tests/api/refresh-session-binding.test.ts` — behaviors 12–14 via the refresh helper with mocked `db`
   - `tests/api/platform-detector.test.ts` — behavior 10
2. Migration (`db-migration`): new folder `prisma/migrations/20261002120000_session_sliding_refresh_binding/`.
3. `packages/database/src/sessions.ts`: `createUserSession(..., { absoluteDays })`, `getSessionStatus()` returning
   `active | replaced | expired` and sliding the expiry; `validateSession` delegates to it. Revoke refresh tokens in
   the login transaction.
4. `packages/database/src/refresh-tokens.ts`: `create` / `rotate` carry `sessionId`.
5. `packages/auth/src/jwt.ts`: `isTokenExpired(token)`; `ACCESS_TOKEN_MOBILE` → `90d`.
6. `packages/auth/src/core.ts`: `TOKEN_EXPIRED` vs `INVALID_TOKEN`; session status → `SESSION_REPLACED` / `SESSION_EXPIRED`.
7. `apps/api/lib/platform-detector.ts`: OkHttp → mobile/android.
8. `apps/api/lib/build-auth-login-response.ts`: mobile session 30d idle / 90d absolute.
9. `apps/api/lib/refresh-access-token.ts` (new): shared refresh logic; both refresh routes call it (`api-route-standard`).
10. i18n (`i18n-keys`): `SESSION_EXPIRED`, `SESSION_REPLACED` in `locales/*/errors.json`, `packages/utils/src/core/errors.ts`,
    `ErrorCodes.swift`, `ApiErrorMessages.kt`.

## Verify

- `cd tests && yarn test auth-401-codes sessions-sliding refresh-session-binding platform-detector`
- `yarn type-check`, `yarn lint`, `SKIP_ENV_VALIDATION=true yarn build --filter=@rentalshop/api`
- `yarn db:migrate:dev` creates only the new folder

## Risks

- Web: new 401 codes; `packages/utils/src/core/common.ts` handles any 401 the same way, so no change.
- One extra DB write per session per day (sliding).
- Refresh tokens issued before the migration have no `sessionId` and stop refreshing; no shipped client uses them.

## Rollback

Revert the PR. The nullable columns can stay; old code ignores them.

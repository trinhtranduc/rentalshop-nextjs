# Plan — Mobile token refresh (phase 2)

Issue: #344 · Status: accepted · Spec: ./spec.md

## Steps

1. Failing tests: `tests/api/mobile-login-refresh.test.ts` (behaviors 2–4) and update
   `tests/api/refresh-session-binding.test.ts` for the 1-hour refresh token (behavior 5).
2. `packages/auth/src/jwt.ts`: `ACCESS_TOKEN_REFRESHABLE: '1h'`, `generateRefreshableToken`.
3. `apps/api/lib/password-login.ts` (new): credential checks shared by both login routes.
4. `apps/api/lib/build-auth-login-response.ts`: option `issueRefreshToken` → mobile session, 1-hour token,
   refresh token bound to the session.
5. `apps/api/app/api/mobile/auth/login/route.ts`: use 3 + 4. `apps/api/lib/refresh-access-token.ts`: 1-hour token.
6. iOS (`mobile-parity`): login endpoint, Keychain storage, refresh-and-retry in the request pipeline,
   `SESSION_REPLACED` handling, logout revokes the refresh token.
7. Android (`mobile-parity`): headers, login endpoint, Keystore-backed storage, OkHttp refresh-and-retry,
   `SESSION_REPLACED` handling, logout revokes the refresh token.

## Verify

- `cd tests && yarn test mobile-login-refresh refresh-session-binding`
- API build; iOS `xcodebuild … build`; Android `./gradlew :app:assembleDebug`

## Risks

- A bug in the mobile refresh loop could log users out more, not less: refresh at most once per request, never refresh on the refresh call itself.
- Ship the API (#343 + this) before the app releases.

## Rollback

Revert the app release (store builds on `/api/auth/login` keep working). The API part is additive.

## Re-land on dev (2026-10-05)

1. Branch `fix/344-mobile-token-refresh-dev` from `origin/dev` (`fix/344-mobile-token-refresh` is the merged #346 branch).
2. Cherry-pick the #346 API tests, API fix, Android tests, Android fix, iOS fix and docs; skip d9af3683 (old compile fix).
3. Failing tests first: Android download refresh (`ApiClientRefreshTest`), iOS `AuthSessionTests`.
4. iOS retry (`AuthAwareSession`, `AuthInterceptor.retry`, `AuthResponsePolicy`, `SessionEndReason`); Android `authedBytes`.
5. Verify: `cd tests && npx jest api/`; `./gradlew :app:testDebugUnitTest :app:assembleDebug`; iOS `POS ADBDTests` + build.

# Mobile apps refresh tokens and tell expiry from another-device login (phase 2)

Issue: #344 · Author: Trinh Tran · Status: accepted · Created: 2026-10-02 · Depends on: #343

## Problem

After #343 the server returns distinct 401 codes and binds refresh tokens to sessions, but the iOS and Android
apps still log in through `/api/auth/login`, hold one 90-day token, never refresh, and log out on any 401 with a
generic message. `/api/mobile/auth/login` does not create a session, so the apps cannot switch to it as is.

## Proposed outcome

- `/api/mobile/auth/login` shares the password-login path with `/api/auth/login` (same checks, session created,
  older devices signed out) and also returns a `refreshToken` bound to the session and a 1-hour access token.
- Both apps use it, store the refresh token securely, refresh silently on `TOKEN_EXPIRED`, and on
  `SESSION_REPLACED` log out with "account signed in on another device".

## Affected users and systems

- All mobile roles. Apps: `api`, iOS, Android. Models unchanged (columns from #343).

## Constraints

- Store builds keep calling `/api/auth/login` (90-day token, phase 1) and keep working.
- Single session per user stays.
- Access token in Keychain (iOS) / Android Keystore-backed storage; never log tokens.

## Open questions

- None. Neither app has Google sign-in.

## Decision log

- 2026-10-02 — Do phase 2 right after phase 1 ("sau đó update mobile luôn") (Trinh Tran)
- 2026-10-02 — Access token 1 hour when a refresh token is issued; refresh token 30 days, rotated (agent, per earlier agreement)
- 2026-10-02 — iOS refreshes proactively in an Alamofire interceptor: call sites read errors from 200-path bodies without `.validate()`, so Alamofire never calls `retry` on a 401 (agent)
- 2026-10-02 — `/api/mobile/auth/logout` stops trusting a client `x-user-id` header (public route; let anyone sign out any user) (agent)
- 2026-10-02 — Fixed pre-existing Android compile errors on `dev` (OverviewScreen, AvailabilityScreen) to verify this change (agent)
- 2026-10-05 — PR #346 merged into `fix/343-token-expiry-refresh` seven seconds after #345 merged that branch
  into `dev`, so none of phase 2 reached `dev`. Re-landed on `fix/344-mobile-token-refresh-dev` from `origin/dev`
  by cherry-picking the #346 commits (agent)
- 2026-10-05 — iOS now also retries after a 401 `TOKEN_EXPIRED`: `AuthAwareSession` validates only that response,
  so Alamofire calls `AuthInterceptor.retry`; other responses stay unvalidated and call sites are unchanged.
  Both apps now refresh once and retry once (agent)

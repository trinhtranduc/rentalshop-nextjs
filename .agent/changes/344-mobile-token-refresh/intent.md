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

- Google sign-in on mobile: same refresh support if the apps use it (see plan).

## Decision log

- 2026-10-02 — Do phase 2 right after phase 1 ("sau đó update mobile luôn") (Trinh Tran)
- 2026-10-02 — Access token 1 hour when a refresh token is issued; refresh token 30 days, rotated (agent, per earlier agreement)

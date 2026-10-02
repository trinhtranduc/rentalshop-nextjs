# Spec — Server-side session fixes for frequent mobile logouts (phase 1)

Issue: #343 · Status: accepted · Intent: ./intent.md

## Behavior

1. A request whose JWT `exp` has passed (valid signature) returns 401 `TOKEN_EXPIRED`.
2. A malformed or wrongly signed JWT returns 401 `INVALID_TOKEN`.
3. A request whose session was deactivated by a newer login of the same user returns 401 `SESSION_REPLACED`.
4. A request whose session was logged out, reset by an admin, or timed out returns 401 `SESSION_EXPIRED`.
5. Every authenticated request with a `sessionId` checks the session in the database (no cache, no skip).
6. Login from a mobile client creates a session with `expiresAt = now + 30d` and `absoluteExpiresAt = now + 90d`,
   and a JWT that expires in 90 days.
7. Login from web is unchanged: 7-day session, no absolute cap stored, no sliding.
8. A successful request on a sliding session moves `expiresAt` to `min(now + 30d, absoluteExpiresAt)` when that
   moves it by more than 1 day (at most one write per day per session).
9. A request after `absoluteExpiresAt` returns 401 `SESSION_EXPIRED`.
10. A request with User-Agent `okhttp/<version>` and no `X-Client-Platform` header is detected as mobile/android.
11. Every login (any endpoint that creates a session) revokes all of that user's refresh tokens.
12. A refresh token created alongside a session stores that session's `sessionId`; rotation keeps it.
13. `POST /api/auth/refresh` and `POST /api/mobile/auth/refresh` with a refresh token whose session is active issue an
    access token with that same `sessionId`; with a replaced session they return 401 `SESSION_REPLACED`; with an
    expired, logged-out, or missing session they return 401 `SESSION_EXPIRED`. Neither ever picks another session.
14. Legacy refresh (Bearer access token, no body) returns `SESSION_REPLACED` / `SESSION_EXPIRED` when the token's
    session is not active, instead of issuing a token.
15. `SESSION_REPLACED` and `SESSION_EXPIRED` have messages in en, vi, ja, ko, zh and in both mobile error tables.

## Out of scope

- Mobile app changes beyond the error tables (phase 2 issue).
- Web refresh-token flow, multi-session, device list.
- Changing `/api/mobile/auth/login` (phase 2 moves it onto the session-creating login path).

## API and data

- `UserSession.absoluteExpiresAt DateTime?`, `UserSession.idleTimeoutDays Int?` — null means no sliding (web, old rows).
- `RefreshToken.sessionId String?` + index — null means not bound; such a token can no longer refresh.
- New 401 code `SESSION_REPLACED`. `TOKEN_EXPIRED` already exists in `ErrorCode`, now returned by auth.
- Refresh response shape unchanged.

## Acceptance

- [ ] Behaviors 1–14 covered by Jest tests in `tests/`
- [ ] Behavior 15: keys present in 5 locales, `ErrorCodes.swift`, `ApiErrorMessages.kt`
- [ ] `yarn type-check`, `yarn lint`, API build green
- [ ] Store builds: login, use, log in elsewhere → old device logged out (Android shows the server message)

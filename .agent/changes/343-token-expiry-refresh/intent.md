# Server-side session fixes for frequent mobile logouts (phase 1)

Issue: #343 · Author: Trinh Tran · Status: accepted · Created: 2026-10-02

## Problem

Mobile users are logged out often and must type their password again.

- Android is detected as web (no `X-Client-Platform` header, OkHttp User-Agent not matched), so its
  token and session last 7 days instead of 30.
- Sessions have a fixed expiry from login. A user who opens the app every day is still logged out on day 30
  (iOS) or day 7 (Android).
- An expired JWT returns `INVALID_TOKEN`, the same as a forged one. "Signed out because the account logged in on
  another device" returns `SESSION_EXPIRED`, the same as logout or an admin reset. A client cannot tell them apart.
- Refresh tokens are not linked to a session and survive a new login. Both refresh routes attach the newest
  active session to the token they issue, so a kicked device that refreshes takes over the new device's session.

The apps in the stores cannot refresh tokens (they call `/api/auth/login` and log out on any 401). Phase 1 fixes
what the server alone can fix. Phase 2 (separate issue) moves the apps to short access tokens plus refresh.

## Proposed outcome

- One active session per user at a time, as today.
- Mobile sessions slide: each authenticated request keeps the session alive for 30 more days, never past
  90 days from login. A mobile JWT lives 90 days, so the JWT expiry is that absolute cap.
- Android apps already in the field are detected as mobile.
- Distinct 401 codes: `TOKEN_EXPIRED` (JWT expired), `SESSION_REPLACED` (a newer login on another device),
  `SESSION_EXPIRED` (session timed out, logged out, or reset by an admin).
- A refresh token only refreshes the session it was issued for; a new login revokes all older refresh tokens.

## Affected users and systems

- Roles: all mobile users (`MERCHANT`, `OUTLET_ADMIN`, `OUTLET_STAFF`); web users only see new 401 codes.
- Apps: `api`. iOS and Android error tables get the new code (no behavior change in phase 1).
- Models: `UserSession`, `RefreshToken`.

## Constraints

- Store builds must keep working with no app update.
- Every authenticated request must keep validating the session in the database. A 90-day JWT is only safe because of
  that check; it is pinned by a test.
- Web session behavior stays as today (7 days, no sliding).
- New migration only; never edit an applied one.

## Open questions

- None for phase 1.

## Decision log

- 2026-10-02 — Keep single session per user; a newer login signs out the older device (Trinh Tran)
- 2026-10-02 — Natural expiry and single-session kick must return different codes (Trinh Tran)
- 2026-10-02 — Phase 1 server-only; phase 2 mobile refresh in a separate issue, done right after (Trinh Tran)
- 2026-10-02 — Mobile: 30-day idle, 90-day absolute; mobile JWT 90 days while store builds cannot refresh (agent proposal, accepted with "làm giai đoạn 1")
- 2026-10-02 — Kick-by-new-login gets its own code `SESSION_REPLACED`; `SESSION_EXPIRED` keeps covering logout, admin reset and timeouts so its message stays true (agent)

# One phone session and one web session per account

Issue: #660 · Author: Trinh Tran (agent) · Status: approved by owner · Created: 2026-10-08

## Problem

`createUserSession` (`packages/database/src/sessions.ts`) deactivates every active session of the user and
revokes every refresh token on each login, whatever the device. Logging in on the web kicks the phone
out (`SESSION_REPLACED`) and the other way round. Shop owners use the phone at the counter and the web at
the desk; today they cannot stay logged in on both.

## Proposed outcome

- A login replaces only the active session of the same kind (`web` or `mobile`).
- A web login leaves the phone session and its refresh token working, and the other way round.
- A second login of the same kind replaces the first one exactly as today (`SESSION_REPLACED`).
- A login whose kind cannot be told behaves exactly as today (replaces everything).

## Affected users and systems

All roles. `apps/api` login paths (`/api/auth/login`, `/api/auth/login/google`, `/api/auth/register/merchant-google`,
`/api/mobile/auth/login`), `packages/database` sessions, Prisma `UserSession`. Clients unchanged: web
(`publicFetch`), iOS (`BaseService.jsonHeader`) and Android (`ApiClient.applyAuth`) already send
`X-Client-Platform` (`web` / `mobile`).

## Constraints

- Installed iOS / Android builds cannot be updated: the old login path must keep working (it does; they
  already send `X-Client-Platform: mobile`).
- Additive, nullable migration. Old rows stay NULL and are treated as "any kind".
- Log-out-everything paths stay untouched: password change / reset (`passwordChangedAt`), admin lock,
  user moved, plan / role changes (`invalidateAllUserSessions`, `invalidateAllMerchantUserSessions`).
- No response shape change. Token lifetimes unchanged.

## Open questions

- None blocking. Follow-up: a password change does not revoke refresh tokens (pre-existing, not changed here).

## Decision log

- 2026-10-08 — one phone session + one web session per account (owner).
- 2026-10-08 — store `web` | `mobile` (not `ios` / `android`): an iPhone and an Android phone of the same
  account still replace each other, as the owner decided "one phone session".

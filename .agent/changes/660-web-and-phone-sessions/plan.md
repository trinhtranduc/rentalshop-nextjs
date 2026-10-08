# Plan — one phone and one web session per account

Issue: #660 · Status: in progress · Spec: ./spec.md

## Steps

1. Tests first (commit alone, failing):
   - `tests/packages/database/sessions-per-platform.test.ts` — in-memory Prisma fake; scenarios 1, 2, 4, 5, 6 and `getSessionStatus` replaced only within the platform.
   - `tests/api/client-platform.test.ts` — `detectClientPlatform` with real UA strings.
   - `tests/api/mobile-login-refresh.test.ts` — login passes `platform` to `createUserSession` (existing expectations updated: the call now carries `{ platform }`).
2. Migration `prisma/migrations/20261019090000_user_session_platform` (hand-written, checked with `prisma migrate diff`), schema field + index.
3. `packages/database/src/sessions.ts` — platform-scoped replace (spec). Refresh tokens are bound to sessions by
   `RefreshToken.sessionId` (= `UserSession.sessionId`, since #343). We revoke every unrevoked token of the user
   except the tokens bound to the kept other-platform sessions, so tokens with a NULL `sessionId` (pre-#343, cannot
   refresh anyway) and tokens of inactive sessions are revoked as today.
4. `apps/api/lib/client-platform.ts` (new) + `build-auth-login-response.ts` passes `platform`.
   `platform-detector.ts`: header `ios` / `android` also means mobile (today they fall to `unknown` → 7-day web token).
5. Clients: no change. Web `publicFetch` sends `X-Client-Platform: web`; iOS `BaseService.jsonHeader` and Android
   `applyAuth` send `X-Client-Platform: mobile` on login (also on `main-real`).
6. Verify: jest (both TZ), `tsc` for api, `prisma validate`, migration on a fresh local DB + `migrate diff`.

## Files

- `prisma/schema.prisma`, `prisma/migrations/…_user_session_platform/migration.sql`
- `packages/database/src/sessions.ts`
- `apps/api/lib/client-platform.ts`, `apps/api/lib/build-auth-login-response.ts`, `apps/api/lib/platform-detector.ts`
- `tests/…`, `.agent/api-changes/LOG.md`

## Risks

- Auth change: human review required.
- An iPhone and an Android phone of the same account replace each other (one phone session, by decision).
- Requests with unknown UA and no header keep today's replace-all.
- Deploy order: migration runs in `start.sh` before the new code serves; old code ignores the column.

## Rollback

Revert the PR. The nullable column can stay; old code ignores it.

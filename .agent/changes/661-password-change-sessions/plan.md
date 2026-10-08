# Plan — #661

1. Tests (commit alone): `tests/api/password-change-sessions.test.ts`
   - refresh token created before `passwordChangedAt` → 401 SESSION_EXPIRED, token revoked, no rotate;
     created after → ok.
   - self change-password → `invalidateUserSessionsExcept(userId, callerSessionId)`.
   - reset-password → `invalidateUserSessionsExcept(userId)` (all).
   - admin sets another user's password → `invalidateUserSessionsExcept(targetId)` (all).
   - DB helper: deactivates other sessions with `invalidatedAt`, revokes their tokens + unbound tokens.
2. Fix: `sessions.ts` helper; `refresh-tokens.ts` rotate returns `issuedAt`; three routes; refresh flow check.
3. `.agent/api-changes/LOG.md` row (planned).
4. Verify: new + refresh/session tests under TZ=UTC and Asia/Ho_Chi_Minh; `tsc` on apps/api.

# Spec — #661

1. `db.sessions.invalidateUserSessionsExcept(userId, keepSessionId?)` (packages/database/src/sessions.ts):
   in one transaction, set `isActive=false, invalidatedAt=now` on every active session of the user except
   `keepSessionId`, and revoke every unrevoked refresh token of the user whose `sessionId` is one of those
   sessions or is null. `invalidatedAt` matches no other session's `createdAt`, so `getSessionStatus`
   answers `expired` (→ `SESSION_EXPIRED`), not `replaced`.
2. `POST /api/auth/change-password`: after the password update, call it with `user.sessionId` (keep caller).
3. `POST /api/auth/reset-password` and `PATCH /api/users/[id]/change-password`: after the update, call it
   for the target user with no keep id (all sessions out). A user setting their own password through
   `users/[id]` is treated like a reset (all out), matching "an owner/admin sets it".
   Note: for `users/[id]` when the caller is the target, keep the caller's session (same as self change).
4. `refreshWithRefreshToken`: before rotating, read the presented token's `createdAt` + `userId`
   (`db.refreshTokens.findMeta`, new accessor). If the user's `passwordChangedAt` is later than the token's
   `createdAt`, revoke the token and answer 401 `SESSION_EXPIRED`.
5. Nothing else changes (codes, shapes, legacy access-token refresh).

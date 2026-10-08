# Spec — #661

1. `db.sessions.invalidateUserSessionsExcept(userId, keepSessionId?, at?)` (packages/database/src/sessions.ts):
   in one transaction, set `isActive=false, invalidatedAt=at` on every active session of the user except
   `keepSessionId`, and revoke every unrevoked refresh token of the user whose `sessionId` is one of those
   sessions or is null. `invalidatedAt` matches no other session's `createdAt`, so `getSessionStatus`
   answers `expired` (→ `SESSION_EXPIRED`), not `replaced`.
2. `POST /api/auth/change-password`: call it with `user.sessionId` (keep caller).
3. `POST /api/auth/reset-password`: all sessions of the user out (no keep id).
   `PATCH /api/users/[id]/change-password`: all sessions of the target out; when callers set their own
   password there, keep the caller's session (same as self change).
   The helper runs just before the password update with the same `changedAt`, so a failed update never
   leaves a new password with old devices still in.
4. `refreshWithRefreshToken`: `db.refreshTokens.rotate` also returns `issuedAt` (the presented token's
   `createdAt`). If the user's `passwordChangedAt` is later than the token's
   `createdAt`, revoke the rotated token and answer 401 `SESSION_EXPIRED`.
5. Nothing else changes (codes, shapes, legacy access-token refresh).
6. The kept session's live refresh tokens get `createdAt = changedAt`, so check 4 lets them through.

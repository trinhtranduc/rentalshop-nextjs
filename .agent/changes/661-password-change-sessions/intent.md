# Intent — A password change logs out other devices

Issue: #661 · Branch: `fix/661-password-change-sessions` (off `dev`)

## What
After a password change, reset, or an admin/owner setting a user's password, devices that held a
refresh token from before the change can no longer get new access tokens.

## Why
The three password routes only set `passwordChangedAt`. The refresh-token flow
(`apps/api/lib/refresh-access-token.ts`) rotates the old refresh token and signs the new access token with
the current `passwordChangedAt`, so the stolen phone or token keeps working. "Đổi mật khẩu để đăng xuất máy
lạ" does nothing today.

## Constraints
- Security fix: conservative, smallest change. No response shape change, no migration.
- Self change-password keeps the caller's own session (the user stays logged in where they changed it).
- Old installed apps already handle 401 `SESSION_EXPIRED` (show login). Reuse it; no new code.

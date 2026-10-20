# Spec — #1138

- The login payload (`POST /api/auth/login`) has no `merchant.onlineBookingEnabled`; `GET /api/users/profile` has it.
- `onlineBookingFlag(merchant)` (settings-model) returns `true` / `false` when the key is a boolean, else `null` (unknown).
- Settings, merchant tab (and outlet tab for OUTLET_ADMIN): when the flag is unknown, load the profile once via `refreshUser()` (→ `/api/users/profile`), which updates the cached user.
- Switch shows `flag === true`. After toggling, the existing `refreshUser` keeps local state in sync.
- No change for installed apps: no API file changes.

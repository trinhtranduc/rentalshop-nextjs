# Plan — #1138

1. `tests/web-settings-online-booking.test.ts`: login-shaped merchant → `null`, profile-shaped → boolean. Commit failing test.
2. `apps/client/app/settings/settings-model.ts`: add `onlineBookingFlag`.
3. `SettingsPanel.tsx`: use it for both tabs; one effect calls `refreshUser()` once when the flag is unknown.
4. Verify: tsc client, lint client, the test + `web-settings-model` under TZ=UTC.

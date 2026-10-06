# Plan — #528

1. `apps/client/app/components/shell/*`: notification panel and `/notifications` (groups by Vietnam day).
2. `apps/client/app/users/users-model.ts` + `page.tsx`: Nhân viên.
3. `apps/client/app/settings/settings-model.ts` + `page.tsx`: Cài đặt (spec above).
4. `apps/client/lib/theme.ts`: switch on by default, `false` is the kill switch; dark overrides for portals
   and `.ar-legacy` in `globals.css`.
5. i18n `locales/{en,vi}/{users,settings}.json` → `web`.
6. Tests: `tests/web-settings-model.test.ts`, `tests/web-shell-theme.test.ts`.
7. Verify: jest (both TZ), lint, client tsc (no new errors).

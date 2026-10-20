# Plan — Settings layout C

Issue: #1140 · Status: in-progress · Spec: ./spec.md

## Steps

1. `settings-model.ts`: tab list + groups, `public-page`, `appearance` alias, `isSettingsList`.
2. `SettingsPanel.tsx`: grouped nav, phone list / back, tab content per spec.
3. `sections.tsx`: "Thêm" collapse, `TenantKeySection`, `OutletsLinkRow`.
4. `SettingsDialog.tsx`: keep empty `?settings=` (phone list) instead of rewriting it.
5. Locales en, vi, ja, ko, zh (`settings.web`) — skill `i18n-keys`.
6. Tests: `tests/web-settings-model.test.ts`; `locales-valid-json`; TZ=UTC and Asia/Ho_Chi_Minh.
7. tsc apps/client vs baseline, lint changed files, headed Chrome check.

## Files

- `apps/client/app/settings/{settings-model.ts,SettingsPanel.tsx,sections.tsx}`
- `apps/client/app/components/shell/SettingsDialog.tsx`
- `locales/{en,vi,ja,ko,zh}/settings.json`
- `tests/web-settings-model.test.ts`

## Risks

UI only. Deep links covered by aliases. Currency sync effect left as is (still on the merchant tab).

## Rollback

Revert the PR.

## Decision log

- 2026-10-20: owner review of the first screenshots: nav rows must stay on one line. Side text ("Tiếng Việt · Sáng") dropped; English "Language & appearance" → "Language & theme". Checked 5 locales at 1366 and 1024: no row wraps or is cut.
- 2026-10-20: the owner saw Thông tin cửa hàng read-only. Cause: `refreshUser` (the #1138 profile load, and every save) replaced the user with GET /api/users/profile, which has no `permissions`. Fixed in `packages/hooks` (`mergeRefreshedUser`: same user keeps the login fields the profile does not send), failing test first (`tests/auth-refresh-keeps-login-fields.test.ts`). Client-only hook; no API change.
- Profile card title uses `nav.profile` (Hồ sơ) to match the nav.

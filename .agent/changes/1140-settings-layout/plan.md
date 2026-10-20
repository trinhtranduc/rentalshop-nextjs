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

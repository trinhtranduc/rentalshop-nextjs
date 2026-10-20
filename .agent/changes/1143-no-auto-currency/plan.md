# Plan — Opening Settings must not change the shop currency

Issue: #1143 · Status: approved · Spec: ./spec.md

## Steps

1. Failing tests (`bug-fix-tdd`): `tests/api/register-currency.test.ts` (both routes, vi / en / ja / headers only /
   nothing; schema accepts `ja`), `tests/web-settings-model.test.ts` (no `currencyForLocale` export).
2. `apps/api/lib/registration-currency.ts` — the rule; used in both register routes.
3. `packages/utils/src/core/validation-schemas.ts` — widen `locale`; types in `packages/utils/src/api/auth.ts`,
   `packages/types/src/entities/user.ts`.
4. `packages/ui/src/components/forms/RegisterForm.tsx` — send the UI language.
5. `apps/client/app/settings/SettingsPanel.tsx`, `settings-model.ts` — remove the sync.
6. `api-compat-review`: issue + PR table, row in `.agent/api-changes/LOG.md`.
7. Verify: tests under `TZ=UTC` and `TZ=Asia/Ho_Chi_Minh`, tsc client + api vs baseline, eslint changed files,
   headed Chrome sign-up vi / en + Settings in en.

## Risks

- Sign-up currency is now VND for vi shops (was USD until the owner opened web Settings). Mobile does not read it.

## Rollback

Revert the PR. Shops created meanwhile keep their stored currency.

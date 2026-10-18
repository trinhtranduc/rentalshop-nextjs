# Plan — Success responses must not carry the error sentence

Issue: #1013 · Status: approved · Spec: ./spec.md

## Steps

1. Failing tests (`bug-fix-tdd`): `tests/api-success-message.test.ts`; golden tests with narrow, exact
   message allowances. Commit alone.
2. `packages/utils/src/api-messages.ts`: add `getApiSuccessMessage` with a success fallback.
3. `packages/utils/src/api/response-builder.ts`: `success()` / `paginated()` use it.
4. `locales/*/errors.json`: `DAILY_INCOME_SUCCESS`, `INCOME_ORDERS_SUCCESS` (`i18n-keys`).
5. `.agent/api-changes/LOG.md` row (`api-compat-review`).
6. Verify: the three golden suites + new test + `locales-valid-json` + `api-message-locale`,
   `npx tsc --noEmit -p apps/api/tsconfig.json`, lint.

## Files

- `packages/utils/src/api-messages.ts`, `packages/utils/src/api/response-builder.ts` — resolver
- `locales/{en,vi,ja,ko,zh}/errors.json` — success copy
- `tests/api-success-message.test.ts`, `tests/api-compat/*-api-compat.test.ts`, `tests/api-compat/income-compat.ts`

## Risks

- Text-only change of `message` on success; no old app found that shows it for the changed codes.
- Overlap with #985 WIP in the same files.

## Rollback

Revert the PR; success messages go back to the error fallback (the bug), nothing else changes.

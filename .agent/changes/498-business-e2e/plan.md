# Plan — Business e2e suite on a local seeded API

Issue: #498 · Status: done · Spec: ./spec.md

## Steps

1. Read the rules: `packages/utils/src/core/revenue-calculator.ts`, `analytics/period-report.ts`,
   `analytics/income-period-summary.ts`, `analytics/order-value.ts`, order routes, availability route, #484/#492/#494/#429/#425/#405 specs.
2. Map the app calls (iOS reference, Android parity): multipart create, `PUT /api/orders/{id}` for status/edits,
   `/api/analytics/period`, `/outlet-operations`, `/products/{id}/availability`, `/products/batch-availability`.
3. Helper `tests/e2e/helpers/api.js`, config `tests/e2e/jest.config.js`, `global-setup.js`; `test:e2e` script and
   `testPathIgnorePatterns` in `tests/package.json`.
4. Test files per area; run each against a local API (`anyrent_business_e2e`, port 3190); confirm every
   `knownBug` fails for the stated reason with `BIZ_E2E_SHOW_BUGS=1`.
5. File bug issues, put the numbers into the `knownBug` calls.
6. `scripts/e2e/business-e2e.sh`; docs in `tests/README.md`, `tests/e2e/TEST_CASES.md`, mobile-e2e-local skill; AGENTS.md order number.
7. Verify: `scripts/e2e/business-e2e.sh` (both TZ), `cd tests && yarn test` against the `origin/dev` baseline.

## Files

- `tests/e2e/**` — suite, helper, config, catalogue
- `tests/package.json` — `test:e2e`, ignore `e2e/` in the default run
- `scripts/e2e/business-e2e.sh` — runner
- `tests/README.md`, `.claude/skills/mobile-e2e-local/SKILL.md` — how to run
- `AGENTS.md` — order number format

## Risks

- Runs across Vietnam midnight can flake ("today" deltas). Documented.
- Seed account emails follow row ids; the runner resolves them from the DB.
- Products accumulate per run (~110); the main merchant's plan allows 3000.

## Rollback

Revert the PR; nothing outside `tests/`, `scripts/e2e/` and docs changes.

# Spec — Business e2e suite on a local seeded API

Issue: #498 · Status: accepted · Intent: ./intent.md

## Behavior

1. `tests/e2e/TEST_CASES.md` lists every case with an ID (BF-PROD, BF-PRICE, BF-RENT, BF-SALE, BF-CANC, BF-DUP,
   BF-QTY, BF-EDIT, BF-OVR, BF-DAY, BF-SCOPE, BF-NUM), preconditions, steps and expected numbers.
2. `tests/e2e/business/*.e2e.test.js` implement those IDs (one file per area) with `tests/e2e/helpers/api.js`
   (login, products, customers, orders, status, availability, period/income/operations reads), using fetch
   against `E2E_API_URL`, which must be a localhost URL.
3. Each test creates its own rows; expected money comes from the test inputs; merchant-wide Overview numbers
   are compared as deltas, so runs repeat without reseeding.
4. `cd tests && yarn test` ignores `tests/e2e/`; `yarn test:e2e` runs the suite in band; without `E2E_API_URL`
   every e2e describe is skipped.
5. Logins happen once per account per run (`e2e/global-setup.js`, token cache), within the API's 10 logins /
   15 min limit and the single-session rule.
6. `scripts/e2e/business-e2e.sh` seeds (reuses `scripts/mobile-e2e/seed-local.sh`), resolves accounts from the DB,
   starts the API (reuses `api-local.sh`) per time zone, runs the suite under TZ=UTC and TZ=Asia/Ho_Chi_Minh
   (API and Jest), prints passed / failed / known-bug counts, stops the API it started, exits 1 on a failure.
7. Suspected bugs: the case asserts the correct rule via `knownBug('#issue', …)` (`test.failing`), and each has a
   bug issue. Ambiguous rules assert current behaviour and are listed as questions.
8. AGENTS.md "Orders" bullet states the random 6-digit order number.

## Out of scope

Fixing any bug found; API, package, mobile code; CI wiring (needs a Postgres service); photo uploads (S3).

## API and data

No API change. Local database only; the seed wipes business tables of that database.

## Acceptance

- [x] 1–3: 78 cases across 8 files (`TEST_CASES.md`)
- [x] 4: default suite result unchanged (same failures as `origin/dev`)
- [x] 6: `scripts/e2e/business-e2e.sh` run end to end, summary in the PR
- [x] 7: bugs #503 #504 #505 #506 filed; questions Q1–Q6 in the PR
- [x] Cancelled orders, Vietnam civil days and role limits covered (BF-CANC, BF-DAY, BF-SCOPE)

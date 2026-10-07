# Plan — Chosen rental days round trip

Issue: #573 · Status: done (PR #583) · Spec: ./spec.md

## Steps

1. `tests/e2e/business/date-roundtrip.e2e.test.js`: per client shape × case, create → read back on every endpoint.
2. Catalogue BF-RT-* in `tests/e2e/TEST_CASES.md`.
3. `tests/e2e/web/date-roundtrip.web.js` + `scripts/e2e/web-e2e.sh`: Playwright (`playwright-core`, local Chrome for
   Testing), login via the API with a random `X-Forwarded-For`, inject `authData`, click days, create, read back on each
   screen, cancel every created order at the end.
4. Run A with `scripts/e2e/business-e2e.sh` (TZ=UTC and Asia/Ho_Chi_Minh); B against a local API in three browser zones.
5. One bug issue per mismatch; mark the case known with that number.

## Files

- `tests/e2e/business/date-roundtrip.e2e.test.js`, `tests/e2e/TEST_CASES.md` — suite A
- `tests/e2e/web/*`, `scripts/e2e/web-e2e.sh` — suite B
- `tests/package.json`, `tests/yarn.lock` — `playwright-core` devDependency (only if missing)

## Risks

None for production: tests only, local hosts enforced.

## Rollback

Revert the PR.

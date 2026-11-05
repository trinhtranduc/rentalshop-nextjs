# Plan — Revenue block counts manual extensions and add-ons

Issue: #1484 · Status: in-progress · Spec: ./spec.md

## Steps

1. Red tests, committed alone (`05d456623`): 7 cases failed.
2. `REVENUE_PAYMENT_TYPES` in `apps/api/lib/admin-revenue.ts`; notes in `locales/{en,vi}/dashboard.json`.
3. Jest in both time zones; `next lint` of the lib; type-check; a seeded local run with screenshots.

## Files

- `apps/api/lib/admin-revenue.ts`, `apps/api/app/api/admin/revenue/monthly/route.ts` (comment)
- `locales/en/dashboard.json`, `locales/vi/dashboard.json`
- `tests/api/admin-revenue-route.test.ts`, `tests/api/admin-revenue-aggregate.test.ts`
- `.agent/changes/1482-admin-monthly-revenue/*` (decision log and spec), `.agent/api-changes/LOG.md`

## Risks

- None for installed apps. Revenue numbers go up for months with manual extensions (intended).

## Rollback

Revert the PR.

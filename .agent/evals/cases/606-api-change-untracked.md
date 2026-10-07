# api: an API change merges without an impact review or a tracked row

Status: active · Added: 2026-10-07 · Source: #606 (owner rule), near-miss in #605

## Failure

An API change (new or redefined response field, rule, migration, env var) is planned or merged without
checking what the installed iOS / Android builds on `main-real` do with it. Near-miss: filling the daily
`series[].futureIncome` of `GET /api/analytics/period` for a new dashboard would have added forecasts to
revenue on old Android (`OverviewScreen.kt:565`: `revenue = realIncome + futureIncome`).

## Detect

- `.github/workflows/pr-governance.yml` job `api-impact` fails when a PR touches `apps/api/`, `prisma/` or
  `packages/{database,utils,constants,auth,validation}/src/` without a `## API compatibility` section and a
  change to `.agent/api-changes/LOG.md`.
- The issue for an API change has a filled "API impact (installed apps)" field.

## Pass

The issue and the PR carry the api-compat-review table with `file:line` on `main-real`; the LOG has a row
that moves `planned` → `dev` → `main-real`; a new screen gets a new field instead of a redefined one.

## Notes

`AGENTS.md` → Conventions "API compatibility" and "Things agents get wrong"; skills `api-compat-review`
(steps 6–7) and `release-review` (6b).

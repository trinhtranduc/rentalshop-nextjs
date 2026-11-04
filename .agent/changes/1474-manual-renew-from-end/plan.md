# Plan — Manual upgrade and renewal count from the current end (hotfix)

Issue: #1474 · Status: in progress · Spec: ./spec.md

## Steps

1. Red test commit (`bug-fix-tdd`): `tests/api/manual-renew-from-end.test.ts` (same file name as on `dev`) with the
   owner's example, plus the tests that pinned the #779 credit rule (`subscription-renewal-pricing`,
   `subscription-billing-logic`, `addon-renewal-rules`, `loyalty-addon`, `feature-addon`, business e2e, `TEST_CASES.md`).
2. Fix commit: `calculatePlanChangeTotal` (`packages/utils`), comments in `changePlan()`, `payments/manual` base.
3. UI commit: `SubscriptionChangePlanDialog.tsx` carried-days line.
4. Docs commit: this folder, row in `.agent/api-changes/LOG.md`.
5. Sync PR into `dev`: merge this branch and `origin/main-real`, `dev`'s version of every file wins except `LOG.md`.
6. Skills: `timezone-dates`, `api-compat-review`, `release-review` (risk issue), `verify-change`.

## Files

- `packages/utils/src/core/subscription-billing-calculations.ts` — the plan-change formula (root cause)
- `packages/database/src/subscription.ts` — comments only (`changePlan()` already writes what the formula returns)
- `apps/api/app/api/payments/manual/route.ts` — expired base
- `packages/ui/src/components/features/Subscriptions/components/SubscriptionChangePlanDialog.tsx` — preview text
- `tests/**` — red test and updated expectations
- `.agent/api-changes/LOG.md` — impact row

## Risks

- The price of an admin upgrade goes up (no credit) and the end is later: intended, admin-only.
- No migration, no env. Mobile builds do not call these routes.

## Rollback

Revert the PR; rows written in the meantime keep their later end (correct for the shop).

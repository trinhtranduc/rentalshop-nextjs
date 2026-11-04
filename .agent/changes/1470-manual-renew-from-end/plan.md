# Plan — Manual upgrade and renewal count from the current end

Issue: #1470 · Status: in progress · Spec: ./spec.md

## Steps

1. Docs commit: this folder and a `planned` row in `.agent/api-changes/LOG.md`.
2. Red test commit (`bug-fix-tdd`): `tests/api/manual-renew-from-end.test.ts` with the owner's example
   (end 05/11/2026, action 03/11/2026, 12 months → 05/11/2027): the shared formula, `changePlan()` (active, trial,
   expired, store credit), `POST /api/payments/manual` (expired). Update the unit tests that pinned the #779 credit
   rule (`subscription-renewal-pricing`, `subscription-billing-logic`, `addon-renewal-rules`, `loyalty-addon`,
   `feature-addon`) and the business e2e expectations (`subscription-billing`, `plan-change`).
3. `FIX_MODE=1`, then fix:
   - `packages/utils/src/core/subscription-billing-calculations.ts`: `calculatePlanChangeTotal` per spec 1–4.
   - `packages/utils/src/core/store-credit.ts`: the A13 / A10 pure helpers moved from `apps/api/lib/plan-renewal.ts`
     (re-exported there, no behaviour change) so `packages/database` can use them.
   - `packages/database/src/subscription.ts`: `changePlan()` writes the period with `manualExtensionBilling`.
   - `apps/api/app/api/payments/manual/route.ts`: base = `max(end, now)`.
   - `packages/ui/.../SubscriptionChangePlanDialog.tsx`: carried-days line instead of the credit line.
4. Skills: `timezone-dates`, `api-compat-review`, `verify-change`.
5. Verify: new test under both TZ, the listed suites, whole `tests` suite, `yarn lint`, `yarn type-check`.

## Files

- `packages/utils/src/core/subscription-billing-calculations.ts` — the plan-change formula (root cause)
- `packages/utils/src/core/store-credit.ts`, `packages/utils/src/core/index.ts`, `apps/api/lib/plan-renewal.ts` — A13 / A10 helpers shared with `packages/database`
- `packages/database/src/subscription.ts` — `changePlan()` writes
- `apps/api/app/api/payments/manual/route.ts` — expired base
- `packages/ui/src/components/features/Subscriptions/components/SubscriptionChangePlanDialog.tsx` — preview text
- `tests/**` — red test and updated expectations
- `.agent/api-changes/LOG.md` — impact row

## Risks

- Price of an admin upgrade goes up (no credit) and the end is later: intended, admin-only.
- No migration. Mobile builds do not call these routes.

## Rollback

Revert the PR; rows written in the meantime keep their later end (correct for the shop).

# Plan
1. Test first: `tests/admin-subscription-actions.test.ts` for `subscriptionActions(status)` + page wiring (resume via `subscriptionsApi.resume`, no raw fetch).
2. `apps/admin/app/subscriptions/[id]/subscription-actions.ts`; page uses it, adds Resume button + dialog branch.
3. Verify: jest under both TZ, tsc admin, lint, headed browser e2e (suspend → resume → ACTIVE; TRIAL → cancel).

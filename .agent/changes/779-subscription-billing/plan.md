# Plan

1. Failing tests: `tests/packages/utils/subscription-renewal-pricing.test.ts` (spec 1-3, both TZ), `tests/api/subscription-renew-route.test.ts` (spec 4).
2. utils: spec 1-3. Export from the core index.
3. database: spec 5 and 7 (`packages/database/src/subscription.ts`).
4. API: renew (spec 4), extend + calculate (spec 6).
5. UI: spec 8 (`packages/ui/src/components/features/Subscriptions/components/*`).
6. `.agent/api-changes/LOG.md` row. Verify: jest both TZ, tsc (no new errors on changed lines), `turbo build --filter=@rentalshop/api... --filter=@rentalshop/admin...`, local API + admin check on the seeded clone.

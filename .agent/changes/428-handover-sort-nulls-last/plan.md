# Plan — hand-over date sort puts NULLs last

Issue: #428 · Status: approved · Spec: ./spec.md

## Root cause

`findManyLightweight` in `packages/database/src/order.ts` builds `orderBy: { [sortBy]: sortOrder }`.
PostgreSQL puts NULLs first for `DESC`, so orders without `pickupPlanAt` lead the list.

## Steps

1. Test first (`tests/api/orders-sort-pickup-nulls-last.test.ts`), committed red: the Prisma
   `orderBy` for `pickupPlanAt`/`returnPlanAt` is `{ sort, nulls: 'last' }` in both directions;
   `createdAt` stays plain; the merchant filter is still applied.
2. Fix: `orderListOrderBy(sortBy, sortOrder)` used by `findManyLightweight`.
3. Verify: `cd tests && npx jest api/`, `tsc` on apps/api, eslint on the changed file.

## Files

- `packages/database/src/order.ts`
- `tests/api/orders-sort-pickup-nulls-last.test.ts` (new)

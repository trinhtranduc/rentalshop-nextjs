# Plan

1. Write `tests/helpers/fake-order-store.ts`, an in-memory Prisma `order` and `db` facade.
2. Write `tests/api-compat/overview-scenarios.ts` (the orders and the scenarios) and `load-overview-modules.ts`.
3. Write `generate-golden.ts` and use it to record `golden/overview-before-492.json` from 852bd196^.
4. Write `overview-api-compat.test.ts`.
5. Fix `tests/packages/database/outlet-operations.test.ts` and add tests for the collateral queries.

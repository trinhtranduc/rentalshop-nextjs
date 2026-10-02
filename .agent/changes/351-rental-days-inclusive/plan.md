# Plan — inclusive rental days

Issue: #351 · Status: accepted · Spec: ./spec.md

## Steps

1. Failing test `tests/packages/utils/rental-days.test.ts` (`bug-fix-tdd`, `timezone-dates`).
2. `packages/utils/src/core/rental-days.ts` → `countRentalDays`; export from `core/index.ts`.
3. `pricing-calculator.ts` DAILY branch → `countRentalDays`; update the DAILY expectations in `packages/utils/src/__tests__`.
4. `apps/api/app/api/orders/route.ts` DAILY fallback → `countRentalDays`.
5. `packages/ui` CreateOrderForm: `useCreateOrderForm`, `useOrderValidation`, `OrderSummarySection`, `OrderPreviewForm`.

## Verify

Jest under both TZ; `npx tsc` for api and client; API build; localhost create-order with a per-day item.

## Rollback

Revert the commit; no schema change.

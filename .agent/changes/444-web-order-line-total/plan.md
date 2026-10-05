# Plan — Web order form: line total follows the line's own pricing type

Issue: #444 · Status: approved · Spec: ./spec.md

## Steps

1. Extract the line pricing rules from `useCreateOrderForm.ts` and `ProductsSection.tsx` into a pure
   helper `packages/utils/src/core/order-line-pricing.ts`, behavior unchanged (refactor commit).
2. Failing test `tests/order-form-line-pricing.test.ts` (FIXED line on a DAILY product, DAILY line, SALE,
   display == saved total, RENT/SALE switch price). Commit alone.
3. Fix the helper: line type wins; the display total uses `computeOrderLineTotal`; the order-type unit price
   uses the selected option. Wire the hook's order-type effect and the row toggle to the helper.
4. Verify: `cd tests && yarn test order-form-line-pricing`, `npx tsc --noEmit -p packages/ui/tsconfig.json`,
   `npx tsc --noEmit -p apps/client/tsconfig.json`, eslint on changed files.

## Files

- `packages/utils/src/core/order-line-pricing.ts` — new pure helper
- `packages/utils/src/core/index.ts` — export it
- `packages/ui/src/components/forms/CreateOrderForm/hooks/useCreateOrderForm.ts` — use the helper; fix the RENT/SALE switch
- `packages/ui/src/components/forms/CreateOrderForm/components/ProductsSection.tsx` — use the helper for display and toggle
- `tests/order-form-line-pricing.test.ts` — regression test

## Risks

- Saved totals change only where display and save disagreed (a line toggled to DAILY with no DAILY option
  used to save a FIXED total while showing per day). Now both use the line's type.

## Rollback

Revert the PR. No data or schema change.

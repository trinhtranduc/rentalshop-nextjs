# Plan — #359

Issue: #359 · Status: accepted · Spec: ./spec.md

1. Failing tests, committed alone.
2. `apps/api/app/api/products/[id]/route.ts` PUT: build `outletStock.upsert` from the existing rows
   (`existingProduct.outletStock`), reject `stock < renting`.
3. `packages/database/src/order.ts` `updateOrder`: load the products of the new items once, add the snapshot
   fields to the `oldOrder` select, set them on each created item.
4. `STOCK_BELOW_RENTED`: `ERROR_MESSAGES` in `packages/utils/src/api/response-builder.ts` and `locales/*/errors.json`.
5. Eval case `.agent/evals/cases/359-product-edit-keeps-renting.md`.
6. Verify: the two tests, the tests suite, `tsc` for api, build. PR to `main-real` (`Fixes #359`), back up the
   production DB before merge, then merge `main-real` back into `dev`.

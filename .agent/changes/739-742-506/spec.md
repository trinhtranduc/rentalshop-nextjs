# Spec — #739, #742, #506

1. #739: `findByIdDetail` (GET `/api/orders/:id`, qr-code) and `findByIdOptimized` filter `deletedAt: null`. `findById` (PUT, DELETE, status, revert, restore) already did. `history` / `changes` read the audit log and stay open for a deleted order (the log records the deletion).
2. #742: `normalizeBarcode` (blank or whitespace -> NULL, real value untouched) in `packages/database/src/product.ts` for `createProduct`, `updateProduct`, `simplifiedProducts.create/update`. Bulk import already stored NULL. Migration `20261010100000_product_blank_barcode_to_null`: `UPDATE "Product" SET "barcode" = NULL WHERE btrim("barcode") = ''` (data only).
3. #506: `computeTopCustomers` (period report) and `GET /api/analytics/top-customers` sum `getOrderRevenueEvents(withoutCollateral(order))`. Whether an order takes part in the period is still decided by the full events.
4. Tests: `BF-OVR-04` plain test; `BF-FIX-01..06` in `tests/e2e/business/small-fixes.e2e.test.js`; web `KNOWN` entries removed.

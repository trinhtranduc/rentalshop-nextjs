# Spec — #629

- `prisma/schema.prisma`, model `Product`: `barcode String?` (no `@unique`), add `@@unique([merchantId, barcode])`,
  keep `@@index([barcode])`.
- Migration `<ts>_product_barcode_unique_per_merchant`: `DROP INDEX "Product_barcode_key"` (from the baseline),
  `CREATE UNIQUE INDEX "Product_merchantId_barcode_key" ON "Product"("merchantId", "barcode")`.
  NULL barcodes stay allowed many times (Postgres treats NULLs as distinct).
- `POST /api/products`: unchanged code. A same-shop duplicate still raises P2002 → 409 `DUPLICATE_ENTRY`
  (`packages/utils/src/core/errors.ts`, target `merchantId` matches no special case).
- No code looks a product up by barcode with `findUnique`; `getProductByBarcode` and bulk import already filter by merchant.

## Acceptance
Business e2e BF-PROD-07: main merchant creates barcode X → 200; other merchant creates X → 200; main merchant X again → 409 `DUPLICATE_ENTRY`.

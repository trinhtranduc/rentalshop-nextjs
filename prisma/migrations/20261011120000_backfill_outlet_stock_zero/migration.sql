-- #824 (owner, #823): every product shows at every branch, with 0 in stock where nothing was entered.
-- DATA migration, run once: add an OutletStock row (stock 0, available 0, renting 0) for every pair of
-- (non-deleted product, active outlet of the same merchant) that has no row yet. Existing rows are never touched.
-- No schema change. Idempotent: the unique (productId, outletId) makes a second run insert nothing.
-- New outlets get the same rows when they are created (db.outlets.create).
INSERT INTO "public"."OutletStock" ("productId", "outletId", "stock", "available", "renting", "createdAt", "updatedAt")
SELECT p."id", o."id", 0, 0, 0, NOW(), NOW()
FROM "public"."Product" p
JOIN "public"."Outlet" o ON o."merchantId" = p."merchantId"
WHERE p."deletedAt" IS NULL
  AND o."isActive" = true
ON CONFLICT ("productId", "outletId") DO NOTHING;

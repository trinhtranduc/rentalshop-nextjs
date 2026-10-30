-- #1341 (#1335) "Hiện ở chi nhánh": OutletStock.isListed says whether a branch sells a product (product list, order picker).
-- Structure: additive and idempotent. The column has a default, so code from before this migration keeps working
-- (a row it creates is listed, as every product was listed everywhere before).
ALTER TABLE "public"."OutletStock" ADD COLUMN IF NOT EXISTS "isListed" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX IF NOT EXISTS "OutletStock_outletId_isListed_idx" ON "public"."OutletStock"("outletId", "isListed");

-- Backfill (data). Since #825 every product has a row at every active branch (0 where the branch never stocked it),
-- so a branch that does not sell a product shows up as a 0 / 0 row that never had an order. Two set-based statements,
-- no loop; they touch at most the OutletStock rows with stock = 0 and renting = 0, and rows of products that are
-- soft deleted (deletedAt) are left alone.
--
-- 1. Unlist a row when stock = 0, renting = 0 and the branch has never had an order line of that product
--    (OrderItem -> Order.outletId). Listed stays true for stock <> 0, renting <> 0, or any order history.
UPDATE "public"."OutletStock" os
SET "isListed" = false
FROM "public"."Product" p
WHERE p."id" = os."productId"
  AND p."deletedAt" IS NULL
  AND os."isListed" = true
  AND os."stock" = 0
  AND os."renting" = 0
  AND NOT EXISTS (
    SELECT 1
    FROM "public"."OrderItem" oi
    JOIN "public"."Order" o ON o."id" = oi."orderId"
    WHERE oi."productId" = os."productId"
      AND o."outletId" = os."outletId"
  );

-- 2. Every product that is not deleted keeps at least one listed branch: when step 1 left none, list the row with the
--    smallest id (the branch that created the product: the rows the creator sent were written before the zero rows).
UPDATE "public"."OutletStock" os
SET "isListed" = true
WHERE os."id" IN (
  SELECT MIN(s."id")
  FROM "public"."OutletStock" s
  JOIN "public"."Product" p ON p."id" = s."productId" AND p."deletedAt" IS NULL
  GROUP BY s."productId"
  HAVING NOT bool_or(s."isListed")
);

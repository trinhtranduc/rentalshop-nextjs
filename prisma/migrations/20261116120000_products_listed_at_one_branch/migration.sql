-- #1603 every product is shown at one open branch at least ("Hiện ở chi nhánh", OutletStock.isListed).
-- Data only, one set-based statement, idempotent; no schema change.
-- A product that is not deleted and has no listed row at an open branch (isActive) gets its row at the shop's default
-- open branch listed (else the shop's open branch with the smallest id). The row is inserted (stock 0) when the product
-- has none there. Products listed at an open branch, deleted products and shops without an open branch are untouched.
-- A second run finds nothing to do.
WITH "target" AS (
  SELECT
    p."id" AS "productId",
    COALESCE(
      (SELECT o."id" FROM "public"."Outlet" o
        WHERE o."merchantId" = p."merchantId" AND o."isActive" = true AND o."isDefault" = true
        ORDER BY o."id" LIMIT 1),
      (SELECT o."id" FROM "public"."Outlet" o
        WHERE o."merchantId" = p."merchantId" AND o."isActive" = true
        ORDER BY o."id" LIMIT 1)
    ) AS "outletId"
  FROM "public"."Product" p
  WHERE p."deletedAt" IS NULL
    AND NOT EXISTS (
      SELECT 1
      FROM "public"."OutletStock" s
      JOIN "public"."Outlet" o ON o."id" = s."outletId"
      WHERE s."productId" = p."id"
        AND s."isListed" = true
        AND o."isActive" = true
    )
)
INSERT INTO "public"."OutletStock" ("productId", "outletId", "stock", "available", "renting", "isListed", "createdAt", "updatedAt")
SELECT t."productId", t."outletId", 0, 0, 0, true, now(), now()
FROM "target" t
WHERE t."outletId" IS NOT NULL
ON CONFLICT ("productId", "outletId") DO UPDATE SET "isListed" = true, "updatedAt" = now();

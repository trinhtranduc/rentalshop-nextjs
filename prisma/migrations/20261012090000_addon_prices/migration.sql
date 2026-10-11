-- #850: add-on price list (admin) and priced add-ons per shop. Additive: one new table, nullable / defaulted columns.
-- Old code keeps working on this schema: the limit check still sums the five columns of PlanLimitAddon.

-- AlterTable
ALTER TABLE "public"."PlanLimitAddon" ADD COLUMN     "addonPriceId" INTEGER,
ADD COLUMN     "endedAt" TIMESTAMP(3),
ADD COLUMN     "endsAt" TIMESTAMP(3),
ADD COLUMN     "limitKind" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "packSize" INTEGER,
ADD COLUMN     "packs" INTEGER,
ADD COLUMN     "removeAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "unitPrice" INTEGER;

-- CreateTable
CREATE TABLE "public"."AddonPrice" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "limitKind" TEXT NOT NULL,
    "packSize" INTEGER NOT NULL,
    "monthlyPrice" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddonPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AddonPrice_isActive_sortOrder_idx" ON "public"."AddonPrice"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "AddonPrice_limitKind_idx" ON "public"."AddonPrice"("limitKind");

-- CreateIndex
CREATE INDEX "PlanLimitAddon_addonPriceId_idx" ON "public"."PlanLimitAddon"("addonPriceId");

-- AddForeignKey
ALTER TABLE "public"."PlanLimitAddon" ADD CONSTRAINT "PlanLimitAddon_addonPriceId_fkey" FOREIGN KEY ("addonPriceId") REFERENCES "public"."AddonPrice"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- DATA (#850, one limit kind per add-on item, owner 2026-10-11 on #782):
-- an ACTIVE old add-on that bundles several kinds is split into one row per kind. The original row keeps its first
-- non-zero kind (outlets, users, products, customers, orders); a new row is inserted for each other kind with the same
-- merchant, notes and createdAt. Column sums per shop do not change, so every shop keeps exactly today's limits.
-- Inactive rows are history and are not touched. Works for zero rows.
INSERT INTO "public"."PlanLimitAddon" ("merchantId", "users", "notes", "isActive", "createdAt", "updatedAt")
SELECT "merchantId", "users", "notes", true, "createdAt", CURRENT_TIMESTAMP FROM "public"."PlanLimitAddon"
WHERE "isActive" = true AND "users" > 0 AND "outlets" > 0;
UPDATE "public"."PlanLimitAddon" SET "users" = 0, "updatedAt" = CURRENT_TIMESTAMP
WHERE "isActive" = true AND "users" > 0 AND "outlets" > 0;

INSERT INTO "public"."PlanLimitAddon" ("merchantId", "products", "notes", "isActive", "createdAt", "updatedAt")
SELECT "merchantId", "products", "notes", true, "createdAt", CURRENT_TIMESTAMP FROM "public"."PlanLimitAddon"
WHERE "isActive" = true AND "products" > 0 AND ("outlets" > 0 OR "users" > 0);
UPDATE "public"."PlanLimitAddon" SET "products" = 0, "updatedAt" = CURRENT_TIMESTAMP
WHERE "isActive" = true AND "products" > 0 AND ("outlets" > 0 OR "users" > 0);

INSERT INTO "public"."PlanLimitAddon" ("merchantId", "customers", "notes", "isActive", "createdAt", "updatedAt")
SELECT "merchantId", "customers", "notes", true, "createdAt", CURRENT_TIMESTAMP FROM "public"."PlanLimitAddon"
WHERE "isActive" = true AND "customers" > 0 AND ("outlets" > 0 OR "users" > 0 OR "products" > 0);
UPDATE "public"."PlanLimitAddon" SET "customers" = 0, "updatedAt" = CURRENT_TIMESTAMP
WHERE "isActive" = true AND "customers" > 0 AND ("outlets" > 0 OR "users" > 0 OR "products" > 0);

INSERT INTO "public"."PlanLimitAddon" ("merchantId", "orders", "notes", "isActive", "createdAt", "updatedAt")
SELECT "merchantId", "orders", "notes", true, "createdAt", CURRENT_TIMESTAMP FROM "public"."PlanLimitAddon"
WHERE "isActive" = true AND "orders" > 0 AND ("outlets" > 0 OR "users" > 0 OR "products" > 0 OR "customers" > 0);
UPDATE "public"."PlanLimitAddon" SET "orders" = 0, "updatedAt" = CURRENT_TIMESTAMP
WHERE "isActive" = true AND "orders" > 0 AND ("outlets" > 0 OR "users" > 0 OR "products" > 0 OR "customers" > 0);

-- Every active single-kind old row gets its kind, packSize = the amount, packs = 1. unitPrice stays NULL (old, free).
UPDATE "public"."PlanLimitAddon" SET
  "limitKind" = CASE WHEN "outlets" > 0 THEN 'outlets' WHEN "users" > 0 THEN 'users' WHEN "products" > 0 THEN 'products'
                     WHEN "customers" > 0 THEN 'customers' ELSE 'orders' END,
  "packSize" = GREATEST("outlets", "users", "products", "customers", "orders"),
  "packs" = 1
WHERE "isActive" = true AND "limitKind" IS NULL
  AND ((CASE WHEN "outlets" > 0 THEN 1 ELSE 0 END) + (CASE WHEN "users" > 0 THEN 1 ELSE 0 END)
     + (CASE WHEN "products" > 0 THEN 1 ELSE 0 END) + (CASE WHEN "customers" > 0 THEN 1 ELSE 0 END)
     + (CASE WHEN "orders" > 0 THEN 1 ELSE 0 END)) = 1;

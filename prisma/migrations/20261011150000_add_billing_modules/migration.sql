-- #782: add-ons (quantity) and modules (feature) in one catalog, a VND price each, for the whole shop.
-- Additive: two new tables. Old code keeps working on this schema (PlanLimitAddon stays and is not touched).

-- CreateTable
CREATE TABLE "public"."BillingModule" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'quantity',
    "featureKey" TEXT,
    "limits" JSONB,
    "monthlyPrice" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MerchantModule" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "moduleId" INTEGER,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'quantity',
    "featureKey" TEXT,
    "limits" JSONB,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "removeAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantModule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BillingModule_isActive_sortOrder_idx" ON "public"."BillingModule"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "MerchantModule_merchantId_isActive_idx" ON "public"."MerchantModule"("merchantId", "isActive");

-- CreateIndex
CREATE INDEX "MerchantModule_moduleId_idx" ON "public"."MerchantModule"("moduleId");

-- AddForeignKey
ALTER TABLE "public"."MerchantModule" ADD CONSTRAINT "MerchantModule_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "public"."Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MerchantModule" ADD CONSTRAINT "MerchantModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "public"."BillingModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- DATA migration: every active PlanLimitAddon becomes one add-on row at price 0 with the same limits,
-- so the plan limit + add-ons of every shop stays exactly what it is today. Nothing is charged automatically.
INSERT INTO "public"."MerchantModule" ("merchantId", "name", "kind", "limits", "quantity", "unitPrice", "isActive", "createdAt", "updatedAt")
SELECT
    a."merchantId",
    'Addon (cũ)',
    'quantity',
    jsonb_strip_nulls(jsonb_build_object(
        'outlets', NULLIF(a."outlets", 0),
        'users', NULLIF(a."users", 0),
        'products', NULLIF(a."products", 0),
        'customers', NULLIF(a."customers", 0),
        'orders', NULLIF(a."orders", 0)
    )),
    1,
    0,
    true,
    a."createdAt",
    CURRENT_TIMESTAMP
FROM "public"."PlanLimitAddon" a
WHERE a."isActive" = true
  AND (a."outlets" > 0 OR a."users" > 0 OR a."products" > 0 OR a."customers" > 0 OR a."orders" > 0);

/*
  Warnings:

  - You are about to drop the `AuditLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BillingCycle` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MerchantSetting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OutletSetting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SystemSetting` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserPreference` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `billingCycleId` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `billingCycleId` on the `Subscription` table. All the data in the column will be lost.
  - Added the required column `basePrice` to the `Plan` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "AuditLog_outletId_createdAt_idx";

-- DropIndex
DROP INDEX "AuditLog_merchantId_createdAt_idx";

-- DropIndex
DROP INDEX "AuditLog_userId_createdAt_idx";

-- DropIndex
DROP INDEX "AuditLog_action_entityType_idx";

-- DropIndex
DROP INDEX "AuditLog_publicId_idx";

-- DropIndex
DROP INDEX "AuditLog_createdAt_idx";

-- DropIndex
DROP INDEX "AuditLog_category_idx";

-- DropIndex
DROP INDEX "AuditLog_severity_idx";

-- DropIndex
DROP INDEX "AuditLog_outletId_idx";

-- DropIndex
DROP INDEX "AuditLog_merchantId_idx";

-- DropIndex
DROP INDEX "AuditLog_userId_idx";

-- DropIndex
DROP INDEX "AuditLog_entityId_idx";

-- DropIndex
DROP INDEX "AuditLog_entityType_idx";

-- DropIndex
DROP INDEX "AuditLog_action_idx";

-- DropIndex
DROP INDEX "AuditLog_publicId_key";

-- DropIndex
DROP INDEX "BillingCycle_value_idx";

-- DropIndex
DROP INDEX "BillingCycle_sortOrder_idx";

-- DropIndex
DROP INDEX "BillingCycle_isActive_idx";

-- DropIndex
DROP INDEX "BillingCycle_publicId_idx";

-- DropIndex
DROP INDEX "BillingCycle_value_key";

-- DropIndex
DROP INDEX "BillingCycle_name_key";

-- DropIndex
DROP INDEX "BillingCycle_publicId_key";

-- DropIndex
DROP INDEX "MerchantSetting_merchantId_key_key";

-- DropIndex
DROP INDEX "MerchantSetting_isActive_idx";

-- DropIndex
DROP INDEX "MerchantSetting_publicId_idx";

-- DropIndex
DROP INDEX "MerchantSetting_category_idx";

-- DropIndex
DROP INDEX "MerchantSetting_key_idx";

-- DropIndex
DROP INDEX "MerchantSetting_merchantId_idx";

-- DropIndex
DROP INDEX "MerchantSetting_publicId_key";

-- DropIndex
DROP INDEX "OutletSetting_outletId_key_key";

-- DropIndex
DROP INDEX "OutletSetting_isActive_idx";

-- DropIndex
DROP INDEX "OutletSetting_publicId_idx";

-- DropIndex
DROP INDEX "OutletSetting_category_idx";

-- DropIndex
DROP INDEX "OutletSetting_key_idx";

-- DropIndex
DROP INDEX "OutletSetting_outletId_idx";

-- DropIndex
DROP INDEX "OutletSetting_publicId_key";

-- DropIndex
DROP INDEX "SystemSetting_isActive_idx";

-- DropIndex
DROP INDEX "SystemSetting_publicId_idx";

-- DropIndex
DROP INDEX "SystemSetting_category_idx";

-- DropIndex
DROP INDEX "SystemSetting_key_idx";

-- DropIndex
DROP INDEX "SystemSetting_key_key";

-- DropIndex
DROP INDEX "SystemSetting_publicId_key";

-- DropIndex
DROP INDEX "UserPreference_userId_key_key";

-- DropIndex
DROP INDEX "UserPreference_isActive_idx";

-- DropIndex
DROP INDEX "UserPreference_publicId_idx";

-- DropIndex
DROP INDEX "UserPreference_category_idx";

-- DropIndex
DROP INDEX "UserPreference_key_idx";

-- DropIndex
DROP INDEX "UserPreference_userId_idx";

-- DropIndex
DROP INDEX "UserPreference_publicId_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "AuditLog";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "BillingCycle";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "MerchantSetting";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "OutletSetting";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "SystemSetting";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "UserPreference";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "PlanVariant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" INTEGER NOT NULL,
    "planId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "price" REAL NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "savings" REAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "PlanVariant_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "basePrice" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "trialDays" INTEGER NOT NULL DEFAULT 0,
    "maxOutlets" INTEGER NOT NULL DEFAULT -1,
    "maxUsers" INTEGER NOT NULL DEFAULT -1,
    "maxProducts" INTEGER NOT NULL DEFAULT -1,
    "maxCustomers" INTEGER NOT NULL DEFAULT -1,
    "features" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);
-- Migrate data: copy price to basePrice
INSERT INTO "new_Plan" ("createdAt", "currency", "description", "features", "id", "isActive", "isPopular", "maxCustomers", "maxOutlets", "maxProducts", "maxUsers", "name", "publicId", "sortOrder", "trialDays", "updatedAt", "basePrice") 
SELECT "createdAt", "currency", "description", "features", "id", "isActive", "isPopular", "maxCustomers", "maxOutlets", "maxProducts", "maxUsers", "name", "publicId", "sortOrder", "trialDays", "updatedAt", "price" FROM "Plan";
DROP TABLE "Plan";
ALTER TABLE "new_Plan" RENAME TO "Plan";
CREATE UNIQUE INDEX "Plan_publicId_key" ON "Plan"("publicId");
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");
CREATE INDEX "Plan_publicId_idx" ON "Plan"("publicId");
CREATE INDEX "Plan_isActive_idx" ON "Plan"("isActive");
CREATE INDEX "Plan_sortOrder_idx" ON "Plan"("sortOrder");
CREATE INDEX "Plan_deletedAt_idx" ON "Plan"("deletedAt");
CREATE TABLE "new_Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" INTEGER NOT NULL,
    "merchantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "planVariantId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "trialEndDate" DATETIME,
    "nextBillingDate" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "cancelledAt" DATETIME,
    "cancellationReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subscription_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Subscription_planVariantId_fkey" FOREIGN KEY ("planVariantId") REFERENCES "PlanVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Subscription" ("amount", "autoRenew", "cancellationReason", "cancelledAt", "createdAt", "currency", "endDate", "id", "merchantId", "nextBillingDate", "planId", "publicId", "startDate", "status", "trialEndDate", "updatedAt") SELECT "amount", "autoRenew", "cancellationReason", "cancelledAt", "createdAt", "currency", "endDate", "id", "merchantId", "nextBillingDate", "planId", "publicId", "startDate", "status", "trialEndDate", "updatedAt" FROM "Subscription";
DROP TABLE "Subscription";
ALTER TABLE "new_Subscription" RENAME TO "Subscription";
CREATE UNIQUE INDEX "Subscription_publicId_key" ON "Subscription"("publicId");
CREATE INDEX "Subscription_merchantId_idx" ON "Subscription"("merchantId");
CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");
CREATE INDEX "Subscription_planVariantId_idx" ON "Subscription"("planVariantId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX "Subscription_publicId_idx" ON "Subscription"("publicId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PlanVariant_publicId_key" ON "PlanVariant"("publicId");

-- CreateIndex
CREATE INDEX "PlanVariant_planId_idx" ON "PlanVariant"("planId");

-- CreateIndex
CREATE INDEX "PlanVariant_isActive_idx" ON "PlanVariant"("isActive");

-- CreateIndex
CREATE INDEX "PlanVariant_sortOrder_idx" ON "PlanVariant"("sortOrder");

-- CreateIndex
CREATE INDEX "PlanVariant_publicId_idx" ON "PlanVariant"("publicId");

-- CreateIndex
CREATE INDEX "PlanVariant_deletedAt_idx" ON "PlanVariant"("deletedAt");

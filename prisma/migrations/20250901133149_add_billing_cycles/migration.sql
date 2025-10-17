/*
  Warnings:

  - You are about to drop the column `subscriptionPlan` on the `Merchant` table. All the data in the column will be lost.
  - You are about to drop the column `billingCycle` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `billingCycle` on the `Subscription` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "BillingCycle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "months" INTEGER NOT NULL,
    "discount" REAL NOT NULL DEFAULT 0,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Merchant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "description" TEXT,
    "planId" TEXT,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'trial',
    "trialEndsAt" DATETIME,
    "totalRevenue" REAL NOT NULL DEFAULT 0,
    "lastActiveAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Merchant_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Merchant" ("createdAt", "description", "email", "id", "isActive", "lastActiveAt", "name", "phone", "publicId", "subscriptionStatus", "totalRevenue", "trialEndsAt", "updatedAt") SELECT "createdAt", "description", "email", "id", "isActive", "lastActiveAt", "name", "phone", "publicId", "subscriptionStatus", "totalRevenue", "trialEndsAt", "updatedAt" FROM "Merchant";
DROP TABLE "Merchant";
ALTER TABLE "new_Merchant" RENAME TO "Merchant";
CREATE UNIQUE INDEX "Merchant_publicId_key" ON "Merchant"("publicId");
CREATE UNIQUE INDEX "Merchant_email_key" ON "Merchant"("email");
CREATE INDEX "Merchant_name_idx" ON "Merchant"("name");
CREATE INDEX "Merchant_email_idx" ON "Merchant"("email");
CREATE INDEX "Merchant_publicId_idx" ON "Merchant"("publicId");
CREATE INDEX "Merchant_planId_idx" ON "Merchant"("planId");
CREATE INDEX "Merchant_subscriptionStatus_idx" ON "Merchant"("subscriptionStatus");
CREATE TABLE "new_Plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" REAL NOT NULL,
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
    "billingCycleId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Plan_billingCycleId_fkey" FOREIGN KEY ("billingCycleId") REFERENCES "BillingCycle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Plan" ("createdAt", "currency", "description", "features", "id", "isActive", "isPopular", "maxCustomers", "maxOutlets", "maxProducts", "maxUsers", "name", "price", "publicId", "sortOrder", "trialDays", "updatedAt") SELECT "createdAt", "currency", "description", "features", "id", "isActive", "isPopular", "maxCustomers", "maxOutlets", "maxProducts", "maxUsers", "name", "price", "publicId", "sortOrder", "trialDays", "updatedAt" FROM "Plan";
DROP TABLE "Plan";
ALTER TABLE "new_Plan" RENAME TO "Plan";
CREATE UNIQUE INDEX "Plan_publicId_key" ON "Plan"("publicId");
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");
CREATE INDEX "Plan_publicId_idx" ON "Plan"("publicId");
CREATE INDEX "Plan_isActive_idx" ON "Plan"("isActive");
CREATE INDEX "Plan_sortOrder_idx" ON "Plan"("sortOrder");
CREATE INDEX "Plan_billingCycleId_idx" ON "Plan"("billingCycleId");
CREATE TABLE "new_Subscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" INTEGER NOT NULL,
    "merchantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME,
    "trialEndDate" DATETIME,
    "nextBillingDate" DATETIME NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "billingCycleId" TEXT,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "cancelledAt" DATETIME,
    "cancellationReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subscription_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Subscription_billingCycleId_fkey" FOREIGN KEY ("billingCycleId") REFERENCES "BillingCycle" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Subscription" ("amount", "autoRenew", "cancellationReason", "cancelledAt", "createdAt", "currency", "endDate", "id", "merchantId", "nextBillingDate", "planId", "publicId", "startDate", "status", "trialEndDate", "updatedAt") SELECT "amount", "autoRenew", "cancellationReason", "cancelledAt", "createdAt", "currency", "endDate", "id", "merchantId", "nextBillingDate", "planId", "publicId", "startDate", "status", "trialEndDate", "updatedAt" FROM "Subscription";
DROP TABLE "Subscription";
ALTER TABLE "new_Subscription" RENAME TO "Subscription";
CREATE UNIQUE INDEX "Subscription_publicId_key" ON "Subscription"("publicId");
CREATE INDEX "Subscription_merchantId_idx" ON "Subscription"("merchantId");
CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX "Subscription_publicId_idx" ON "Subscription"("publicId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "BillingCycle_publicId_key" ON "BillingCycle"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingCycle_name_key" ON "BillingCycle"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BillingCycle_value_key" ON "BillingCycle"("value");

-- CreateIndex
CREATE INDEX "BillingCycle_publicId_idx" ON "BillingCycle"("publicId");

-- CreateIndex
CREATE INDEX "BillingCycle_isActive_idx" ON "BillingCycle"("isActive");

-- CreateIndex
CREATE INDEX "BillingCycle_sortOrder_idx" ON "BillingCycle"("sortOrder");

-- CreateIndex
CREATE INDEX "BillingCycle_value_idx" ON "BillingCycle"("value");

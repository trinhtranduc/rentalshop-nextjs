/*
  Warnings:

  - You are about to drop the `PlanVariant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SubscriptionPayment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `trialEndsAt` on the `Merchant` table. All the data in the column will be lost.
  - You are about to drop the column `mobileOnly` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `autoRenew` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `billingCycle` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `cancellationReason` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `cancelledAt` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `changeReason` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `changedBy` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `nextBillingDate` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `planVariantId` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `trialEndDate` on the `Subscription` table. All the data in the column will be lost.
  - Added the required column `currentPeriodEnd` to the `Subscription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `currentPeriodStart` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "PlanVariant_deletedAt_idx";

-- DropIndex
DROP INDEX "PlanVariant_publicId_idx";

-- DropIndex
DROP INDEX "PlanVariant_sortOrder_idx";

-- DropIndex
DROP INDEX "PlanVariant_isActive_idx";

-- DropIndex
DROP INDEX "PlanVariant_planId_idx";

-- DropIndex
DROP INDEX "PlanVariant_publicId_key";

-- DropIndex
DROP INDEX "SubscriptionPayment_publicId_idx";

-- DropIndex
DROP INDEX "SubscriptionPayment_status_idx";

-- DropIndex
DROP INDEX "SubscriptionPayment_subscriptionId_idx";

-- DropIndex
DROP INDEX "SubscriptionPayment_publicId_key";

-- AlterTable
ALTER TABLE "Outlet" ADD COLUMN "city" TEXT;
ALTER TABLE "Outlet" ADD COLUMN "country" TEXT;
ALTER TABLE "Outlet" ADD COLUMN "state" TEXT;
ALTER TABLE "Outlet" ADD COLUMN "zipCode" TEXT;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "PlanVariant";
PRAGMA foreign_keys=on;

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "SubscriptionPayment";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Merchant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "country" TEXT,
    "businessType" TEXT,
    "taxId" TEXT,
    "website" TEXT,
    "description" TEXT,
    "planId" TEXT,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'trial',
    "totalRevenue" REAL NOT NULL DEFAULT 0,
    "lastActiveAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Merchant_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Merchant" ("address", "createdAt", "description", "email", "id", "isActive", "lastActiveAt", "name", "phone", "planId", "publicId", "subscriptionStatus", "totalRevenue", "updatedAt") SELECT "address", "createdAt", "description", "email", "id", "isActive", "lastActiveAt", "name", "phone", "planId", "publicId", "subscriptionStatus", "totalRevenue", "updatedAt" FROM "Merchant";
DROP TABLE "Merchant";
ALTER TABLE "new_Merchant" RENAME TO "Merchant";
CREATE UNIQUE INDEX "Merchant_publicId_key" ON "Merchant"("publicId");
CREATE UNIQUE INDEX "Merchant_email_key" ON "Merchant"("email");
CREATE INDEX "Merchant_name_idx" ON "Merchant"("name");
CREATE INDEX "Merchant_email_idx" ON "Merchant"("email");
CREATE INDEX "Merchant_publicId_idx" ON "Merchant"("publicId");
CREATE INDEX "Merchant_planId_idx" ON "Merchant"("planId");
CREATE INDEX "Merchant_subscriptionStatus_idx" ON "Merchant"("subscriptionStatus");
CREATE TABLE "new_Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "method" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "transactionId" TEXT,
    "invoiceNumber" TEXT,
    "description" TEXT,
    "notes" TEXT,
    "failureReason" TEXT,
    "metadata" TEXT,
    "processedAt" DATETIME,
    "processedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "orderId" TEXT,
    "subscriptionId" TEXT,
    "merchantId" TEXT,
    CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("amount", "createdAt", "id", "merchantId", "method", "notes", "orderId", "processedAt", "processedBy", "publicId", "reference", "status", "subscriptionId", "type", "updatedAt") SELECT "amount", "createdAt", "id", "merchantId", "method", "notes", "orderId", "processedAt", "processedBy", "publicId", "reference", "status", "subscriptionId", "type", "updatedAt" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE UNIQUE INDEX "Payment_publicId_key" ON "Payment"("publicId");
CREATE INDEX "Payment_orderId_status_idx" ON "Payment"("orderId", "status");
CREATE INDEX "Payment_subscriptionId_status_idx" ON "Payment"("subscriptionId", "status");
CREATE INDEX "Payment_merchantId_status_idx" ON "Payment"("merchantId", "status");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_type_idx" ON "Payment"("type");
CREATE INDEX "Payment_method_idx" ON "Payment"("method");
CREATE INDEX "Payment_currency_idx" ON "Payment"("currency");
CREATE TABLE "new_Plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "basePrice" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "trialDays" INTEGER NOT NULL DEFAULT 14,
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
INSERT INTO "new_Plan" ("basePrice", "createdAt", "currency", "deletedAt", "description", "features", "id", "isActive", "isPopular", "maxCustomers", "maxOutlets", "maxProducts", "maxUsers", "name", "publicId", "sortOrder", "trialDays", "updatedAt") SELECT "basePrice", "createdAt", "currency", "deletedAt", "description", "features", "id", "isActive", "isPopular", "maxCustomers", "maxOutlets", "maxProducts", "maxUsers", "name", "publicId", "sortOrder", "trialDays", "updatedAt" FROM "Plan";
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
    "status" TEXT NOT NULL DEFAULT 'trial',
    "currentPeriodStart" DATETIME NOT NULL,
    "currentPeriodEnd" DATETIME NOT NULL,
    "trialStart" DATETIME,
    "trialEnd" DATETIME,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" DATETIME,
    "cancelReason" TEXT,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "interval" TEXT NOT NULL DEFAULT 'month',
    "intervalCount" INTEGER NOT NULL DEFAULT 1,
    "period" INTEGER NOT NULL DEFAULT 1,
    "discount" REAL NOT NULL DEFAULT 0,
    "savings" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Subscription_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Subscription" ("amount", "createdAt", "currency", "id", "merchantId", "planId", "publicId", "status", "updatedAt") SELECT "amount", "createdAt", "currency", "id", "merchantId", "planId", "publicId", "status", "updatedAt" FROM "Subscription";
DROP TABLE "Subscription";
ALTER TABLE "new_Subscription" RENAME TO "Subscription";
CREATE UNIQUE INDEX "Subscription_publicId_key" ON "Subscription"("publicId");
CREATE UNIQUE INDEX "Subscription_merchantId_key" ON "Subscription"("merchantId");
CREATE INDEX "Subscription_merchantId_idx" ON "Subscription"("merchantId");
CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX "Subscription_publicId_idx" ON "Subscription"("publicId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

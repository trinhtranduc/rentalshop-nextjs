/*
  Warnings:

  - You are about to drop the column `suspendReason` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `suspendedAt` on the `Subscription` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Subscription_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Subscription" ("amount", "cancelAtPeriodEnd", "cancelReason", "canceledAt", "createdAt", "currency", "currentPeriodEnd", "currentPeriodStart", "discount", "id", "interval", "intervalCount", "merchantId", "period", "planId", "publicId", "savings", "status", "trialEnd", "trialStart", "updatedAt") SELECT "amount", "cancelAtPeriodEnd", "cancelReason", "canceledAt", "createdAt", "currency", "currentPeriodEnd", "currentPeriodStart", "discount", "id", "interval", "intervalCount", "merchantId", "period", "planId", "publicId", "savings", "status", "trialEnd", "trialStart", "updatedAt" FROM "Subscription";
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

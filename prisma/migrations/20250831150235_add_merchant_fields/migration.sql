/*
  Warnings:

  - Added the required column `email` to the `Merchant` table without a default value. This is not possible if the table is not empty.

*/
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
    "subscriptionPlan" TEXT NOT NULL DEFAULT 'Basic',
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'trial',
    "trialEndsAt" DATETIME,
    "totalRevenue" REAL NOT NULL DEFAULT 0,
    "lastActiveAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Merchant" ("createdAt", "description", "id", "isActive", "name", "publicId", "updatedAt", "email", "phone", "subscriptionPlan", "subscriptionStatus", "totalRevenue", "lastActiveAt") 
SELECT "createdAt", "description", "id", "isActive", "name", "publicId", "updatedAt", 
       'merchant' || "publicId" || '@example.com' as "email",
       '+1-555-0000' as "phone",
       'Basic' as "subscriptionPlan",
       'active' as "subscriptionStatus",
       0 as "totalRevenue",
       "updatedAt" as "lastActiveAt"
FROM "Merchant";
DROP TABLE "Merchant";
ALTER TABLE "new_Merchant" RENAME TO "Merchant";
CREATE UNIQUE INDEX "Merchant_publicId_key" ON "Merchant"("publicId");
CREATE UNIQUE INDEX "Merchant_email_key" ON "Merchant"("email");
CREATE INDEX "Merchant_name_idx" ON "Merchant"("name");
CREATE INDEX "Merchant_email_idx" ON "Merchant"("email");
CREATE INDEX "Merchant_publicId_idx" ON "Merchant"("publicId");
CREATE INDEX "Merchant_subscriptionPlan_idx" ON "Merchant"("subscriptionPlan");
CREATE INDEX "Merchant_subscriptionStatus_idx" ON "Merchant"("subscriptionStatus");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

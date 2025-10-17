/*
  Warnings:

  - Added the required column `type` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "notes" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "rentalDays" INTEGER;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "orderType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "totalAmount" REAL NOT NULL,
    "depositAmount" REAL NOT NULL DEFAULT 0,
    "securityDeposit" REAL NOT NULL DEFAULT 0,
    "damageFee" REAL NOT NULL DEFAULT 0,
    "lateFee" REAL NOT NULL DEFAULT 0,
    "pickupPlanAt" DATETIME,
    "returnPlanAt" DATETIME,
    "pickedUpAt" DATETIME,
    "returnedAt" DATETIME,
    "rentalDuration" INTEGER,
    "collateralType" TEXT,
    "collateralDetails" TEXT,
    "notes" TEXT,
    "pickupNotes" TEXT,
    "returnNotes" TEXT,
    "damageNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "outletId" TEXT NOT NULL,
    "customerId" TEXT,
    CONSTRAINT "Order_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("createdAt", "customerId", "depositAmount", "id", "orderNumber", "orderType", "outletId", "pickedUpAt", "pickupPlanAt", "returnPlanAt", "returnedAt", "status", "totalAmount", "updatedAt") SELECT "createdAt", "customerId", "depositAmount", "id", "orderNumber", "orderType", "outletId", "pickedUpAt", "pickupPlanAt", "returnPlanAt", "returnedAt", "status", "totalAmount", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE INDEX "Order_status_outletId_idx" ON "Order"("status", "outletId");
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt" DESC);
CREATE INDEX "Order_pickupPlanAt_returnPlanAt_idx" ON "Order"("pickupPlanAt", "returnPlanAt");
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");
CREATE TABLE "new_Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "amount" REAL NOT NULL,
    "method" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reference" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "orderId" TEXT NOT NULL,
    CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("amount", "createdAt", "id", "method", "orderId", "reference", "status", "updatedAt") SELECT "amount", "createdAt", "id", "method", "orderId", "reference", "status", "updatedAt" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE INDEX "Payment_orderId_status_idx" ON "Payment"("orderId", "status");
CREATE INDEX "Payment_orderId_type_idx" ON "Payment"("orderId", "type");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_type_idx" ON "Payment"("type");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

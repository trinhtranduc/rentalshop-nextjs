/*
  Warnings:

  - Made the column `email` on table `Customer` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "country" TEXT,
    "dateOfBirth" DATETIME,
    "idNumber" TEXT,
    "idType" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "merchantId" TEXT NOT NULL,
    CONSTRAINT "Customer_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Customer" ("address", "createdAt", "email", "firstName", "id", "isActive", "lastName", "merchantId", "phone", "publicId", "updatedAt") SELECT "address", "createdAt", "email", "firstName", "id", "isActive", "lastName", "merchantId", "phone", "publicId", "updatedAt" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE UNIQUE INDEX "Customer_publicId_key" ON "Customer"("publicId");
CREATE INDEX "Customer_merchantId_firstName_lastName_idx" ON "Customer"("merchantId", "firstName", "lastName");
CREATE INDEX "Customer_merchantId_phone_idx" ON "Customer"("merchantId", "phone");
CREATE INDEX "Customer_email_idx" ON "Customer"("email");
CREATE INDEX "Customer_publicId_idx" ON "Customer"("publicId");
CREATE TABLE "new_Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" INTEGER NOT NULL,
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
    "isReadyToDeliver" BOOLEAN NOT NULL DEFAULT false,
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
INSERT INTO "new_Order" ("collateralDetails", "collateralType", "createdAt", "customerId", "damageFee", "damageNotes", "depositAmount", "id", "lateFee", "notes", "orderNumber", "orderType", "outletId", "pickedUpAt", "pickupNotes", "pickupPlanAt", "publicId", "rentalDuration", "returnNotes", "returnPlanAt", "returnedAt", "securityDeposit", "status", "totalAmount", "updatedAt") SELECT "collateralDetails", "collateralType", "createdAt", "customerId", "damageFee", "damageNotes", "depositAmount", "id", "lateFee", "notes", "orderNumber", "orderType", "outletId", "pickedUpAt", "pickupNotes", "pickupPlanAt", "publicId", "rentalDuration", "returnNotes", "returnPlanAt", "returnedAt", "securityDeposit", "status", "totalAmount", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_publicId_key" ON "Order"("publicId");
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE INDEX "Order_status_outletId_idx" ON "Order"("status", "outletId");
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt" DESC);
CREATE INDEX "Order_pickupPlanAt_returnPlanAt_idx" ON "Order"("pickupPlanAt", "returnPlanAt");
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");
CREATE INDEX "Order_publicId_idx" ON "Order"("publicId");
CREATE INDEX "Order_isReadyToDeliver_outletId_idx" ON "Order"("isReadyToDeliver", "outletId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

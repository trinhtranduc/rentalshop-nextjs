/*
  Warnings:

  - Added the required column `publicId` to the `Category` table without a default value. This is not possible if the table is not empty.
  - Added the required column `publicId` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `publicId` to the `Merchant` table without a default value. This is not possible if the table is not empty.
  - Added the required column `publicId` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `publicId` to the `Outlet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `publicId` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Added the required column `publicId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "merchantId" TEXT NOT NULL,
    CONSTRAINT "Category_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Category" ("createdAt", "description", "id", "isActive", "merchantId", "name", "updatedAt") SELECT "createdAt", "description", "id", "isActive", "merchantId", "name", "updatedAt" FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE UNIQUE INDEX "Category_publicId_key" ON "Category"("publicId");
CREATE INDEX "Category_merchantId_idx" ON "Category"("merchantId");
CREATE INDEX "Category_publicId_idx" ON "Category"("publicId");
CREATE UNIQUE INDEX "Category_merchantId_name_key" ON "Category"("merchantId", "name");
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "merchantId" TEXT NOT NULL,
    CONSTRAINT "Customer_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Customer" ("address", "createdAt", "email", "firstName", "id", "isActive", "lastName", "merchantId", "phone", "updatedAt") SELECT "address", "createdAt", "email", "firstName", "id", "isActive", "lastName", "merchantId", "phone", "updatedAt" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE UNIQUE INDEX "Customer_publicId_key" ON "Customer"("publicId");
CREATE INDEX "Customer_merchantId_firstName_lastName_idx" ON "Customer"("merchantId", "firstName", "lastName");
CREATE INDEX "Customer_merchantId_phone_idx" ON "Customer"("merchantId", "phone");
CREATE INDEX "Customer_email_idx" ON "Customer"("email");
CREATE INDEX "Customer_publicId_idx" ON "Customer"("publicId");
CREATE TABLE "new_Merchant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Merchant" ("createdAt", "description", "id", "isActive", "name", "updatedAt") SELECT "createdAt", "description", "id", "isActive", "name", "updatedAt" FROM "Merchant";
DROP TABLE "Merchant";
ALTER TABLE "new_Merchant" RENAME TO "Merchant";
CREATE UNIQUE INDEX "Merchant_publicId_key" ON "Merchant"("publicId");
CREATE INDEX "Merchant_name_idx" ON "Merchant"("name");
CREATE INDEX "Merchant_publicId_idx" ON "Merchant"("publicId");
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
INSERT INTO "new_Order" ("collateralDetails", "collateralType", "createdAt", "customerId", "damageFee", "damageNotes", "depositAmount", "id", "lateFee", "notes", "orderNumber", "orderType", "outletId", "pickedUpAt", "pickupNotes", "pickupPlanAt", "rentalDuration", "returnNotes", "returnPlanAt", "returnedAt", "securityDeposit", "status", "totalAmount", "updatedAt") SELECT "collateralDetails", "collateralType", "createdAt", "customerId", "damageFee", "damageNotes", "depositAmount", "id", "lateFee", "notes", "orderNumber", "orderType", "outletId", "pickedUpAt", "pickupNotes", "pickupPlanAt", "rentalDuration", "returnNotes", "returnPlanAt", "returnedAt", "securityDeposit", "status", "totalAmount", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_publicId_key" ON "Order"("publicId");
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE INDEX "Order_status_outletId_idx" ON "Order"("status", "outletId");
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt" DESC);
CREATE INDEX "Order_pickupPlanAt_returnPlanAt_idx" ON "Order"("pickupPlanAt", "returnPlanAt");
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");
CREATE INDEX "Order_publicId_idx" ON "Order"("publicId");
CREATE TABLE "new_Outlet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "merchantId" TEXT NOT NULL,
    CONSTRAINT "Outlet_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Outlet" ("address", "createdAt", "description", "id", "isActive", "merchantId", "name", "updatedAt") SELECT "address", "createdAt", "description", "id", "isActive", "merchantId", "name", "updatedAt" FROM "Outlet";
DROP TABLE "Outlet";
ALTER TABLE "new_Outlet" RENAME TO "Outlet";
CREATE UNIQUE INDEX "Outlet_publicId_key" ON "Outlet"("publicId");
CREATE INDEX "Outlet_merchantId_idx" ON "Outlet"("merchantId");
CREATE INDEX "Outlet_name_idx" ON "Outlet"("name");
CREATE INDEX "Outlet_publicId_idx" ON "Outlet"("publicId");
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "barcode" TEXT,
    "totalStock" INTEGER NOT NULL DEFAULT 0,
    "rentPrice" REAL NOT NULL,
    "salePrice" REAL,
    "deposit" REAL NOT NULL DEFAULT 0,
    "images" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "merchantId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    CONSTRAINT "Product_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("barcode", "categoryId", "createdAt", "deposit", "description", "id", "images", "isActive", "merchantId", "name", "rentPrice", "salePrice", "totalStock", "updatedAt") SELECT "barcode", "categoryId", "createdAt", "deposit", "description", "id", "images", "isActive", "merchantId", "name", "rentPrice", "salePrice", "totalStock", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_publicId_key" ON "Product"("publicId");
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");
CREATE INDEX "Product_merchantId_idx" ON "Product"("merchantId");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_barcode_idx" ON "Product"("barcode");
CREATE INDEX "Product_name_idx" ON "Product"("name");
CREATE INDEX "Product_publicId_idx" ON "Product"("publicId");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'OUTLET_STAFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "merchantId" TEXT,
    "outletId" TEXT,
    CONSTRAINT "User_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "email", "firstName", "id", "isActive", "lastName", "merchantId", "outletId", "password", "phone", "role", "updatedAt") SELECT "createdAt", "email", "firstName", "id", "isActive", "lastName", "merchantId", "outletId", "password", "phone", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_publicId_key" ON "User"("publicId");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_merchantId_idx" ON "User"("merchantId");
CREATE INDEX "User_outletId_idx" ON "User"("outletId");
CREATE INDEX "User_publicId_idx" ON "User"("publicId");
CREATE UNIQUE INDEX "User_merchantId_email_key" ON "User"("merchantId", "email");
CREATE UNIQUE INDEX "User_merchantId_phone_key" ON "User"("merchantId", "phone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

/*
  Warnings:

  - The primary key for the `AuditLog` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `AuditLog` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `userId` on the `AuditLog` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `Category` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `publicId` on the `Category` table. All the data in the column will be lost.
  - You are about to alter the column `id` on the `Category` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `merchantId` on the `Category` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `Customer` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `publicId` on the `Customer` table. All the data in the column will be lost.
  - You are about to alter the column `id` on the `Customer` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `merchantId` on the `Customer` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `Merchant` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `publicId` on the `Merchant` table. All the data in the column will be lost.
  - You are about to alter the column `id` on the `Merchant` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `planId` on the `Merchant` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `Order` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `publicId` on the `Order` table. All the data in the column will be lost.
  - You are about to alter the column `createdById` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `customerId` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `id` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `outletId` on the `Order` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `OrderItem` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `OrderItem` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `orderId` on the `OrderItem` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `productId` on the `OrderItem` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `Outlet` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `publicId` on the `Outlet` table. All the data in the column will be lost.
  - You are about to alter the column `id` on the `Outlet` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `merchantId` on the `Outlet` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `OutletStock` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `OutletStock` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `outletId` on the `OutletStock` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `productId` on the `OutletStock` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `Payment` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `publicId` on the `Payment` table. All the data in the column will be lost.
  - You are about to alter the column `id` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `merchantId` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `orderId` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `subscriptionId` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `Plan` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `maxCustomers` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `maxOutlets` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `maxProducts` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `maxUsers` on the `Plan` table. All the data in the column will be lost.
  - You are about to drop the column `publicId` on the `Plan` table. All the data in the column will be lost.
  - You are about to alter the column `id` on the `Plan` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `Product` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `publicId` on the `Product` table. All the data in the column will be lost.
  - You are about to alter the column `categoryId` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `id` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `merchantId` on the `Product` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `Subscription` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `publicId` on the `Subscription` table. All the data in the column will be lost.
  - You are about to alter the column `id` on the `Subscription` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `merchantId` on the `Subscription` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `planId` on the `Subscription` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `publicId` on the `User` table. All the data in the column will be lost.
  - You are about to alter the column `id` on the `User` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `merchantId` on the `User` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.
  - You are about to alter the column `outletId` on the `User` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.

*/
-- CreateTable
CREATE TABLE "plans_backup" (
    "id" TEXT,
    "publicId" INTEGER,
    "name" TEXT,
    "description" TEXT,
    "basePrice" REAL,
    "currency" TEXT,
    "trialDays" INTEGER,
    "maxOutlets" INTEGER,
    "maxUsers" INTEGER,
    "maxProducts" INTEGER,
    "maxCustomers" INTEGER,
    "features" TEXT,
    "isActive" num,
    "isPopular" num,
    "sortOrder" INTEGER,
    "createdAt" num,
    "updatedAt" num,
    "deletedAt" num
);

-- CreateTable
CREATE TABLE "subscriptions_backup" (
    "id" TEXT,
    "publicId" INTEGER,
    "merchantId" TEXT,
    "planId" TEXT,
    "status" TEXT,
    "currentPeriodStart" num,
    "currentPeriodEnd" num,
    "trialStart" num,
    "trialEnd" num,
    "cancelAtPeriodEnd" num,
    "canceledAt" num,
    "cancelReason" TEXT,
    "amount" REAL,
    "currency" TEXT,
    "interval" TEXT,
    "intervalCount" INTEGER,
    "period" INTEGER,
    "discount" REAL,
    "savings" REAL,
    "createdAt" num,
    "updatedAt" num
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "userId" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_AuditLog" ("action", "createdAt", "details", "entityId", "entityType", "id", "ipAddress", "userAgent", "userId") SELECT "action", "createdAt", "details", "entityId", "entityType", "id", "ipAddress", "userAgent", "userId" FROM "AuditLog";
DROP TABLE "AuditLog";
ALTER TABLE "new_AuditLog" RENAME TO "AuditLog";
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE TABLE "new_Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "merchantId" INTEGER NOT NULL,
    CONSTRAINT "Category_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Category" ("createdAt", "description", "id", "isActive", "merchantId", "name", "updatedAt") SELECT "createdAt", "description", "id", "isActive", "merchantId", "name", "updatedAt" FROM "Category";
DROP TABLE "Category";
ALTER TABLE "new_Category" RENAME TO "Category";
CREATE INDEX "Category_merchantId_idx" ON "Category"("merchantId");
CREATE UNIQUE INDEX "Category_merchantId_name_key" ON "Category"("merchantId", "name");
CREATE TABLE "new_Customer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
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
    "merchantId" INTEGER NOT NULL,
    CONSTRAINT "Customer_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Customer" ("address", "city", "country", "createdAt", "dateOfBirth", "email", "firstName", "id", "idNumber", "idType", "isActive", "lastName", "merchantId", "notes", "phone", "state", "updatedAt", "zipCode") SELECT "address", "city", "country", "createdAt", "dateOfBirth", "email", "firstName", "id", "idNumber", "idType", "isActive", "lastName", "merchantId", "notes", "phone", "state", "updatedAt", "zipCode" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE INDEX "Customer_merchantId_firstName_lastName_idx" ON "Customer"("merchantId", "firstName", "lastName");
CREATE UNIQUE INDEX "Customer_merchantId_phone_key" ON "Customer"("merchantId", "phone");
CREATE UNIQUE INDEX "unique_merchant_email" ON "Customer"("merchantId", "email");
CREATE TABLE "new_Merchant" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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
    "planId" INTEGER,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'trial',
    "totalRevenue" REAL NOT NULL DEFAULT 0,
    "lastActiveAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Merchant_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Merchant" ("address", "businessType", "city", "country", "createdAt", "description", "email", "id", "isActive", "lastActiveAt", "name", "phone", "planId", "state", "subscriptionStatus", "taxId", "totalRevenue", "updatedAt", "website", "zipCode") SELECT "address", "businessType", "city", "country", "createdAt", "description", "email", "id", "isActive", "lastActiveAt", "name", "phone", "planId", "state", "subscriptionStatus", "taxId", "totalRevenue", "updatedAt", "website", "zipCode" FROM "Merchant";
DROP TABLE "Merchant";
ALTER TABLE "new_Merchant" RENAME TO "Merchant";
CREATE UNIQUE INDEX "Merchant_email_key" ON "Merchant"("email");
CREATE INDEX "Merchant_name_idx" ON "Merchant"("name");
CREATE INDEX "Merchant_email_idx" ON "Merchant"("email");
CREATE INDEX "Merchant_subscriptionStatus_idx" ON "Merchant"("subscriptionStatus");
CREATE INDEX "Merchant_planId_idx" ON "Merchant"("planId");
CREATE TABLE "new_Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderNumber" TEXT NOT NULL,
    "orderType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RESERVED',
    "totalAmount" REAL NOT NULL,
    "depositAmount" REAL NOT NULL DEFAULT 0,
    "securityDeposit" REAL NOT NULL DEFAULT 0,
    "damageFee" REAL NOT NULL DEFAULT 0,
    "lateFee" REAL NOT NULL DEFAULT 0,
    "discountType" TEXT,
    "discountValue" REAL NOT NULL DEFAULT 0,
    "discountAmount" REAL NOT NULL DEFAULT 0,
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
    "outletId" INTEGER NOT NULL,
    "customerId" INTEGER,
    "createdById" INTEGER NOT NULL,
    CONSTRAINT "Order_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("collateralDetails", "collateralType", "createdAt", "createdById", "customerId", "damageFee", "damageNotes", "depositAmount", "discountAmount", "discountType", "discountValue", "id", "isReadyToDeliver", "lateFee", "notes", "orderNumber", "orderType", "outletId", "pickedUpAt", "pickupNotes", "pickupPlanAt", "rentalDuration", "returnNotes", "returnPlanAt", "returnedAt", "securityDeposit", "status", "totalAmount", "updatedAt") SELECT "collateralDetails", "collateralType", "createdAt", "createdById", "customerId", "damageFee", "damageNotes", "depositAmount", "discountAmount", "discountType", "discountValue", "id", "isReadyToDeliver", "lateFee", "notes", "orderNumber", "orderType", "outletId", "pickedUpAt", "pickupNotes", "pickupPlanAt", "rentalDuration", "returnNotes", "returnPlanAt", "returnedAt", "securityDeposit", "status", "totalAmount", "updatedAt" FROM "Order";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE INDEX "Order_status_outletId_idx" ON "Order"("status", "outletId");
CREATE INDEX "Order_customerId_createdAt_idx" ON "Order"("customerId", "createdAt" DESC);
CREATE INDEX "Order_pickupPlanAt_returnPlanAt_idx" ON "Order"("pickupPlanAt", "returnPlanAt");
CREATE INDEX "Order_orderNumber_idx" ON "Order"("orderNumber");
CREATE INDEX "Order_isReadyToDeliver_outletId_idx" ON "Order"("isReadyToDeliver", "outletId");
CREATE TABLE "new_OrderItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL,
    "totalPrice" REAL NOT NULL,
    "deposit" REAL NOT NULL DEFAULT 0,
    "orderId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "notes" TEXT,
    "rentalDays" INTEGER,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_OrderItem" ("deposit", "id", "notes", "orderId", "productId", "quantity", "rentalDays", "totalPrice", "unitPrice") SELECT "deposit", "id", "notes", "orderId", "productId", "quantity", "rentalDays", "totalPrice", "unitPrice" FROM "OrderItem";
DROP TABLE "OrderItem";
ALTER TABLE "new_OrderItem" RENAME TO "OrderItem";
CREATE INDEX "OrderItem_orderId_productId_idx" ON "OrderItem"("orderId", "productId");
CREATE TABLE "new_Outlet" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "phone" TEXT,
    "city" TEXT,
    "country" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    CONSTRAINT "Outlet_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Outlet" ("address", "city", "country", "createdAt", "description", "id", "isActive", "isDefault", "merchantId", "name", "phone", "state", "updatedAt", "zipCode") SELECT "address", "city", "country", "createdAt", "description", "id", "isActive", "isDefault", "merchantId", "name", "phone", "state", "updatedAt", "zipCode" FROM "Outlet";
DROP TABLE "Outlet";
ALTER TABLE "new_Outlet" RENAME TO "Outlet";
CREATE INDEX "Outlet_merchantId_idx" ON "Outlet"("merchantId");
CREATE INDEX "Outlet_name_idx" ON "Outlet"("name");
CREATE INDEX "Outlet_isDefault_idx" ON "Outlet"("isDefault");
CREATE TABLE "new_OutletStock" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "available" INTEGER NOT NULL DEFAULT 0,
    "renting" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "productId" INTEGER NOT NULL,
    "outletId" INTEGER NOT NULL,
    CONSTRAINT "OutletStock_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OutletStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_OutletStock" ("available", "createdAt", "id", "outletId", "productId", "renting", "stock", "updatedAt") SELECT "available", "createdAt", "id", "outletId", "productId", "renting", "stock", "updatedAt" FROM "OutletStock";
DROP TABLE "OutletStock";
ALTER TABLE "new_OutletStock" RENAME TO "OutletStock";
CREATE INDEX "OutletStock_outletId_available_idx" ON "OutletStock"("outletId", "available");
CREATE INDEX "OutletStock_productId_idx" ON "OutletStock"("productId");
CREATE UNIQUE INDEX "OutletStock_productId_outletId_key" ON "OutletStock"("productId", "outletId");
CREATE TABLE "new_Payment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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
    "orderId" INTEGER,
    "subscriptionId" INTEGER,
    "merchantId" INTEGER,
    CONSTRAINT "Payment_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Payment" ("amount", "createdAt", "currency", "description", "failureReason", "id", "invoiceNumber", "merchantId", "metadata", "method", "notes", "orderId", "processedAt", "processedBy", "reference", "status", "subscriptionId", "transactionId", "type", "updatedAt") SELECT "amount", "createdAt", "currency", "description", "failureReason", "id", "invoiceNumber", "merchantId", "metadata", "method", "notes", "orderId", "processedAt", "processedBy", "reference", "status", "subscriptionId", "transactionId", "type", "updatedAt" FROM "Payment";
DROP TABLE "Payment";
ALTER TABLE "new_Payment" RENAME TO "Payment";
CREATE INDEX "Payment_orderId_status_idx" ON "Payment"("orderId", "status");
CREATE INDEX "Payment_subscriptionId_status_idx" ON "Payment"("subscriptionId", "status");
CREATE INDEX "Payment_merchantId_status_idx" ON "Payment"("merchantId", "status");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_type_idx" ON "Payment"("type");
CREATE INDEX "Payment_method_idx" ON "Payment"("method");
CREATE INDEX "Payment_currency_idx" ON "Payment"("currency");
CREATE TABLE "new_Plan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "basePrice" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "trialDays" INTEGER NOT NULL DEFAULT 14,
    "limits" TEXT NOT NULL DEFAULT '{"outlets": 0, "users": 0, "products": 0, "customers": 0}',
    "features" TEXT NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);
INSERT INTO "new_Plan" ("basePrice", "createdAt", "currency", "deletedAt", "description", "features", "id", "isActive", "isPopular", "name", "sortOrder", "trialDays", "updatedAt") SELECT "basePrice", "createdAt", "currency", "deletedAt", "description", "features", "id", "isActive", "isPopular", "name", "sortOrder", "trialDays", "updatedAt" FROM "Plan";
DROP TABLE "Plan";
ALTER TABLE "new_Plan" RENAME TO "Plan";
CREATE UNIQUE INDEX "Plan_name_key" ON "Plan"("name");
CREATE INDEX "Plan_isActive_idx" ON "Plan"("isActive");
CREATE INDEX "Plan_sortOrder_idx" ON "Plan"("sortOrder");
CREATE INDEX "Plan_deletedAt_idx" ON "Plan"("deletedAt");
CREATE TABLE "new_Product" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
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
    "merchantId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Product_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("barcode", "categoryId", "createdAt", "deposit", "description", "id", "images", "isActive", "merchantId", "name", "rentPrice", "salePrice", "totalStock", "updatedAt") SELECT "barcode", "categoryId", "createdAt", "deposit", "description", "id", "images", "isActive", "merchantId", "name", "rentPrice", "salePrice", "totalStock", "updatedAt" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");
CREATE INDEX "Product_merchantId_idx" ON "Product"("merchantId");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_barcode_idx" ON "Product"("barcode");
CREATE INDEX "Product_name_idx" ON "Product"("name");
CREATE TABLE "new_Subscription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "merchantId" INTEGER NOT NULL,
    "planId" INTEGER NOT NULL,
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
INSERT INTO "new_Subscription" ("amount", "cancelAtPeriodEnd", "cancelReason", "canceledAt", "createdAt", "currency", "currentPeriodEnd", "currentPeriodStart", "discount", "id", "interval", "intervalCount", "merchantId", "period", "planId", "savings", "status", "trialEnd", "trialStart", "updatedAt") SELECT "amount", "cancelAtPeriodEnd", "cancelReason", "canceledAt", "createdAt", "currency", "currentPeriodEnd", "currentPeriodStart", "discount", "id", "interval", "intervalCount", "merchantId", "period", "planId", "savings", "status", "trialEnd", "trialStart", "updatedAt" FROM "Subscription";
DROP TABLE "Subscription";
ALTER TABLE "new_Subscription" RENAME TO "Subscription";
CREATE UNIQUE INDEX "Subscription_merchantId_key" ON "Subscription"("merchantId");
CREATE INDEX "Subscription_merchantId_idx" ON "Subscription"("merchantId");
CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'OUTLET_STAFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "merchantId" INTEGER,
    "outletId" INTEGER,
    "deletedAt" DATETIME,
    CONSTRAINT "User_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "User_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_User" ("createdAt", "deletedAt", "email", "firstName", "id", "isActive", "lastName", "merchantId", "outletId", "password", "phone", "role", "updatedAt") SELECT "createdAt", "deletedAt", "email", "firstName", "id", "isActive", "lastName", "merchantId", "outletId", "password", "phone", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_email_idx" ON "User"("email");
CREATE INDEX "User_merchantId_idx" ON "User"("merchantId");
CREATE INDEX "User_outletId_idx" ON "User"("outletId");
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
CREATE UNIQUE INDEX "User_merchantId_email_key" ON "User"("merchantId", "email");
CREATE UNIQUE INDEX "User_merchantId_phone_key" ON "User"("merchantId", "phone");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

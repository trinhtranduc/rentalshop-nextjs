-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'string',
    "category" TEXT NOT NULL DEFAULT 'general',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isReadOnly" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MerchantSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" INTEGER NOT NULL,
    "merchantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'string',
    "category" TEXT NOT NULL DEFAULT 'general',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MerchantSetting_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'string',
    "category" TEXT NOT NULL DEFAULT 'general',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OutletSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" INTEGER NOT NULL,
    "outletId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'string',
    "category" TEXT NOT NULL DEFAULT 'general',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OutletSetting_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_publicId_key" ON "SystemSetting"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE INDEX "SystemSetting_key_idx" ON "SystemSetting"("key");

-- CreateIndex
CREATE INDEX "SystemSetting_category_idx" ON "SystemSetting"("category");

-- CreateIndex
CREATE INDEX "SystemSetting_publicId_idx" ON "SystemSetting"("publicId");

-- CreateIndex
CREATE INDEX "SystemSetting_isActive_idx" ON "SystemSetting"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantSetting_publicId_key" ON "MerchantSetting"("publicId");

-- CreateIndex
CREATE INDEX "MerchantSetting_merchantId_idx" ON "MerchantSetting"("merchantId");

-- CreateIndex
CREATE INDEX "MerchantSetting_key_idx" ON "MerchantSetting"("key");

-- CreateIndex
CREATE INDEX "MerchantSetting_category_idx" ON "MerchantSetting"("category");

-- CreateIndex
CREATE INDEX "MerchantSetting_publicId_idx" ON "MerchantSetting"("publicId");

-- CreateIndex
CREATE INDEX "MerchantSetting_isActive_idx" ON "MerchantSetting"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantSetting_merchantId_key_key" ON "MerchantSetting"("merchantId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_publicId_key" ON "UserPreference"("publicId");

-- CreateIndex
CREATE INDEX "UserPreference_userId_idx" ON "UserPreference"("userId");

-- CreateIndex
CREATE INDEX "UserPreference_key_idx" ON "UserPreference"("key");

-- CreateIndex
CREATE INDEX "UserPreference_category_idx" ON "UserPreference"("category");

-- CreateIndex
CREATE INDEX "UserPreference_publicId_idx" ON "UserPreference"("publicId");

-- CreateIndex
CREATE INDEX "UserPreference_isActive_idx" ON "UserPreference"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key_key" ON "UserPreference"("userId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "OutletSetting_publicId_key" ON "OutletSetting"("publicId");

-- CreateIndex
CREATE INDEX "OutletSetting_outletId_idx" ON "OutletSetting"("outletId");

-- CreateIndex
CREATE INDEX "OutletSetting_key_idx" ON "OutletSetting"("key");

-- CreateIndex
CREATE INDEX "OutletSetting_category_idx" ON "OutletSetting"("category");

-- CreateIndex
CREATE INDEX "OutletSetting_publicId_idx" ON "OutletSetting"("publicId");

-- CreateIndex
CREATE INDEX "OutletSetting_isActive_idx" ON "OutletSetting"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "OutletSetting_outletId_key_key" ON "OutletSetting"("outletId", "key");

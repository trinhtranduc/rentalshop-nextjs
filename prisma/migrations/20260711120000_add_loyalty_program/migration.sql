-- CreateTable
CREATE TABLE "LoyaltyProgram" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Chương trình khách hàng thân thiết',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rentEarnEnabled" BOOLEAN NOT NULL DEFAULT true,
    "rentEarnRate" INTEGER NOT NULL DEFAULT 1,
    "rentEarnPerAmount" DOUBLE PRECISION NOT NULL DEFAULT 10000,
    "saleEarnEnabled" BOOLEAN NOT NULL DEFAULT true,
    "saleEarnRate" INTEGER NOT NULL DEFAULT 1,
    "saleEarnPerAmount" DOUBLE PRECISION NOT NULL DEFAULT 10000,
    "pointValue" DOUBLE PRECISION NOT NULL DEFAULT 1000,
    "minRedeemPoints" INTEGER NOT NULL DEFAULT 10,
    "maxRedeemPercent" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "redeemOnRent" BOOLEAN NOT NULL DEFAULT true,
    "redeemOnSale" BOOLEAN NOT NULL DEFAULT true,
    "tierMetric" TEXT NOT NULL DEFAULT 'total_spend',
    "tierPeriod" TEXT NOT NULL DEFAULT 'lifetime',
    "tierDowngrade" TEXT NOT NULL DEFAULT 'never',
    "pointsExpiryMode" TEXT NOT NULL DEFAULT 'never',
    "pointsExpiryDays" INTEGER,
    "yearlyResetMonth" INTEGER,
    "yearlyResetDay" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyTier" (
    "id" SERIAL NOT NULL,
    "programId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "benefits" TEXT NOT NULL DEFAULT '[]',
    "color" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerLoyalty" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "totalEarned" INTEGER NOT NULL DEFAULT 0,
    "totalRedeemed" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "currentTierId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerLoyalty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyTransaction" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "outletId" INTEGER,
    "orderId" INTEGER,
    "type" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "description" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER,

    CONSTRAINT "LoyaltyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyPointLot" (
    "id" SERIAL NOT NULL,
    "customerLoyaltyId" INTEGER NOT NULL,
    "earnTransactionId" INTEGER NOT NULL,
    "pointsEarned" INTEGER NOT NULL,
    "remainingPoints" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoyaltyPointLot_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "loyaltyPointsRedeemed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "loyaltyDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "loyaltyPointsEarned" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyProgram_merchantId_key" ON "LoyaltyProgram"("merchantId");

-- CreateIndex
CREATE INDEX "LoyaltyTier_programId_threshold_idx" ON "LoyaltyTier"("programId", "threshold");
CREATE INDEX "LoyaltyTier_programId_sortOrder_idx" ON "LoyaltyTier"("programId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerLoyalty_customerId_merchantId_key" ON "CustomerLoyalty"("customerId", "merchantId");
CREATE INDEX "CustomerLoyalty_merchantId_points_idx" ON "CustomerLoyalty"("merchantId", "points");
CREATE INDEX "CustomerLoyalty_merchantId_totalSpent_idx" ON "CustomerLoyalty"("merchantId", "totalSpent");
CREATE INDEX "CustomerLoyalty_merchantId_currentTierId_idx" ON "CustomerLoyalty"("merchantId", "currentTierId");

-- CreateIndex
CREATE INDEX "LoyaltyTransaction_customerId_merchantId_createdAt_idx" ON "LoyaltyTransaction"("customerId", "merchantId", "createdAt");
CREATE INDEX "LoyaltyTransaction_orderId_type_idx" ON "LoyaltyTransaction"("orderId", "type");
CREATE INDEX "LoyaltyTransaction_merchantId_type_createdAt_idx" ON "LoyaltyTransaction"("merchantId", "type", "createdAt");
CREATE INDEX "LoyaltyTransaction_outletId_createdAt_idx" ON "LoyaltyTransaction"("outletId", "createdAt");

-- CreateIndex
CREATE INDEX "LoyaltyPointLot_customerLoyaltyId_expiresAt_idx" ON "LoyaltyPointLot"("customerLoyaltyId", "expiresAt");
CREATE INDEX "LoyaltyPointLot_earnTransactionId_idx" ON "LoyaltyPointLot"("earnTransactionId");
CREATE INDEX "LoyaltyPointLot_expiresAt_remainingPoints_idx" ON "LoyaltyPointLot"("expiresAt", "remainingPoints");

-- AddForeignKey
ALTER TABLE "LoyaltyProgram" ADD CONSTRAINT "LoyaltyProgram_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTier" ADD CONSTRAINT "LoyaltyTier_programId_fkey" FOREIGN KEY ("programId") REFERENCES "LoyaltyProgram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLoyalty" ADD CONSTRAINT "CustomerLoyalty_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerLoyalty" ADD CONSTRAINT "CustomerLoyalty_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerLoyalty" ADD CONSTRAINT "CustomerLoyalty_currentTierId_fkey" FOREIGN KEY ("currentTierId") REFERENCES "LoyaltyTier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyTransaction" ADD CONSTRAINT "LoyaltyTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyPointLot" ADD CONSTRAINT "LoyaltyPointLot_customerLoyaltyId_fkey" FOREIGN KEY ("customerLoyaltyId") REFERENCES "CustomerLoyalty"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LoyaltyPointLot" ADD CONSTRAINT "LoyaltyPointLot_earnTransactionId_fkey" FOREIGN KEY ("earnTransactionId") REFERENCES "LoyaltyTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed loyalty feature for Professional and Enterprise plans (features stored as JSON string)
UPDATE "Plan"
SET features = REPLACE(features, ']', ',"loyalty"]')
WHERE name IN ('Professional', 'Enterprise')
  AND features NOT LIKE '%loyalty%';

-- Product Pricing Options: allow multiple rental pricing options per product
-- Phase 1: FIXED + DAILY (BLOCK/HOURLY reserved for future). Backward compatible.

-- CreateEnum
CREATE TYPE "PricingUnit" AS ENUM ('DAY', 'HOUR');

-- AlterEnum: reserve BLOCK for future block-based pricing
ALTER TYPE "PricingType" ADD VALUE IF NOT EXISTS 'BLOCK';

-- CreateTable
CREATE TABLE "ProductPricingOption" (
    "id" SERIAL NOT NULL,
    "productId" INTEGER NOT NULL,
    "type" "PricingType" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "unit" "PricingUnit",
    "blockSize" INTEGER,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPricingOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductPricingOption_productId_isActive_idx" ON "ProductPricingOption"("productId", "isActive");

-- AlterTable: OrderItem snapshot of the chosen pricing option
ALTER TABLE "OrderItem" ADD COLUMN "pricingType" "PricingType",
ADD COLUMN "pricingOptionId" INTEGER;

-- AddForeignKey
ALTER TABLE "ProductPricingOption" ADD CONSTRAINT "ProductPricingOption_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_pricingOptionId_fkey" FOREIGN KEY ("pricingOptionId") REFERENCES "ProductPricingOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

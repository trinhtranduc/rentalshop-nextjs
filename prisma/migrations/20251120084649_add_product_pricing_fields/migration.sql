-- Create PricingType enum if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PricingType') THEN
        CREATE TYPE "PricingType" AS ENUM ('FIXED', 'HOURLY', 'DAILY');
    END IF;
END $$;

-- Add pricingType column to Product table (nullable, default NULL = FIXED)
ALTER TABLE "Product" 
  ADD COLUMN IF NOT EXISTS "pricingType" "PricingType";

-- Create index on pricingType for better query performance
CREATE INDEX IF NOT EXISTS "Product_pricingType_idx" ON "Product"("pricingType");

-- Add durationConfig column to Product table (nullable JSON string)
ALTER TABLE "Product" 
  ADD COLUMN IF NOT EXISTS "durationConfig" TEXT;

-- Add rentalDurationUnit column to Order table (nullable)
ALTER TABLE "Order" 
  ADD COLUMN IF NOT EXISTS "rentalDurationUnit" TEXT;

-- Note: All existing products will have pricingType = NULL (treated as FIXED)
-- This is backward compatible - no data migration needed


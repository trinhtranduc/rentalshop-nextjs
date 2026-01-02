-- AlterTable
-- Add referredByMerchantId column to Merchant table for referral tracking
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "referredByMerchantId" INTEGER;

-- CreateIndex
-- Add index for efficient referral queries
CREATE INDEX IF NOT EXISTS "Merchant_referredByMerchantId_idx" ON "Merchant"("referredByMerchantId");

-- AddForeignKey
-- Create self-referential foreign key relationship for merchant referrals
-- Note: This assumes the Merchant table has an id column (primary key)
-- The relationship allows a merchant to be referred by another merchant
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'Merchant_referredByMerchantId_fkey'
    ) THEN
        ALTER TABLE "Merchant" 
        ADD CONSTRAINT "Merchant_referredByMerchantId_fkey" 
        FOREIGN KEY ("referredByMerchantId") 
        REFERENCES "Merchant"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
    END IF;
END $$;


-- ============================================================================
-- Remove Merchant.status column (if exists)
-- ============================================================================
-- This migration removes the 'status' column from Merchant table if it exists.
-- The status information should be accessed via Merchant.subscription.status instead.
-- ============================================================================

DO $$ 
BEGIN
    -- Check if Merchant table exists and has status column
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'Merchant' 
        AND column_name = 'status'
        AND table_schema = 'public'
    ) THEN
        -- Drop the status column
        ALTER TABLE "Merchant" DROP COLUMN "status";
        RAISE NOTICE 'Removed status column from Merchant table';
    ELSE
        RAISE NOTICE 'Merchant.status column does not exist - skipping';
    END IF;
END $$;

-- Drop index on status if it exists
DROP INDEX IF EXISTS "Merchant_status_idx";


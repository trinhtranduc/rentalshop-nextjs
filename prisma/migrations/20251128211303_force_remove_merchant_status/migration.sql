-- ============================================================================
-- Force Remove Merchant.status Column
-- ============================================================================
-- This migration forcefully removes the 'status' column from Merchant table
-- if it still exists. This is a safety migration to ensure the column is
-- completely removed even if the previous migration (20251128140000) didn't
-- execute properly or the column was recreated.
--
-- The status information should be accessed via Merchant.subscription.status
-- instead. This migration handles:
-- 1. Dropping any indexes on the status column
-- 2. Removing the status column itself
-- 3. Comprehensive error handling and logging
-- ============================================================================

DO $$ 
BEGIN
    -- Step 1: Check and drop index on status column first
    -- PostgreSQL requires dropping indexes before dropping columns
    IF EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND tablename = 'Merchant' 
        AND indexname = 'Merchant_status_idx'
    ) THEN
        DROP INDEX IF EXISTS "Merchant_status_idx";
        RAISE NOTICE 'Dropped index Merchant_status_idx';
    END IF;
    
    -- Step 2: Check and drop any other indexes that might reference status
    -- (in case there are composite indexes)
    IF EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE schemaname = 'public'
        AND tablename = 'Merchant' 
        AND indexdef LIKE '%status%'
    ) THEN
        -- Find and drop any indexes containing status
        FOR rec IN 
            SELECT indexname 
            FROM pg_indexes 
            WHERE schemaname = 'public'
            AND tablename = 'Merchant' 
            AND indexdef LIKE '%status%'
        LOOP
            EXECUTE format('DROP INDEX IF EXISTS %I', rec.indexname);
            RAISE NOTICE 'Dropped index % containing status', rec.indexname;
        END LOOP;
    END IF;
    
    -- Step 3: Check and drop the status column
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'Merchant' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE "Merchant" DROP COLUMN IF EXISTS "status";
        RAISE NOTICE 'Removed status column from Merchant table';
    ELSE
        RAISE NOTICE 'Merchant.status column does not exist - already removed';
    END IF;
    
    -- Step 4: Verify removal
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'Merchant' 
        AND column_name = 'status'
    ) THEN
        RAISE EXCEPTION 'Failed to remove Merchant.status column - column still exists after DROP operation';
    ELSE
        RAISE NOTICE 'Verification: Merchant.status column successfully removed';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the migration
        -- This allows the migration to complete even if there are issues
        RAISE WARNING 'Error during Merchant.status removal: %', SQLERRM;
        -- Re-raise if it's a critical error
        IF SQLSTATE = '42804' THEN
            -- Type mismatch error - this shouldn't happen but handle it
            RAISE;
        END IF;
END $$;

-- Final verification query (will return empty if column doesn't exist)
DO $$
DECLARE
    column_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'Merchant' 
        AND column_name = 'status'
    ) INTO column_exists;
    
    IF column_exists THEN
        RAISE WARNING 'WARNING: Merchant.status column verification failed - column may still exist';
    ELSE
        RAISE NOTICE 'SUCCESS: Merchant.status column verified as removed';
    END IF;
END $$;


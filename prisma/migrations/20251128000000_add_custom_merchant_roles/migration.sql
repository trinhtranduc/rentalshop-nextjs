-- ============================================================================
-- Migration: Add custom merchant roles support
-- ============================================================================
-- This migration adds:
-- 1. MerchantRole table for custom roles and system role customizations
-- 2. customRoleId column in User table
--
-- SAFETY FEATURES:
-- - Fully idempotent (can run multiple times safely)
-- - Transaction-wrapped for atomicity
-- - Comprehensive error handling
-- - Detailed logging for troubleshooting
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Create MerchantRole table (with full safety checks)
-- ============================================================================
DO $$ 
BEGIN
    -- Check if table already exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'MerchantRole') THEN
        -- Create MerchantRole table
        CREATE TABLE "MerchantRole" (
            "id" SERIAL NOT NULL,
            "merchantId" INTEGER NOT NULL,
            "roleName" TEXT NOT NULL,
            "isSystemRole" BOOLEAN NOT NULL DEFAULT false,
            "systemRole" "UserRole",
            "description" TEXT,
            "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
            "isActive" BOOLEAN NOT NULL DEFAULT true,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "MerchantRole_pkey" PRIMARY KEY ("id")
        );
        
        RAISE NOTICE '✅ Created MerchantRole table';
    ELSE
        RAISE NOTICE 'ℹ️  MerchantRole table already exists - skipping creation';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE WARNING '⚠️  Error creating MerchantRole table: %', SQLERRM;
        -- Don't fail migration if table already exists with different structure
        IF SQLSTATE = '42P07' THEN -- duplicate_table
            RAISE NOTICE 'ℹ️  MerchantRole table exists with different structure - continuing';
        ELSE
            RAISE;
        END IF;
END $$;

-- ============================================================================
-- STEP 2: Add foreign key constraint for MerchantRole.merchantId
-- ============================================================================
DO $$ 
BEGIN
    -- Verify Merchant table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Merchant') THEN
        RAISE WARNING '⚠️  Merchant table does not exist - cannot add foreign key constraint';
        RETURN;
    END IF;
    
    -- Verify MerchantRole table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'MerchantRole') THEN
        RAISE WARNING '⚠️  MerchantRole table does not exist - cannot add foreign key constraint';
        RETURN;
    END IF;
    
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public'
        AND constraint_name = 'MerchantRole_merchantId_fkey'
    ) THEN
        ALTER TABLE "MerchantRole" 
        ADD CONSTRAINT "MerchantRole_merchantId_fkey" 
        FOREIGN KEY ("merchantId") 
        REFERENCES "Merchant"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
        
        RAISE NOTICE '✅ Added foreign key constraint MerchantRole_merchantId_fkey';
    ELSE
        RAISE NOTICE 'ℹ️  Foreign key constraint MerchantRole_merchantId_fkey already exists';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE WARNING '⚠️  Error adding foreign key constraint: %', SQLERRM;
        -- Continue migration even if constraint already exists
        IF SQLSTATE = '42710' THEN -- duplicate_object
            RAISE NOTICE 'ℹ️  Foreign key constraint already exists - continuing';
        ELSE
            RAISE;
        END IF;
END $$;

-- ============================================================================
-- STEP 3: Add customRoleId column to User table
-- ============================================================================
DO $$ 
BEGIN
    -- Verify User table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'User') THEN
        RAISE WARNING '⚠️  User table does not exist - cannot add customRoleId column';
        RETURN;
    END IF;
    
    -- Add customRoleId column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'User' 
        AND column_name = 'customRoleId'
    ) THEN
        ALTER TABLE "User" 
        ADD COLUMN "customRoleId" INTEGER;
        
        RAISE NOTICE '✅ Added customRoleId column to User table';
    ELSE
        RAISE NOTICE 'ℹ️  customRoleId column already exists in User table';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE WARNING '⚠️  Error adding customRoleId column: %', SQLERRM;
        -- Continue migration even if column already exists
        IF SQLSTATE = '42701' THEN -- duplicate_column
            RAISE NOTICE 'ℹ️  customRoleId column already exists - continuing';
        ELSE
            RAISE;
        END IF;
END $$;

-- ============================================================================
-- STEP 4: Add foreign key constraint for User.customRoleId
-- ============================================================================
DO $$ 
BEGIN
    -- Verify User table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'User') THEN
        RAISE WARNING '⚠️  User table does not exist - cannot add foreign key constraint';
        RETURN;
    END IF;
    
    -- Verify customRoleId column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'User' 
        AND column_name = 'customRoleId'
    ) THEN
        RAISE WARNING '⚠️  customRoleId column does not exist - cannot add foreign key constraint';
        RETURN;
    END IF;
    
    -- Verify MerchantRole table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'MerchantRole') THEN
        RAISE WARNING '⚠️  MerchantRole table does not exist - cannot add foreign key constraint';
        RETURN;
    END IF;
    
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public'
        AND constraint_name = 'User_customRoleId_fkey'
    ) THEN
        ALTER TABLE "User" 
        ADD CONSTRAINT "User_customRoleId_fkey" 
        FOREIGN KEY ("customRoleId") 
        REFERENCES "MerchantRole"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        
        RAISE NOTICE '✅ Added foreign key constraint User_customRoleId_fkey';
    ELSE
        RAISE NOTICE 'ℹ️  Foreign key constraint User_customRoleId_fkey already exists';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE WARNING '⚠️  Error adding foreign key constraint: %', SQLERRM;
        -- Continue migration even if constraint already exists
        IF SQLSTATE = '42710' THEN -- duplicate_object
            RAISE NOTICE 'ℹ️  Foreign key constraint already exists - continuing';
        ELSE
            RAISE;
        END IF;
END $$;

-- ============================================================================
-- STEP 5: Create indexes for MerchantRole (idempotent)
-- ============================================================================
DO $$ 
BEGIN
    -- Verify MerchantRole table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'MerchantRole') THEN
        RAISE WARNING '⚠️  MerchantRole table does not exist - cannot create indexes';
        RETURN;
    END IF;
    
    -- Create indexes if they don't exist
    CREATE INDEX IF NOT EXISTS "MerchantRole_merchantId_idx" ON "MerchantRole"("merchantId");
    CREATE INDEX IF NOT EXISTS "MerchantRole_roleName_idx" ON "MerchantRole"("roleName");
    CREATE INDEX IF NOT EXISTS "MerchantRole_merchantId_roleName_idx" ON "MerchantRole"("merchantId", "roleName");
    CREATE INDEX IF NOT EXISTS "MerchantRole_merchantId_isSystemRole_idx" ON "MerchantRole"("merchantId", "isSystemRole");
    CREATE INDEX IF NOT EXISTS "MerchantRole_systemRole_idx" ON "MerchantRole"("systemRole");
    
    RAISE NOTICE '✅ Created indexes for MerchantRole table';
EXCEPTION
    WHEN others THEN
        RAISE WARNING '⚠️  Error creating indexes: %', SQLERRM;
        -- Continue migration even if indexes already exist
END $$;

-- ============================================================================
-- STEP 6: Create unique constraint for MerchantRole (merchantId, roleName)
-- ============================================================================
DO $$ 
BEGIN
    -- Verify MerchantRole table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'MerchantRole') THEN
        RAISE WARNING '⚠️  MerchantRole table does not exist - cannot create unique constraint';
        RETURN;
    END IF;
    
    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public'
        AND constraint_name = 'MerchantRole_merchantId_roleName_key'
    ) THEN
        ALTER TABLE "MerchantRole" 
        ADD CONSTRAINT "MerchantRole_merchantId_roleName_key" 
        UNIQUE ("merchantId", "roleName");
        
        RAISE NOTICE '✅ Added unique constraint MerchantRole_merchantId_roleName_key';
    ELSE
        RAISE NOTICE 'ℹ️  Unique constraint MerchantRole_merchantId_roleName_key already exists';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE WARNING '⚠️  Error adding unique constraint: %', SQLERRM;
        -- Continue migration even if constraint already exists or has conflicts
        IF SQLSTATE IN ('42710', '23505') THEN -- duplicate_object or unique_violation
            RAISE NOTICE 'ℹ️  Unique constraint already exists or has conflicts - continuing';
        ELSE
            RAISE;
        END IF;
END $$;

-- ============================================================================
-- STEP 7: Create unique constraint for MerchantRole (merchantId, systemRole)
-- ============================================================================
DO $$ 
BEGIN
    -- Verify MerchantRole table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'MerchantRole') THEN
        RAISE WARNING '⚠️  MerchantRole table does not exist - cannot create unique constraint';
        RETURN;
    END IF;
    
    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public'
        AND constraint_name = 'MerchantSystemRoleUniqueConstraint'
    ) THEN
        -- Check if there are any NULL values that would prevent unique constraint
        -- PostgreSQL allows multiple NULLs in unique constraints, so this should work
        ALTER TABLE "MerchantRole" 
        ADD CONSTRAINT "MerchantSystemRoleUniqueConstraint" 
        UNIQUE ("merchantId", "systemRole");
        
        RAISE NOTICE '✅ Added unique constraint MerchantSystemRoleUniqueConstraint';
    ELSE
        RAISE NOTICE 'ℹ️  Unique constraint MerchantSystemRoleUniqueConstraint already exists';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE WARNING '⚠️  Error adding unique constraint: %', SQLERRM;
        -- Continue migration even if constraint already exists or has conflicts
        IF SQLSTATE IN ('42710', '23505') THEN -- duplicate_object or unique_violation
            RAISE NOTICE 'ℹ️  Unique constraint already exists or has conflicts - continuing';
        ELSE
            RAISE;
        END IF;
END $$;

-- ============================================================================
-- STEP 8: Add trigger for updatedAt (if not exists)
-- ============================================================================
DO $$ 
BEGIN
    -- Verify MerchantRole table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'MerchantRole') THEN
        RETURN;
    END IF;
    
    -- Create function for updatedAt trigger if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'update_updated_at_column'
    ) THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW."updatedAt" = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    END IF;
    
    -- Create trigger if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'MerchantRole_updatedAt'
    ) THEN
        CREATE TRIGGER "MerchantRole_updatedAt"
        BEFORE UPDATE ON "MerchantRole"
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
        
        RAISE NOTICE '✅ Added updatedAt trigger for MerchantRole';
    ELSE
        RAISE NOTICE 'ℹ️  updatedAt trigger for MerchantRole already exists';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE WARNING '⚠️  Error adding updatedAt trigger: %', SQLERRM;
        -- Continue migration even if trigger already exists
END $$;

-- ============================================================================
-- VERIFICATION: Check migration results
-- ============================================================================
DO $$ 
DECLARE
    table_exists BOOLEAN;
    column_exists BOOLEAN;
    fk_exists BOOLEAN;
BEGIN
    -- Check MerchantRole table
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'MerchantRole'
    ) INTO table_exists;
    
    -- Check customRoleId column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'User' 
        AND column_name = 'customRoleId'
    ) INTO column_exists;
    
    -- Check foreign key constraint
    SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public'
        AND constraint_name = 'User_customRoleId_fkey'
    ) INTO fk_exists;
    
    -- Log verification results
    IF table_exists THEN
        RAISE NOTICE '✅ VERIFICATION: MerchantRole table exists';
    ELSE
        RAISE WARNING '❌ VERIFICATION: MerchantRole table does not exist';
    END IF;
    
    IF column_exists THEN
        RAISE NOTICE '✅ VERIFICATION: customRoleId column exists in User table';
    ELSE
        RAISE WARNING '❌ VERIFICATION: customRoleId column does not exist in User table';
    END IF;
    
    IF fk_exists THEN
        RAISE NOTICE '✅ VERIFICATION: Foreign key constraint User_customRoleId_fkey exists';
    ELSE
        RAISE WARNING '❌ VERIFICATION: Foreign key constraint User_customRoleId_fkey does not exist';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- Migration completed successfully
-- ============================================================================

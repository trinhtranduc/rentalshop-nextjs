-- Migration: Add custom merchant roles support
-- This migration adds:
-- 1. MerchantRole table for custom roles and system role customizations
-- 2. customRoleId column in User table

-- Step 1: Create MerchantRole table
CREATE TABLE IF NOT EXISTS "MerchantRole" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "roleName" TEXT NOT NULL,
    "isSystemRole" BOOLEAN NOT NULL DEFAULT false,
    "systemRole" "UserRole",
    "description" TEXT,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantRole_pkey" PRIMARY KEY ("id")
);

-- Step 2: Add foreign key constraint for MerchantRole.merchantId
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Merchant') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'MerchantRole_merchantId_fkey'
        ) THEN
            ALTER TABLE "MerchantRole" ADD CONSTRAINT "MerchantRole_merchantId_fkey" 
            FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;

-- Step 3: Add customRoleId column to User table
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'User') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'User' 
            AND column_name = 'customRoleId'
        ) THEN
            ALTER TABLE "User" ADD COLUMN "customRoleId" INTEGER;
            RAISE NOTICE 'Added customRoleId column to User table';
        ELSE
            RAISE NOTICE 'customRoleId column already exists in User table';
        END IF;
    ELSE
        RAISE NOTICE 'User table does not exist - skipping customRoleId column';
    END IF;
END $$;

-- Step 4: Add foreign key constraint for User.customRoleId
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'User') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'customRoleId') THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.table_constraints 
                WHERE constraint_name = 'User_customRoleId_fkey'
            ) THEN
                ALTER TABLE "User" ADD CONSTRAINT "User_customRoleId_fkey" 
                FOREIGN KEY ("customRoleId") REFERENCES "MerchantRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
                RAISE NOTICE 'Added foreign key constraint for User.customRoleId';
            ELSE
                RAISE NOTICE 'Foreign key constraint for User.customRoleId already exists';
            END IF;
        END IF;
    END IF;
END $$;

-- Step 5: Create indexes for MerchantRole
CREATE INDEX IF NOT EXISTS "MerchantRole_merchantId_idx" ON "MerchantRole"("merchantId");
CREATE INDEX IF NOT EXISTS "MerchantRole_roleName_idx" ON "MerchantRole"("roleName");
CREATE INDEX IF NOT EXISTS "MerchantRole_merchantId_roleName_idx" ON "MerchantRole"("merchantId", "roleName");
CREATE INDEX IF NOT EXISTS "MerchantRole_merchantId_isSystemRole_idx" ON "MerchantRole"("merchantId", "isSystemRole");
CREATE INDEX IF NOT EXISTS "MerchantRole_systemRole_idx" ON "MerchantRole"("systemRole");

-- Step 6: Create unique constraint for MerchantRole (merchantId, roleName)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'MerchantRole_merchantId_roleName_key'
    ) THEN
        ALTER TABLE "MerchantRole" ADD CONSTRAINT "MerchantRole_merchantId_roleName_key" 
        UNIQUE ("merchantId", "roleName");
        RAISE NOTICE 'Added unique constraint for MerchantRole (merchantId, roleName)';
    ELSE
        RAISE NOTICE 'Unique constraint for MerchantRole (merchantId, roleName) already exists';
    END IF;
END $$;

-- Step 7: Create unique constraint for MerchantRole (merchantId, systemRole) for system role customizations
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'MerchantSystemRoleUniqueConstraint'
    ) THEN
        -- Only create if there are no NULL values in systemRole for the same merchant
        ALTER TABLE "MerchantRole" ADD CONSTRAINT "MerchantSystemRoleUniqueConstraint" 
        UNIQUE ("merchantId", "systemRole");
        RAISE NOTICE 'Added unique constraint for MerchantRole (merchantId, systemRole)';
    ELSE
        RAISE NOTICE 'Unique constraint for MerchantRole (merchantId, systemRole) already exists';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not create unique constraint for MerchantRole (merchantId, systemRole) - may have NULL values';
END $$;


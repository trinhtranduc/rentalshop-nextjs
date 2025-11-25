-- ============================================================================
-- PRODUCTION-SAFE STATUS MIGRATION
-- ============================================================================
-- This migration safely migrates all status columns to enum types
-- It is idempotent - can be run multiple times without errors
-- Checks for table/column existence before making changes
-- ============================================================================

-- Step 1: Create enum types (only if they don't exist)
DO $$ 
BEGIN
    -- SubscriptionStatus enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SubscriptionStatus') THEN
        CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELLED', 'EXPIRED');
        RAISE NOTICE 'Created SubscriptionStatus enum';
    ELSE
        -- Add PAST_DUE if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PAST_DUE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SubscriptionStatus')) THEN
            ALTER TYPE "SubscriptionStatus" ADD VALUE 'PAST_DUE';
            RAISE NOTICE 'Added PAST_DUE to SubscriptionStatus enum';
        END IF;
    END IF;

    -- OrderStatus enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') THEN
        CREATE TYPE "OrderStatus" AS ENUM ('RESERVED', 'PICKUPED', 'RETURNED', 'COMPLETED', 'CANCELLED');
        RAISE NOTICE 'Created OrderStatus enum';
    END IF;

    -- OrderType enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderType') THEN
        CREATE TYPE "OrderType" AS ENUM ('RENT', 'SALE');
        RAISE NOTICE 'Created OrderType enum';
    END IF;

    -- PaymentStatus enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN
        CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');
        RAISE NOTICE 'Created PaymentStatus enum';
    END IF;

    -- PaymentMethod enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMethod') THEN
        CREATE TYPE "PaymentMethod" AS ENUM ('STRIPE', 'TRANSFER', 'MANUAL', 'CASH', 'CHECK', 'PAYPAL');
        RAISE NOTICE 'Created PaymentMethod enum';
    END IF;

    -- PaymentType enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentType') THEN
        CREATE TYPE "PaymentType" AS ENUM ('ORDER_PAYMENT', 'SUBSCRIPTION_PAYMENT', 'PLAN_CHANGE', 'PLAN_EXTENSION');
        RAISE NOTICE 'Created PaymentType enum';
    END IF;

    -- UserRole enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
        CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF');
        RAISE NOTICE 'Created UserRole enum';
    END IF;
END $$;

-- Step 2: Migrate User.role to UserRole enum (only if table exists and column is not already enum)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'User') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'role') THEN
            -- Check if column is already enum type
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'User' 
                AND column_name = 'role' 
                AND udt_name = 'UserRole'
            ) THEN
                -- Column exists but is not enum - migrate it
                ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
                ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING "role"::"UserRole";
                ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'OUTLET_STAFF'::"UserRole";
                RAISE NOTICE 'Migrated User.role to UserRole enum';
            ELSE
                RAISE NOTICE 'User.role is already UserRole enum - skipping';
            END IF;
        ELSE
            RAISE NOTICE 'User.role column does not exist - skipping';
        END IF;
    ELSE
        RAISE NOTICE 'User table does not exist - skipping';
    END IF;
END $$;

-- Step 3: Migrate Order.orderType to OrderType enum
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Order') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Order' AND column_name = 'orderType') THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'Order' 
                AND column_name = 'orderType' 
                AND udt_name = 'OrderType'
            ) THEN
                ALTER TABLE "Order" ALTER COLUMN "orderType" TYPE "OrderType" USING "orderType"::"OrderType";
                RAISE NOTICE 'Migrated Order.orderType to OrderType enum';
            ELSE
                RAISE NOTICE 'Order.orderType is already OrderType enum - skipping';
            END IF;
        END IF;
    END IF;
END $$;

-- Step 4: Migrate Order.status to OrderStatus enum
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Order') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Order' AND column_name = 'status') THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'Order' 
                AND column_name = 'status' 
                AND udt_name = 'OrderStatus'
            ) THEN
                ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
                ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus" USING "status"::"OrderStatus";
                ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'RESERVED'::"OrderStatus";
                RAISE NOTICE 'Migrated Order.status to OrderStatus enum';
            ELSE
                RAISE NOTICE 'Order.status is already OrderStatus enum - skipping';
            END IF;
        END IF;
    END IF;
END $$;

-- Step 5: Migrate Payment.method to PaymentMethod enum
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Payment') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Payment' AND column_name = 'method') THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'Payment' 
                AND column_name = 'method' 
                AND udt_name = 'PaymentMethod'
            ) THEN
                ALTER TABLE "Payment" ALTER COLUMN "method" TYPE "PaymentMethod" USING "method"::"PaymentMethod";
                RAISE NOTICE 'Migrated Payment.method to PaymentMethod enum';
            ELSE
                RAISE NOTICE 'Payment.method is already PaymentMethod enum - skipping';
            END IF;
        END IF;
    ELSE
        RAISE NOTICE 'Payment table does not exist - skipping Payment.method migration';
    END IF;
END $$;

-- Step 6: Migrate Payment.type to PaymentType enum
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Payment') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Payment' AND column_name = 'type') THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'Payment' 
                AND column_name = 'type' 
                AND udt_name = 'PaymentType'
            ) THEN
                ALTER TABLE "Payment" ALTER COLUMN "type" TYPE "PaymentType" USING "type"::"PaymentType";
                RAISE NOTICE 'Migrated Payment.type to PaymentType enum';
            ELSE
                RAISE NOTICE 'Payment.type is already PaymentType enum - skipping';
            END IF;
        END IF;
    END IF;
END $$;

-- Step 7: Migrate Payment.status to PaymentStatus enum
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Payment') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Payment' AND column_name = 'status') THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'Payment' 
                AND column_name = 'status' 
                AND udt_name = 'PaymentStatus'
            ) THEN
                ALTER TABLE "Payment" ALTER COLUMN "status" DROP DEFAULT;
                ALTER TABLE "Payment" ALTER COLUMN "status" TYPE "PaymentStatus" USING "status"::"PaymentStatus";
                ALTER TABLE "Payment" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"PaymentStatus";
                RAISE NOTICE 'Migrated Payment.status to PaymentStatus enum';
            ELSE
                RAISE NOTICE 'Payment.status is already PaymentStatus enum - skipping';
            END IF;
        END IF;
    END IF;
END $$;

-- Step 8: Ensure Payment.currency column exists (Payment table, NOT PaymentTransaction)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Payment') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'Payment' 
            AND column_name = 'currency'
        ) THEN
            ALTER TABLE "Payment" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
            RAISE NOTICE 'Added currency column to Payment table';
        ELSE
            RAISE NOTICE 'Payment.currency column already exists - skipping';
        END IF;
    ELSE
        RAISE NOTICE 'Payment table does not exist - skipping currency column';
    END IF;
END $$;

-- Step 9: Migrate Subscription.status to SubscriptionStatus enum
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Subscription') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Subscription' AND column_name = 'status') THEN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'Subscription' 
                AND column_name = 'status' 
                AND udt_name = 'SubscriptionStatus'
            ) THEN
                ALTER TABLE "Subscription" ALTER COLUMN "status" DROP DEFAULT;
                ALTER TABLE "Subscription" ALTER COLUMN "status" TYPE "SubscriptionStatus" USING "status"::"SubscriptionStatus";
                ALTER TABLE "Subscription" ALTER COLUMN "status" SET DEFAULT 'TRIAL'::"SubscriptionStatus";
                RAISE NOTICE 'Migrated Subscription.status to SubscriptionStatus enum';
            ELSE
                RAISE NOTICE 'Subscription.status is already SubscriptionStatus enum - skipping';
            END IF;
        END IF;
    END IF;
END $$;

-- Step 10: Cleanup - Remove subscriptionStatus from Merchant if exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Merchant') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Merchant' AND column_name = 'subscriptionStatus') THEN
            ALTER TABLE "Merchant" DROP COLUMN "subscriptionStatus";
            RAISE NOTICE 'Removed subscriptionStatus column from Merchant table';
        END IF;
    END IF;
END $$;

-- Step 11: Drop old index if exists
DROP INDEX IF EXISTS "Merchant_subscriptionStatus_idx";

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All status columns have been safely migrated to enum types
-- This migration is idempotent and can be run multiple times
-- ============================================================================


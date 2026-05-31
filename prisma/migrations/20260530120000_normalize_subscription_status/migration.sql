-- Normalize subscription status values to uppercase
-- This ensures consistency before a future migration to enum type

-- Step 1: Normalize all existing lowercase/mixed-case values to uppercase
UPDATE "Subscription" SET "status" = 'TRIAL' WHERE LOWER("status") = 'trial';
UPDATE "Subscription" SET "status" = 'ACTIVE' WHERE LOWER("status") = 'active';
UPDATE "Subscription" SET "status" = 'PAST_DUE' WHERE LOWER("status") = 'past_due';
UPDATE "Subscription" SET "status" = 'CANCELLED' WHERE LOWER("status") IN ('cancelled', 'canceled');
UPDATE "Subscription" SET "status" = 'PAUSED' WHERE LOWER("status") = 'paused';
UPDATE "Subscription" SET "status" = 'EXPIRED' WHERE LOWER("status") = 'expired';

-- Step 2: Change default value to uppercase
ALTER TABLE "Subscription" ALTER COLUMN "status" SET DEFAULT 'TRIAL';

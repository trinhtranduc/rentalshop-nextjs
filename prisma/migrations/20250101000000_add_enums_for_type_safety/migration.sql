-- Create enum types
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELLED', 'EXPIRED');
CREATE TYPE "OrderStatus" AS ENUM ('RESERVED', 'PICKUPED', 'RETURNED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "OrderType" AS ENUM ('RENT', 'SALE');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');
CREATE TYPE "PaymentMethod" AS ENUM ('STRIPE', 'TRANSFER', 'MANUAL', 'CASH', 'CHECK', 'PAYPAL');
CREATE TYPE "PaymentType" AS ENUM ('ORDER_PAYMENT', 'SUBSCRIPTION_PAYMENT', 'PLAN_CHANGE', 'PLAN_EXTENSION');
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF');

-- Update Subscription.status (already enum, just add PAST_DUE if needed)
-- Note: If SubscriptionStatus enum already exists, this will fail - that's OK
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PAST_DUE' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SubscriptionStatus')) THEN
        ALTER TYPE "SubscriptionStatus" ADD VALUE 'PAST_DUE';
    END IF;
END $$;

-- Update User.role: String -> UserRole enum
ALTER TABLE "User" 
  ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" 
  ALTER COLUMN "role" TYPE "UserRole" 
  USING "role"::"UserRole";
ALTER TABLE "User" 
  ALTER COLUMN "role" SET DEFAULT 'OUTLET_STAFF'::"UserRole";

-- Update Order.orderType: String -> OrderType enum
ALTER TABLE "Order" 
  ALTER COLUMN "orderType" TYPE "OrderType" 
  USING "orderType"::"OrderType";

-- Update Order.status: String -> OrderStatus enum
ALTER TABLE "Order" 
  ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" 
  ALTER COLUMN "status" TYPE "OrderStatus" 
  USING "status"::"OrderStatus";
ALTER TABLE "Order" 
  ALTER COLUMN "status" SET DEFAULT 'RESERVED'::"OrderStatus";

-- Update Payment.method: String -> PaymentMethod enum
ALTER TABLE "Payment" 
  ALTER COLUMN "method" TYPE "PaymentMethod" 
  USING "method"::"PaymentMethod";

-- Update Payment.type: String -> PaymentType enum
ALTER TABLE "Payment" 
  ALTER COLUMN "type" TYPE "PaymentType" 
  USING "type"::"PaymentType";

-- Update Payment.status: String -> PaymentStatus enum
ALTER TABLE "Payment" 
  ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Payment" 
  ALTER COLUMN "status" TYPE "PaymentStatus" 
  USING "status"::"PaymentStatus";
ALTER TABLE "Payment" 
  ALTER COLUMN "status" SET DEFAULT 'PENDING'::"PaymentStatus";

-- Remove subscriptionStatus column from Merchant (use subscription.status instead)
ALTER TABLE "Merchant" DROP COLUMN IF EXISTS "subscriptionStatus";

-- Drop index on subscriptionStatus if it exists
DROP INDEX IF EXISTS "Merchant_subscriptionStatus_idx";


-- DropIndex
DROP INDEX IF EXISTS "Merchant_subscriptionStatus_idx";

-- AlterTable
ALTER TABLE "Merchant" DROP COLUMN IF EXISTS "subscriptionStatus";


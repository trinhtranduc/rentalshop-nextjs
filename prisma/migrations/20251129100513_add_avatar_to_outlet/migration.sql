-- AlterTable: Add avatar to Merchant
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "avatar" TEXT;

-- AlterTable: Add avatar to Outlet
ALTER TABLE "Outlet" ADD COLUMN IF NOT EXISTS "avatar" TEXT;

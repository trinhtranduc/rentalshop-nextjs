-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN "suspendReason" TEXT;
ALTER TABLE "Subscription" ADD COLUMN "suspendedAt" DATETIME;

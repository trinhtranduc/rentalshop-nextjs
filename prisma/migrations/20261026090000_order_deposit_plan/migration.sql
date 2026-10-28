-- #1199 staged deposits ("Thu cọc theo giai đoạn"). Additive and idempotent: nullable columns, no backfill, no new table.
-- Merchant.settings already exists (#1189); the shop payment settings live in settings.payment.
ALTER TABLE "public"."Order"   ADD COLUMN IF NOT EXISTS "depositPlan" JSONB;
ALTER TABLE "public"."Order"   ADD COLUMN IF NOT EXISTS "cancelKeptAmount" DOUBLE PRECISION;
ALTER TABLE "public"."Order"   ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);
ALTER TABLE "public"."Payment" ADD COLUMN IF NOT EXISTS "installmentKey" TEXT;

CREATE INDEX IF NOT EXISTS "Payment_status_processedAt_idx" ON "public"."Payment"("status", "processedAt");

-- Raw SQL (Prisma cannot express a partial unique index): one COMPLETED collection per stage of an order.
-- REFUNDED / CANCELLED rows free the slot, so a wrongly collected stage can be voided and collected again.
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_orderId_installmentKey_completed_key"
  ON "public"."Payment" ("orderId", "installmentKey")
  WHERE "installmentKey" IS NOT NULL AND "status" = 'COMPLETED';

-- #1482: date of a refund. Nullable, no default, no backfill (older refunds fall back to "updatedAt" in the revenue report).
ALTER TABLE "Payment" ADD COLUMN "refundedAt" TIMESTAMP(3);

-- Refund lookups of the admin revenue report: status REFUNDED, refunded within a month.
CREATE INDEX "Payment_status_refundedAt_idx" ON "Payment"("status", "refundedAt");

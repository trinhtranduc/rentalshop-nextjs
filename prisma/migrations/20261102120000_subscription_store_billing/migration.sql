-- #1459 plan renewal in the apps (App Store, Google Play through RevenueCat).
-- Additive and idempotent: nullable columns or a default, one new table, no backfill. Code from before this migration
-- never reads the new columns; rows it creates get autoRenew = false and NULL channel (= MANUAL in the API).
ALTER TABLE "public"."Subscription" ADD COLUMN IF NOT EXISTS "billingChannel" TEXT;
ALTER TABLE "public"."Subscription" ADD COLUMN IF NOT EXISTS "storeProductId" TEXT;
ALTER TABLE "public"."Subscription" ADD COLUMN IF NOT EXISTS "storeOriginalTransactionId" TEXT;
ALTER TABLE "public"."Subscription" ADD COLUMN IF NOT EXISTS "autoRenew" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "public"."Subscription" ADD COLUMN IF NOT EXISTS "billingIssueAt" TIMESTAMP(3);
-- Time of the last store event applied (RevenueCat event_timestamp_ms): an older event retried later is skipped.
ALTER TABLE "public"."Subscription" ADD COLUMN IF NOT EXISTS "lastStoreEventAt" TIMESTAMP(3);

-- Billing webhook events already processed (RevenueCat event.id): a resent event changes nothing.
CREATE TABLE IF NOT EXISTS "public"."BillingWebhookEvent" (
    "id" SERIAL NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "merchantId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "BillingWebhookEvent_provider_eventId_key" ON "public"."BillingWebhookEvent"("provider", "eventId");
CREATE INDEX IF NOT EXISTS "BillingWebhookEvent_merchantId_idx" ON "public"."BillingWebhookEvent"("merchantId");
CREATE INDEX IF NOT EXISTS "BillingWebhookEvent_createdAt_idx" ON "public"."BillingWebhookEvent"("createdAt");

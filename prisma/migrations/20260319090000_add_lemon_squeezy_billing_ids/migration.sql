-- Add Lemon Squeezy billing identifiers and plan variant mapping
-- Note: these fields are optional to avoid breaking existing data.

ALTER TABLE "Merchant"
ADD COLUMN "lemonCustomerId" TEXT;

CREATE UNIQUE INDEX "Merchant_lemonCustomerId_key"
ON "Merchant"("lemonCustomerId");

ALTER TABLE "Subscription"
ADD COLUMN "lemonSubscriptionId" TEXT;

CREATE UNIQUE INDEX "Subscription_lemonSubscriptionId_key"
ON "Subscription"("lemonSubscriptionId");

CREATE TABLE "PlanLemonSqueezyVariant" (
  "id" SERIAL NOT NULL,
  "planId" INTEGER NOT NULL,
  "billingInterval" "PlanBillingInterval" NOT NULL,
  "lemonVariantId" TEXT NOT NULL,
  "lemonStoreId" TEXT,
  "currency" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlanLemonSqueezyVariant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlanLemonSqueezyVariant_planId_billingInterval_key"
ON "PlanLemonSqueezyVariant"("planId", "billingInterval");

CREATE INDEX "PlanLemonSqueezyVariant_planId_idx"
ON "PlanLemonSqueezyVariant"("planId");

CREATE INDEX "PlanLemonSqueezyVariant_billingInterval_idx"
ON "PlanLemonSqueezyVariant"("billingInterval");

CREATE INDEX "PlanLemonSqueezyVariant_isActive_idx"
ON "PlanLemonSqueezyVariant"("isActive");

ALTER TABLE "PlanLemonSqueezyVariant"
ADD CONSTRAINT "PlanLemonSqueezyVariant_planId_fkey"
FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;


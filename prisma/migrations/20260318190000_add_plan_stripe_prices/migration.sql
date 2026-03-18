-- Add PlanStripePrice mapping table for Stripe prices by billing interval

-- Enum for billing intervals
DO $$ BEGIN
  CREATE TYPE "PlanBillingInterval" AS ENUM ('monthly', 'quarterly', 'semi_annual', 'annual');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "PlanStripePrice" (
  "id" SERIAL PRIMARY KEY,
  "planId" INTEGER NOT NULL,
  "billingInterval" "PlanBillingInterval" NOT NULL,
  "stripePriceId" TEXT NOT NULL,
  "currency" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlanStripePrice_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "Plan"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Uniqueness: one Stripe price per interval per plan
CREATE UNIQUE INDEX IF NOT EXISTS "PlanStripePrice_planId_billingInterval_key"
  ON "PlanStripePrice"("planId", "billingInterval");

-- Uniqueness: Stripe price IDs are globally unique
CREATE UNIQUE INDEX IF NOT EXISTS "PlanStripePrice_stripePriceId_key"
  ON "PlanStripePrice"("stripePriceId");

CREATE INDEX IF NOT EXISTS "PlanStripePrice_planId_idx"
  ON "PlanStripePrice"("planId");

CREATE INDEX IF NOT EXISTS "PlanStripePrice_billingInterval_idx"
  ON "PlanStripePrice"("billingInterval");

CREATE INDEX IF NOT EXISTS "PlanStripePrice_isActive_idx"
  ON "PlanStripePrice"("isActive");


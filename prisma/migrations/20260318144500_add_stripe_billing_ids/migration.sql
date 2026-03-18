-- Add Stripe billing identifiers (customer/subscription/price)
-- Note: these fields are optional to avoid breaking existing data.

ALTER TABLE "Merchant"
ADD COLUMN "stripeCustomerId" TEXT;

CREATE UNIQUE INDEX "Merchant_stripeCustomerId_key"
ON "Merchant"("stripeCustomerId");

ALTER TABLE "Plan"
ADD COLUMN "stripePriceId" TEXT;

CREATE UNIQUE INDEX "Plan_stripePriceId_key"
ON "Plan"("stripePriceId");

ALTER TABLE "Subscription"
ADD COLUMN "stripeSubscriptionId" TEXT;

CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key"
ON "Subscription"("stripeSubscriptionId");


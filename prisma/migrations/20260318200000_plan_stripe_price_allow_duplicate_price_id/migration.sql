-- Allow same Stripe Price ID in multiple (planId, billingInterval) rows.
-- Save overwrites by (planId, billingInterval) only; no global unique on stripePriceId.
DROP INDEX IF EXISTS "PlanStripePrice_stripePriceId_key";

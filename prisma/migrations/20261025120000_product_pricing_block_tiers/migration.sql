-- #1189 day-block rental pricing. Additive and nullable only: old API code ignores the new columns.
-- BLOCK already exists in the "PricingType" enum, so no ALTER TYPE.
ALTER TABLE "public"."ProductPricingOption" ADD COLUMN     "blockTiers" JSONB,
ADD COLUMN     "blockStartDay" INTEGER,
ADD COLUMN     "blockExtraMode" TEXT,
ADD COLUMN     "blockExtraPrice" DOUBLE PRECISION;

ALTER TABLE "public"."OrderItem" ADD COLUMN     "pricingSnapshot" JSONB;

-- Shop settings JSON, shared with later features (installments); IF NOT EXISTS so either PR can land first.
ALTER TABLE "public"."Merchant" ADD COLUMN IF NOT EXISTS "settings" JSONB;

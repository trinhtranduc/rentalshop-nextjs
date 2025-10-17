-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN "pricingConfig" TEXT DEFAULT '{"businessType":"GENERAL","defaultPricingType":"FIXED","businessRules":{"requireRentalDates":false,"showPricingOptions":false},"durationLimits":{"minDuration":1,"maxDuration":1,"defaultDuration":1}}';
ALTER TABLE "Merchant" ADD COLUMN "pricingType" TEXT;

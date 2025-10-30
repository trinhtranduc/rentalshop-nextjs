-- Create enums if not exist
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BusinessType') THEN
    CREATE TYPE "BusinessType" AS ENUM ('GENERAL','VEHICLE','CLOTHING','EQUIPMENT');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PricingType') THEN
    CREATE TYPE "PricingType" AS ENUM ('FIXED','HOURLY','DAILY');
  END IF;
END $$;

-- Migrate Merchant.businessType from text to enum
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "businessType_tmp" "BusinessType" NOT NULL DEFAULT 'GENERAL';

UPDATE "Merchant"
SET "businessType_tmp" = CASE UPPER(COALESCE("businessType", 'GENERAL'))
  WHEN 'GENERAL' THEN 'GENERAL'::"BusinessType"
  WHEN 'VEHICLE' THEN 'VEHICLE'::"BusinessType"
  WHEN 'CLOTHING' THEN 'CLOTHING'::"BusinessType"
  WHEN 'EQUIPMENT' THEN 'EQUIPMENT'::"BusinessType"
  ELSE 'GENERAL'::"BusinessType"
END;

ALTER TABLE "Merchant" DROP COLUMN IF EXISTS "businessType";
ALTER TABLE "Merchant" RENAME COLUMN "businessType_tmp" TO "businessType";
ALTER TABLE "Merchant" ALTER COLUMN "businessType" SET DEFAULT 'GENERAL';

-- Migrate Merchant.pricingType from text to enum
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "pricingType_tmp" "PricingType" NOT NULL DEFAULT 'FIXED';

UPDATE "Merchant"
SET "pricingType_tmp" = CASE UPPER(COALESCE("pricingType", 'FIXED'))
  WHEN 'FIXED' THEN 'FIXED'::"PricingType"
  WHEN 'HOURLY' THEN 'HOURLY'::"PricingType"
  WHEN 'DAILY' THEN 'DAILY'::"PricingType"
  ELSE 'FIXED'::"PricingType"
END;

ALTER TABLE "Merchant" DROP COLUMN IF EXISTS "pricingType";
ALTER TABLE "Merchant" RENAME COLUMN "pricingType_tmp" TO "pricingType";
ALTER TABLE "Merchant" ALTER COLUMN "pricingType" SET DEFAULT 'FIXED';

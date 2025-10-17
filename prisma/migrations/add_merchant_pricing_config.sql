-- Migration: Add merchant pricing configuration
-- Description: Add pricingConfig column to Merchant table for merchant-level pricing configuration

-- Add pricing configuration to Merchant table
ALTER TABLE Merchant ADD COLUMN pricingConfig TEXT DEFAULT '{
  "businessType": "GENERAL",
  "defaultPricingType": "FIXED",
  "businessRules": {
    "requireRentalDates": true,
    "showPricingOptions": true
  },
  "durationLimits": {
    "minDuration": 1,
    "maxDuration": 365,
    "defaultDuration": 1
  }
}';

-- Add index for performance
CREATE INDEX idx_merchant_pricing_config ON Merchant(pricingConfig);

-- Update existing merchants with default pricing config
UPDATE Merchant 
SET pricingConfig = '{
  "businessType": "GENERAL",
  "defaultPricingType": "FIXED",
  "businessRules": {
    "requireRentalDates": false,
    "showPricingOptions": false
  },
  "durationLimits": {
    "minDuration": 1,
    "maxDuration": 1,
    "defaultDuration": 1
  }
}'
WHERE pricingConfig IS NULL;

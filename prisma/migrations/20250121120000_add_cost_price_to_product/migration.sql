-- Add costPrice column to Product table
-- This field stores the purchase cost (giá vốn) for profit calculation

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "costPrice" DOUBLE PRECISION;

-- Note: costPrice is optional (nullable) - existing products will have NULL
-- This allows merchants to track purchase cost for profit margin calculation
-- Example: rentPrice = 100,000 VND, costPrice = 60,000 VND → profit = 40,000 VND


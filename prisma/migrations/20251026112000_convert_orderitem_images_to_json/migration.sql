-- Convert OrderItem.productImages from String to Json
-- This migration safely converts comma-separated image strings to JSON arrays

-- Step 1: Add a temporary column for the new JSON data
ALTER TABLE "OrderItem" ADD COLUMN "productImages_temp" JSONB;

-- Step 2: Convert existing string data to JSON arrays
UPDATE "OrderItem" 
SET "productImages_temp" = CASE 
  WHEN "productImages" IS NULL THEN NULL
  WHEN "productImages" = '' THEN NULL
  ELSE to_json(string_to_array("productImages", ','))
END;

-- Step 3: Drop the old string column
ALTER TABLE "OrderItem" DROP COLUMN "productImages";

-- Step 4: Rename the temporary column to the original name
ALTER TABLE "OrderItem" RENAME COLUMN "productImages_temp" TO "productImages";

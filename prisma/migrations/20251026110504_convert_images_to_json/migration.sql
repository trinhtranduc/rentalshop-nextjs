-- Convert Product.images from String to Json
-- This migration safely converts comma-separated image strings to JSON arrays

-- Step 1: Add a temporary column for the new JSON data
ALTER TABLE "Product" ADD COLUMN "images_temp" JSONB;

-- Step 2: Convert existing string data to JSON arrays
UPDATE "Product" 
SET "images_temp" = CASE 
  WHEN "images" IS NULL THEN NULL
  WHEN "images" = '' THEN NULL
  ELSE to_json(string_to_array("images", ','))
END;

-- Step 3: Drop the old string column
ALTER TABLE "Product" DROP COLUMN "images";

-- Step 4: Rename the temporary column to the original name
ALTER TABLE "Product" RENAME COLUMN "images_temp" TO "images";

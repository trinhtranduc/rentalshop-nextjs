-- AlterTable: Make OrderItem.productId nullable with ON DELETE SET NULL
-- This allows products to be deleted even when referenced by order items.
-- OrderItem preserves history via snapshot fields (productName, productBarcode, productImages).

-- Enable unaccent extension for diacritics-insensitive search
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Step 1: Make productId nullable
ALTER TABLE "OrderItem" ALTER COLUMN "productId" DROP NOT NULL;

-- Step 2: Drop existing foreign key constraint
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_productId_fkey";

-- Step 3: Re-add foreign key with ON DELETE SET NULL
ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

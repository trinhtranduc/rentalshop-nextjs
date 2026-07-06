-- Migration: Allow product deletion by setting OrderItem.productId to NULL
-- OrderItem already stores snapshot data (productName, productBarcode, productImages)
-- so order history is preserved even after product deletion.

-- Step 1: Make productId nullable
ALTER TABLE "OrderItem" ALTER COLUMN "productId" DROP NOT NULL;

-- Step 2: Drop existing foreign key constraint
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_productId_fkey";

-- Step 3: Re-add foreign key with ON DELETE SET NULL
ALTER TABLE "OrderItem" 
  ADD CONSTRAINT "OrderItem_productId_fkey" 
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

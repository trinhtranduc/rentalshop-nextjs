-- Step 1: Add new columns (nullable first)
ALTER TABLE "OrderItem" ADD COLUMN "productName" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "productBarcode" TEXT;

-- Step 2: Populate existing records with product data
UPDATE "OrderItem" oi
SET 
  "productName" = p.name,
  "productBarcode" = p.barcode
FROM "Product" p
WHERE oi."productId" = p.id;

-- Step 3: Make productName NOT NULL (after populating)
ALTER TABLE "OrderItem" ALTER COLUMN "productName" SET NOT NULL;

-- Step 4: Make productId nullable (allow deletion of products)
ALTER TABLE "OrderItem" ALTER COLUMN "productId" DROP NOT NULL;

-- Step 5: Update foreign key constraint to SET NULL on delete
ALTER TABLE "OrderItem" DROP CONSTRAINT "OrderItem_productId_fkey";
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" 
  FOREIGN KEY ("productId") REFERENCES "Product"(id) ON DELETE SET NULL ON UPDATE CASCADE;


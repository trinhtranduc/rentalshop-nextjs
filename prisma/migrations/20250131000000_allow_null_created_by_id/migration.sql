-- AlterTable: Allow createdById to be nullable and add onDelete: SetNull
-- This allows deleting users without foreign key constraint violations

-- Step 1: Drop existing foreign key constraint
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_createdById_fkey";

-- Step 2: Alter column to allow NULL
ALTER TABLE "Order" ALTER COLUMN "createdById" DROP NOT NULL;

-- Step 3: Re-add foreign key constraint with onDelete: SetNull
ALTER TABLE "Order" ADD CONSTRAINT "Order_createdById_fkey" 
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

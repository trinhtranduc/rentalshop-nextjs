-- AlterTable
ALTER TABLE "Category" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- Update existing "General" categories to be default
UPDATE "Category" SET "isDefault" = true WHERE "name" = 'General';


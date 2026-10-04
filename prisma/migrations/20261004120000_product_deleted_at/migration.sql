-- #389 Product soft delete: nullable column, no default, no backfill (additive)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

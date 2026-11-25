-- #1646: the shop shows units left (or "Hết") on the public booking calendar. Off by default.
-- Additive with a default: old API code never reads it, so rolling back the code needs no schema change.
-- IF NOT EXISTS: safe when the column was already added by hand on dev.
ALTER TABLE "Merchant" ADD COLUMN IF NOT EXISTS "showPublicStock" BOOLEAN NOT NULL DEFAULT false;

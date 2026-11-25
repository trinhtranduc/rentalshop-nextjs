-- #1643: links of a branch (web, Facebook, Instagram, TikTok, YouTube, Zalo, other) for the public shop page.
-- Additive and nullable: old API code never reads or writes it, so rolling back the code needs no schema change.
ALTER TABLE "Outlet" ADD COLUMN "links" JSONB;

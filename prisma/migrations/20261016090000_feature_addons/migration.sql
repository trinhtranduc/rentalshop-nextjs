-- #943 attendance sold as a feature add-on. Additive only: two nullable columns and one index.
-- A feature row of the price list has limitKind 'feature', packSize 1 and a featureKey (module key).
-- A shop's feature item keeps all five limit columns at 0, so the limit checks do not change.
ALTER TABLE "AddonPrice" ADD COLUMN IF NOT EXISTS "featureKey" TEXT;
ALTER TABLE "PlanLimitAddon" ADD COLUMN IF NOT EXISTS "featureKey" TEXT;
CREATE INDEX IF NOT EXISTS "PlanLimitAddon_merchantId_featureKey_idx" ON "PlanLimitAddon"("merchantId", "featureKey");

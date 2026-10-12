-- #870: fewer packs of a shop's add-on take effect at the next renewal. NULL = no pending change.
ALTER TABLE "public"."PlanLimitAddon" ADD COLUMN "nextPacks" INTEGER;

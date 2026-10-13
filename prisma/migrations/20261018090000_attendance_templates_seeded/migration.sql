-- #959 Mark when an outlet got its four ready-made shift templates (nullable, no backfill: set on first load).
ALTER TABLE "AttendanceSetting" ADD COLUMN "templatesSeededAt" TIMESTAMP(3);

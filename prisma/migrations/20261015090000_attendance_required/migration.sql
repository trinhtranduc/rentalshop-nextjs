-- #927 who must clock in: nullable, null = role default (no backfill)
ALTER TABLE "User" ADD COLUMN "attendanceRequired" BOOLEAN;

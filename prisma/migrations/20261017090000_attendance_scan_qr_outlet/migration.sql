-- #949 QR_WRONG_OUTLET scans: the outlet of the scanned code (nullable, no backfill)
ALTER TABLE "AttendanceScan" ADD COLUMN "qrOutletId" INTEGER;

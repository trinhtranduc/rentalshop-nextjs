-- #347: per-outlet note printed at the bottom of RENT receipts.
ALTER TABLE "public"."Outlet" ADD COLUMN "printNote" TEXT;

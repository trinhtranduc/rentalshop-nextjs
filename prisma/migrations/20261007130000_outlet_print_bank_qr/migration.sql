-- #628: per-outlet switch to print the default bank account + VietQR on bills (synced web <-> mobile).
ALTER TABLE "public"."Outlet" ADD COLUMN "printBankQr" BOOLEAN NOT NULL DEFAULT false;

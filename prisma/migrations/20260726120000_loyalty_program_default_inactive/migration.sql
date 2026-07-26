-- Default new loyalty programs to inactive.
-- Existing rows keep their current isActive value (Super Admin controls enable/disable).
ALTER TABLE "LoyaltyProgram" ALTER COLUMN "isActive" SET DEFAULT false;

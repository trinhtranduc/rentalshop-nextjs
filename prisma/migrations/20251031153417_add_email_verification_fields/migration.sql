-- Migration: Add email verification fields to User table
-- Run this migration manually if Prisma migrate is not available

-- Add emailVerified field
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;

-- Add emailVerifiedAt field
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "emailVerifiedAt" TIMESTAMP;

-- Create index for emailVerified (for efficient queries)
CREATE INDEX IF NOT EXISTS "User_emailVerified_idx" ON "User"("emailVerified");

-- Update existing users to have emailVerified = false (if not set)
UPDATE "User" 
SET "emailVerified" = false 
WHERE "emailVerified" IS NULL;


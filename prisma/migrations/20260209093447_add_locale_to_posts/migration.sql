-- AlterTable
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "locale" TEXT NOT NULL DEFAULT 'vi';

-- DropIndex
DROP INDEX IF EXISTS "Post_slug_key";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Post_locale_idx" ON "Post"("locale");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Post_locale_status_idx" ON "Post"("locale", "status");

-- CreateUniqueConstraint
CREATE UNIQUE INDEX IF NOT EXISTS "Post_slug_locale_key" ON "Post"("slug", "locale");

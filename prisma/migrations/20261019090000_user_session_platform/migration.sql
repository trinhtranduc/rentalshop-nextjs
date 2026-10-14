-- #660: one phone session + one web session per account. Nullable: old rows stay NULL ("any platform").
ALTER TABLE "public"."UserSession" ADD COLUMN "platform" TEXT;

-- CreateIndex
CREATE INDEX "UserSession_userId_isActive_platform_idx" ON "public"."UserSession"("userId", "isActive", "platform");

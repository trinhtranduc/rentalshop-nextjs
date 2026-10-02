-- #343: sliding mobile sessions and refresh tokens bound to a session.

ALTER TABLE "public"."UserSession" ADD COLUMN "absoluteExpiresAt" TIMESTAMP(3);
ALTER TABLE "public"."UserSession" ADD COLUMN "idleTimeoutDays" INTEGER;

ALTER TABLE "public"."RefreshToken" ADD COLUMN "sessionId" TEXT;
CREATE INDEX "RefreshToken_sessionId_idx" ON "public"."RefreshToken"("sessionId");

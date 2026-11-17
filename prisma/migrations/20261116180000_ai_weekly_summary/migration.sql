-- CreateTable
CREATE TABLE "public"."AiWeeklySummary" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "outletId" INTEGER,
    "scopeKey" TEXT NOT NULL,
    "weekStart" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "language" TEXT,
    "model" TEXT,
    "numbers" JSONB,
    "content" JSONB,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiWeeklySummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiWeeklySummary_merchantId_idx" ON "public"."AiWeeklySummary"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "AiWeeklySummary_scopeKey_weekStart_key" ON "public"."AiWeeklySummary"("scopeKey", "weekStart");

-- AddForeignKey
ALTER TABLE "public"."AiWeeklySummary" ADD CONSTRAINT "AiWeeklySummary_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "public"."Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


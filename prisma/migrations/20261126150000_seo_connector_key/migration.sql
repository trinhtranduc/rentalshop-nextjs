-- #1665: Idempotency-Key of a write call from the SEO Agent Hub connector (/api/seo-connector/v1).
-- New table only (additive); old API code never reads it, so rolling back the code needs no schema change.
-- Rows older than 7 days can be deleted.
CREATE TABLE IF NOT EXISTS "SeoConnectorKey" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "status" INTEGER NOT NULL DEFAULT 200,
    "response" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SeoConnectorKey_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SeoConnectorKey_key_key" ON "SeoConnectorKey"("key");

CREATE INDEX IF NOT EXISTS "SeoConnectorKey_createdAt_idx" ON "SeoConnectorKey"("createdAt");

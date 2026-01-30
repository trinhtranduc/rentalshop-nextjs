-- AlterTable
ALTER TABLE "Product" ADD COLUMN "embeddingGeneratedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Product_embeddingGeneratedAt_idx" ON "Product"("embeddingGeneratedAt");

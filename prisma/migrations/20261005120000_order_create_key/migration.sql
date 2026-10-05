-- CreateTable
CREATE TABLE "public"."OrderCreateKey" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderCreateKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderCreateKey_createdAt_idx" ON "public"."OrderCreateKey"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrderCreateKey_userId_key_key" ON "public"."OrderCreateKey"("userId", "key");


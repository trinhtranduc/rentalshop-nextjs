-- CreateTable
CREATE TABLE "public"."PlanLimitAddon" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "outlets" INTEGER NOT NULL DEFAULT 0,
    "users" INTEGER NOT NULL DEFAULT 0,
    "products" INTEGER NOT NULL DEFAULT 0,
    "customers" INTEGER NOT NULL DEFAULT 0,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanLimitAddon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlanLimitAddon_merchantId_idx" ON "public"."PlanLimitAddon"("merchantId");

-- CreateIndex
CREATE INDEX "PlanLimitAddon_isActive_idx" ON "public"."PlanLimitAddon"("isActive");

-- CreateIndex
CREATE INDEX "PlanLimitAddon_merchantId_isActive_idx" ON "public"."PlanLimitAddon"("merchantId", "isActive");

-- CreateIndex
CREATE INDEX "PlanLimitAddon_createdAt_idx" ON "public"."PlanLimitAddon"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."PlanLimitAddon" ADD CONSTRAINT "PlanLimitAddon_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "public"."Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;


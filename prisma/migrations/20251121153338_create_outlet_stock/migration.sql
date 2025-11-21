-- CreateTable
CREATE TABLE IF NOT EXISTS "OutletStock" (
    "id" SERIAL NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "available" INTEGER NOT NULL DEFAULT 0,
    "renting" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productId" INTEGER NOT NULL,
    "outletId" INTEGER NOT NULL,

    CONSTRAINT "OutletStock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "OutletStock_productId_outletId_key" ON "OutletStock"("productId", "outletId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OutletStock_outletId_available_idx" ON "OutletStock"("outletId", "available");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OutletStock_productId_idx" ON "OutletStock"("productId");

-- AddForeignKey
ALTER TABLE "OutletStock" ADD CONSTRAINT IF NOT EXISTS "OutletStock_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutletStock" ADD CONSTRAINT IF NOT EXISTS "OutletStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;


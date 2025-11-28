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
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public'
        AND constraint_name = 'OutletStock_outletId_fkey'
    ) THEN
        ALTER TABLE "OutletStock" ADD CONSTRAINT "OutletStock_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public'
        AND constraint_name = 'OutletStock_productId_fkey'
    ) THEN
        ALTER TABLE "OutletStock" ADD CONSTRAINT "OutletStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;


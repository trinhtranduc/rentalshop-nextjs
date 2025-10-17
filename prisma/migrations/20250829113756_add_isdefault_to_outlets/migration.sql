-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Outlet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "merchantId" TEXT NOT NULL,
    "phone" TEXT,
    CONSTRAINT "Outlet_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Outlet" ("address", "createdAt", "description", "id", "isActive", "merchantId", "name", "phone", "publicId", "updatedAt") SELECT "address", "createdAt", "description", "id", "isActive", "merchantId", "name", "phone", "publicId", "updatedAt" FROM "Outlet";
DROP TABLE "Outlet";
ALTER TABLE "new_Outlet" RENAME TO "Outlet";
CREATE UNIQUE INDEX "Outlet_publicId_key" ON "Outlet"("publicId");
CREATE INDEX "Outlet_merchantId_idx" ON "Outlet"("merchantId");
CREATE INDEX "Outlet_name_idx" ON "Outlet"("name");
CREATE INDEX "Outlet_publicId_idx" ON "Outlet"("publicId");
CREATE INDEX "Outlet_isDefault_idx" ON "Outlet"("isDefault");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

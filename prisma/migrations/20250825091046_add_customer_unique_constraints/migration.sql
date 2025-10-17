-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "publicId" INTEGER NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zipCode" TEXT,
    "country" TEXT,
    "dateOfBirth" DATETIME,
    "idNumber" TEXT,
    "idType" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "merchantId" TEXT NOT NULL,
    CONSTRAINT "Customer_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Customer" ("address", "city", "country", "createdAt", "dateOfBirth", "email", "firstName", "id", "idNumber", "idType", "isActive", "lastName", "merchantId", "notes", "phone", "publicId", "state", "updatedAt", "zipCode") SELECT "address", "city", "country", "createdAt", "dateOfBirth", "email", "firstName", "id", "idNumber", "idType", "isActive", "lastName", "merchantId", "notes", "phone", "publicId", "state", "updatedAt", "zipCode" FROM "Customer";
DROP TABLE "Customer";
ALTER TABLE "new_Customer" RENAME TO "Customer";
CREATE UNIQUE INDEX "Customer_publicId_key" ON "Customer"("publicId");
CREATE INDEX "Customer_merchantId_firstName_lastName_idx" ON "Customer"("merchantId", "firstName", "lastName");
CREATE INDEX "Customer_publicId_idx" ON "Customer"("publicId");
CREATE UNIQUE INDEX "Customer_merchantId_phone_key" ON "Customer"("merchantId", "phone");
CREATE UNIQUE INDEX "unique_merchant_email" ON "Customer"("merchantId", "email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

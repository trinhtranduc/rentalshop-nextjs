-- CreateTable
CREATE TABLE "public"."BankAccount" (
    "id" SERIAL NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankCode" TEXT,
    "branch" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "qrCode" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "outletId" INTEGER NOT NULL,

    CONSTRAINT "BankAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankAccount_outletId_idx" ON "public"."BankAccount"("outletId");

-- CreateIndex
CREATE INDEX "BankAccount_outletId_isDefault_idx" ON "public"."BankAccount"("outletId", "isDefault");

-- CreateIndex
CREATE INDEX "BankAccount_outletId_isActive_idx" ON "public"."BankAccount"("outletId", "isActive");

-- AddForeignKey
ALTER TABLE "public"."BankAccount" ADD CONSTRAINT "BankAccount_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "public"."Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- #1124 Đặt đơn online. Additive only: a new enum and two new tables; two new columns with defaults
-- (onlineBookingEnabled false = every shop stays as today; acceptsOnlineBooking true = no effect until a shop turns
-- booking on). Old API code runs on this schema unchanged; rollback = revert the code, the tables stay unused.

-- CreateEnum
CREATE TYPE "public"."BookingRequestStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "public"."Merchant" ADD COLUMN     "onlineBookingEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."Outlet" ADD COLUMN     "acceptsOnlineBooking" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "public"."BookingRequest" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "outletId" INTEGER NOT NULL,
    "status" "public"."BookingRequestStatus" NOT NULL DEFAULT 'PENDING',
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "note" TEXT,
    "pickupPlanAt" TIMESTAMP(3) NOT NULL,
    "returnPlanAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "rejectReason" TEXT,
    "rejectNote" TEXT,
    "orderId" INTEGER,
    "customerId" INTEGER,
    "decidedById" INTEGER,
    "decidedAt" TIMESTAMP(3),
    "clientIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BookingRequestItem" (
    "id" SERIAL NOT NULL,
    "requestId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,
    "unitPrice" DOUBLE PRECISION,

    CONSTRAINT "BookingRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BookingRequest_code_key" ON "public"."BookingRequest"("code");

-- CreateIndex
CREATE UNIQUE INDEX "BookingRequest_orderId_key" ON "public"."BookingRequest"("orderId");

-- CreateIndex
CREATE INDEX "BookingRequest_merchantId_status_createdAt_idx" ON "public"."BookingRequest"("merchantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "BookingRequest_outletId_status_idx" ON "public"."BookingRequest"("outletId", "status");

-- CreateIndex
CREATE INDEX "BookingRequest_customerPhone_createdAt_idx" ON "public"."BookingRequest"("customerPhone", "createdAt");

-- CreateIndex
CREATE INDEX "BookingRequestItem_requestId_idx" ON "public"."BookingRequestItem"("requestId");

-- AddForeignKey
ALTER TABLE "public"."BookingRequestItem" ADD CONSTRAINT "BookingRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "public"."BookingRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;


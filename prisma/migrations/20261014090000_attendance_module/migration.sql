-- #907 attendance module part 1: feature modules per merchant + attendance tables. New tables only (additive).
-- CreateTable
CREATE TABLE "public"."MerchantModule" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "endsAt" TIMESTAMP(3),
    "updatedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AttendanceSetting" (
    "id" SERIAL NOT NULL,
    "outletId" INTEGER NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "radiusM" INTEGER NOT NULL DEFAULT 100,
    "qrMode" TEXT NOT NULL DEFAULT 'DAILY',
    "qrVersion" INTEGER NOT NULL DEFAULT 0,
    "qrCreatedAt" TIMESTAMP(3),
    "kioskToken" TEXT,
    "kioskTokenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShiftTemplate" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "outletId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT 'blue',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShiftRule" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "outletId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "templateId" INTEGER NOT NULL,
    "weekdays" INTEGER[],
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ShiftDay" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "outletId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "dateKey" TEXT NOT NULL,
    "off" BOOLEAN NOT NULL DEFAULT false,
    "templateId" INTEGER,
    "startTime" TEXT,
    "endTime" TEXT,
    "breakMinutes" INTEGER,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShiftDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AttendanceRecord" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "outletId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "dateKey" TEXT NOT NULL,
    "shiftTemplateId" INTEGER,
    "shiftName" TEXT,
    "shiftStart" TEXT,
    "shiftEnd" TEXT,
    "shiftBreak" INTEGER,
    "checkInAt" TIMESTAMP(3) NOT NULL,
    "checkOutAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "closeAt" TIMESTAMP(3),
    "inLatitude" DOUBLE PRECISION,
    "inLongitude" DOUBLE PRECISION,
    "inAccuracy" DOUBLE PRECISION,
    "inDistanceM" INTEGER,
    "outLatitude" DOUBLE PRECISION,
    "outLongitude" DOUBLE PRECISION,
    "outAccuracy" DOUBLE PRECISION,
    "outDistanceM" INTEGER,
    "suspectedFake" BOOLEAN NOT NULL DEFAULT false,
    "suspectReasons" TEXT[],
    "source" TEXT NOT NULL DEFAULT 'PUNCH',
    "autoClosedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AttendanceScan" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "outletId" INTEGER,
    "userId" INTEGER NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT,
    "result" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION NOT NULL,
    "distanceM" INTEGER,
    "recordId" INTEGER,

    CONSTRAINT "AttendanceScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AttendanceEdit" (
    "id" SERIAL NOT NULL,
    "recordId" INTEGER NOT NULL,
    "editedById" INTEGER NOT NULL,
    "before" JSONB,
    "after" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceEdit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AttendanceMonthLock" (
    "id" SERIAL NOT NULL,
    "outletId" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "lockedById" INTEGER NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceMonthLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MerchantModule_merchantId_key_key" ON "public"."MerchantModule"("merchantId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceSetting_outletId_key" ON "public"."AttendanceSetting"("outletId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceSetting_kioskToken_key" ON "public"."AttendanceSetting"("kioskToken");

-- CreateIndex
CREATE INDEX "AttendanceSetting_merchantId_idx" ON "public"."AttendanceSetting"("merchantId");

-- CreateIndex
CREATE INDEX "ShiftTemplate_merchantId_idx" ON "public"."ShiftTemplate"("merchantId");

-- CreateIndex
CREATE INDEX "ShiftTemplate_outletId_idx" ON "public"."ShiftTemplate"("outletId");

-- CreateIndex
CREATE INDEX "ShiftRule_merchantId_idx" ON "public"."ShiftRule"("merchantId");

-- CreateIndex
CREATE INDEX "ShiftRule_outletId_idx" ON "public"."ShiftRule"("outletId");

-- CreateIndex
CREATE INDEX "ShiftRule_userId_idx" ON "public"."ShiftRule"("userId");

-- CreateIndex
CREATE INDEX "ShiftRule_templateId_idx" ON "public"."ShiftRule"("templateId");

-- CreateIndex
CREATE INDEX "ShiftDay_outletId_dateKey_idx" ON "public"."ShiftDay"("outletId", "dateKey");

-- CreateIndex
CREATE INDEX "ShiftDay_templateId_idx" ON "public"."ShiftDay"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "ShiftDay_userId_dateKey_key" ON "public"."ShiftDay"("userId", "dateKey");

-- CreateIndex
CREATE INDEX "AttendanceRecord_userId_status_idx" ON "public"."AttendanceRecord"("userId", "status");

-- CreateIndex
CREATE INDEX "AttendanceRecord_outletId_dateKey_idx" ON "public"."AttendanceRecord"("outletId", "dateKey");

-- CreateIndex
CREATE INDEX "AttendanceRecord_userId_dateKey_idx" ON "public"."AttendanceRecord"("userId", "dateKey");

-- CreateIndex
CREATE INDEX "AttendanceRecord_status_closeAt_idx" ON "public"."AttendanceRecord"("status", "closeAt");

-- CreateIndex
CREATE INDEX "AttendanceRecord_shiftTemplateId_idx" ON "public"."AttendanceRecord"("shiftTemplateId");

-- CreateIndex
CREATE INDEX "AttendanceScan_userId_at_idx" ON "public"."AttendanceScan"("userId", "at");

-- CreateIndex
CREATE INDEX "AttendanceScan_outletId_at_idx" ON "public"."AttendanceScan"("outletId", "at");

-- CreateIndex
CREATE INDEX "AttendanceEdit_recordId_idx" ON "public"."AttendanceEdit"("recordId");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceMonthLock_outletId_month_key" ON "public"."AttendanceMonthLock"("outletId", "month");

-- AddForeignKey
ALTER TABLE "public"."MerchantModule" ADD CONSTRAINT "MerchantModule_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "public"."Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceSetting" ADD CONSTRAINT "AttendanceSetting_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "public"."Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShiftTemplate" ADD CONSTRAINT "ShiftTemplate_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "public"."Outlet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShiftRule" ADD CONSTRAINT "ShiftRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShiftDay" ADD CONSTRAINT "ShiftDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceRecord" ADD CONSTRAINT "AttendanceRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceScan" ADD CONSTRAINT "AttendanceScan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AttendanceEdit" ADD CONSTRAINT "AttendanceEdit_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "public"."AttendanceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_outletId_createdAt_idx" ON "Order"("outletId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_orderType_status_idx" ON "Order"("orderType", "status");

-- CreateIndex
CREATE INDEX "Order_outletId_status_createdAt_idx" ON "Order"("outletId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_createdById_createdAt_idx" ON "Order"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "Order_totalAmount_idx" ON "Order"("totalAmount");

-- CreateIndex
CREATE INDEX "Order_status_orderType_createdAt_idx" ON "Order"("status", "orderType", "createdAt");

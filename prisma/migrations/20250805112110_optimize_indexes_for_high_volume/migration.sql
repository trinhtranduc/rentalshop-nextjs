-- DropIndex
DROP INDEX "email_verification_tokens_expiresAt_idx";

-- DropIndex
DROP INDEX "notifications_type_createdAt_idx";

-- DropIndex
DROP INDEX "notifications_userId_isRead_idx";

-- DropIndex
DROP INDEX "order_history_action_createdAt_idx";

-- DropIndex
DROP INDEX "order_items_productId_idx";

-- DropIndex
DROP INDEX "orders_totalAmount_idx";

-- DropIndex
DROP INDEX "orders_returnPlanAt_status_idx";

-- DropIndex
DROP INDEX "orders_orderType_status_idx";

-- DropIndex
DROP INDEX "orders_outletId_status_idx";

-- DropIndex
DROP INDEX "orders_status_outletId_idx";

-- DropIndex
DROP INDEX "password_reset_tokens_expiresAt_idx";

-- DropIndex
DROP INDEX "payments_method_status_idx";

-- DropIndex
DROP INDEX "payments_status_createdAt_idx";

-- DropIndex
DROP INDEX "payments_orderId_type_idx";

-- DropIndex
DROP INDEX "payments_orderId_status_idx";

-- DropIndex
DROP INDEX "products_isActive_available_idx";

-- DropIndex
DROP INDEX "products_categoryId_isActive_idx";

-- DropIndex
DROP INDEX "products_outletId_available_idx";

-- DropIndex
DROP INDEX "products_outletId_isActive_idx";

-- DropIndex
DROP INDEX "sessions_expiresAt_idx";

-- CreateIndex
CREATE INDEX "email_verification_tokens_expiresAt_createdAt_idx" ON "email_verification_tokens"("expiresAt", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_type_createdAt_idx" ON "notifications"("type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "order_history_action_createdAt_idx" ON "order_history"("action", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "order_history_orderId_action_createdAt_idx" ON "order_history"("orderId", "action", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "order_items_productId_createdAt_idx" ON "order_items"("productId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "orders_outletId_status_createdAt_idx" ON "orders"("outletId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "orders_status_returnPlanAt_idx" ON "orders"("status", "returnPlanAt");

-- CreateIndex
CREATE INDEX "orders_status_orderType_createdAt_idx" ON "orders"("status", "orderType", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "orders_outletId_totalAmount_createdAt_idx" ON "orders"("outletId", "totalAmount", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "orders_status_outletId_orderType_idx" ON "orders"("status", "outletId", "orderType");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expiresAt_createdAt_idx" ON "password_reset_tokens"("expiresAt", "createdAt");

-- CreateIndex
CREATE INDEX "payments_orderId_status_createdAt_idx" ON "payments"("orderId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "payments_orderId_type_createdAt_idx" ON "payments"("orderId", "type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "payments_status_method_createdAt_idx" ON "payments"("status", "method", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "payments_amount_createdAt_idx" ON "payments"("amount", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "products_outletId_isActive_available_idx" ON "products"("outletId", "isActive", "available" DESC);

-- CreateIndex
CREATE INDEX "products_categoryId_isActive_available_idx" ON "products"("categoryId", "isActive", "available" DESC);

-- CreateIndex
CREATE INDEX "sessions_expiresAt_createdAt_idx" ON "sessions"("expiresAt", "createdAt");

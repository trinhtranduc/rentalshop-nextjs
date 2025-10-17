-- CreateIndex
CREATE INDEX "admins_level_idx" ON "admins"("level");

-- CreateIndex
CREATE INDEX "categories_isActive_idx" ON "categories"("isActive");

-- CreateIndex
CREATE INDEX "categories_name_idx" ON "categories"("name");

-- CreateIndex
CREATE INDEX "customers_merchantId_isActive_idx" ON "customers"("merchantId", "isActive");

-- CreateIndex
CREATE INDEX "customers_merchantId_firstName_lastName_idx" ON "customers"("merchantId", "firstName", "lastName");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_email_idx" ON "customers"("email");

-- CreateIndex
CREATE INDEX "customers_idNumber_idType_idx" ON "customers"("idNumber", "idType");

-- CreateIndex
CREATE INDEX "customers_city_state_country_idx" ON "customers"("city", "state", "country");

-- CreateIndex
CREATE INDEX "customers_createdAt_idx" ON "customers"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "email_verification_tokens_token_idx" ON "email_verification_tokens"("token");

-- CreateIndex
CREATE INDEX "email_verification_tokens_expiresAt_idx" ON "email_verification_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "merchants_isVerified_isActive_idx" ON "merchants"("isVerified", "isActive");

-- CreateIndex
CREATE INDEX "merchants_companyName_idx" ON "merchants"("companyName");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_type_createdAt_idx" ON "notifications"("type", "createdAt");

-- CreateIndex
CREATE INDEX "order_history_orderId_createdAt_idx" ON "order_history"("orderId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "order_history_action_createdAt_idx" ON "order_history"("action", "createdAt");

-- CreateIndex
CREATE INDEX "order_history_userId_createdAt_idx" ON "order_history"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");

-- CreateIndex
CREATE INDEX "order_items_orderId_productId_idx" ON "order_items"("orderId", "productId");

-- CreateIndex
CREATE INDEX "order_items_startDate_endDate_idx" ON "order_items"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "orders_orderNumber_idx" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_status_outletId_idx" ON "orders"("status", "outletId");

-- CreateIndex
CREATE INDEX "orders_customerId_createdAt_idx" ON "orders"("customerId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "orders_outletId_status_idx" ON "orders"("outletId", "status");

-- CreateIndex
CREATE INDEX "orders_orderType_status_idx" ON "orders"("orderType", "status");

-- CreateIndex
CREATE INDEX "orders_pickupPlanAt_returnPlanAt_idx" ON "orders"("pickupPlanAt", "returnPlanAt");

-- CreateIndex
CREATE INDEX "orders_returnPlanAt_status_idx" ON "orders"("returnPlanAt", "status");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "orders_totalAmount_idx" ON "orders"("totalAmount");

-- CreateIndex
CREATE INDEX "orders_customerName_customerPhone_idx" ON "orders"("customerName", "customerPhone");

-- CreateIndex
CREATE INDEX "orders_userId_createdAt_idx" ON "orders"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "outlet_staff_outletId_isActive_idx" ON "outlet_staff"("outletId", "isActive");

-- CreateIndex
CREATE INDEX "outlet_staff_role_isActive_idx" ON "outlet_staff"("role", "isActive");

-- CreateIndex
CREATE INDEX "outlets_merchantId_isActive_idx" ON "outlets"("merchantId", "isActive");

-- CreateIndex
CREATE INDEX "outlets_name_idx" ON "outlets"("name");

-- CreateIndex
CREATE INDEX "outlets_phone_idx" ON "outlets"("phone");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expiresAt_idx" ON "password_reset_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "payments_orderId_status_idx" ON "payments"("orderId", "status");

-- CreateIndex
CREATE INDEX "payments_orderId_type_idx" ON "payments"("orderId", "type");

-- CreateIndex
CREATE INDEX "payments_status_createdAt_idx" ON "payments"("status", "createdAt");

-- CreateIndex
CREATE INDEX "payments_method_status_idx" ON "payments"("method", "status");

-- CreateIndex
CREATE INDEX "payments_userId_createdAt_idx" ON "payments"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "payments_reference_idx" ON "payments"("reference");

-- CreateIndex
CREATE INDEX "products_outletId_isActive_idx" ON "products"("outletId", "isActive");

-- CreateIndex
CREATE INDEX "products_outletId_available_idx" ON "products"("outletId", "available" DESC);

-- CreateIndex
CREATE INDEX "products_categoryId_isActive_idx" ON "products"("categoryId", "isActive");

-- CreateIndex
CREATE INDEX "products_barcode_idx" ON "products"("barcode");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "products"("name");

-- CreateIndex
CREATE INDEX "products_rentPrice_idx" ON "products"("rentPrice");

-- CreateIndex
CREATE INDEX "products_isActive_available_idx" ON "products"("isActive", "available");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "sessions_userId_expiresAt_idx" ON "sessions"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_isActive_idx" ON "users"("role", "isActive");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt" DESC);

# Comprehensive API Audit Plan - validateMerchantAccess Usage

## 🎯 Mục tiêu

Kiểm tra **TẤT CẢ** các API routes trong `apps/api/app/api/` để đảm bảo:
1. ✅ Routes có merchant/outlet ID trong path đều dùng `validateMerchantAccess`
2. ✅ Không còn manual validation code trùng lặp
3. ✅ Tất cả routes đều có proper authorization

## 📋 Phương pháp kiểm tra

### Tiêu chí đánh giá

**Routes CẦN dùng `validateMerchantAccess`:**
- ✅ Có `merchantId` hoặc `[id]` trong path params (trong context của `/merchants/[id]/...`)
- ✅ Có `outletId` trong path params (trong context của `/merchants/[id]/outlets/[outletId]/...`)
- ✅ Cần validate merchant/outlet access trước khi thao tác

**Routes KHÔNG CẦN dùng `validateMerchantAccess`:**
- ❌ Routes không có merchant/outlet ID trong path
- ❌ Routes validate qua resource ownership (product.merchant.id, customer.merchantId, etc.)
- ❌ Public routes không cần authentication
- ❌ System/admin routes không liên quan đến merchant/outlet

### Checklist cho mỗi route

- [ ] Route có merchant/outlet ID trong path params?
- [ ] Route đã dùng `validateMerchantAccess`?
- [ ] Route có manual validation code trùng lặp?
- [ ] Route có proper error handling?
- [ ] Route có proper authorization checks?

## 📁 Danh sách folders cần kiểm tra

### 🔴 Priority 1: Merchant-related Routes (HIGH PRIORITY)

#### ✅ `/merchants/` - ĐÃ HOÀN THÀNH
- [x] `merchants/[id]/route.ts` - GET, PUT, DELETE ✅
- [x] `merchants/[id]/orders/route.ts` - GET, POST ✅
- [x] `merchants/[id]/outlets/route.ts` - GET, POST ✅
- [x] `merchants/[id]/outlets/[outletId]/route.ts` - GET, PUT, DELETE ✅
- [x] `merchants/[id]/outlets/[outletId]/bank-accounts/route.ts` - GET, POST ✅
- [x] `merchants/[id]/outlets/[outletId]/bank-accounts/[accountId]/route.ts` - GET, PUT, DELETE ✅
- [x] `merchants/[id]/users/route.ts` - GET, POST ✅
- [x] `merchants/[id]/users/[userId]/route.ts` - GET, PUT, DELETE ✅
- [x] `merchants/[id]/products/route.ts` - GET, POST ✅
- [x] `merchants/[id]/products/[productId]/route.ts` - GET, PUT ✅
- [x] `merchants/[id]/payments/route.ts` - GET ✅
- [x] `merchants/[id]/plan/route.ts` - GET, PUT ✅
- [x] `merchants/[id]/pricing/route.ts` - GET, PUT ✅
- [ ] `merchants/route.ts` - GET, POST (List/Create - không có merchant ID trong path, không cần)
- [ ] `merchants/register/route.ts` - POST (Public route, không cần)
- [ ] `merchants/public/` - (Public routes, không cần)

**Status:** ✅ **100% COMPLETE** - Tất cả routes có merchant ID trong path đã dùng `validateMerchantAccess`

---

### 🟡 Priority 2: Resource Routes với Merchant Validation (MEDIUM PRIORITY)

#### `/products/` - Cần kiểm tra
- [ ] `products/[id]/route.ts` - GET, PUT, DELETE
  - **Check:** Validate qua `product.merchant.id` - có thể cần optimize?
- [ ] `products/[id]/availability/route.ts` - GET
  - **Check:** Validate qua `product.merchant.id` + outlet validation - có thể cần optimize?
- [ ] `products/route.ts` - GET, POST (List/Create - role-based filtering)
- [ ] `products/availability/route.ts` - GET (List availability)
- [ ] `products/export/route.ts` - GET (Export)
- [ ] `products/docs/page.tsx` - (Swagger docs, không cần)
- [ ] `products/swagger/page.tsx` - (Swagger docs, không cần)

**Expected:** Routes không có merchant ID trong path, validate qua resource ownership - **KHÔNG CẦN** `validateMerchantAccess`

#### `/customers/` - Cần kiểm tra
- [ ] `customers/[id]/route.ts` - GET, PUT, DELETE
  - **Check:** Validate qua `customer.merchantId` - có thể cần optimize?
- [ ] `customers/[id]/orders/route.ts` - GET
  - **Check:** Validate qua `customer.merchantId` - có thể cần optimize?
- [ ] `customers/route.ts` - GET, POST (List/Create - role-based filtering)
- [ ] `customers/export/route.ts` - GET (Export)
- [ ] `customers/debug/route.ts` - GET (Debug)
- [ ] `customers/docs/page.tsx` - (Swagger docs, không cần)
- [ ] `customers/swagger/page.tsx` - (Swagger docs, không cần)

**Expected:** Routes không có merchant ID trong path, validate qua resource ownership - **KHÔNG CẦN** `validateMerchantAccess`

#### `/orders/` - Cần kiểm tra
- [ ] `orders/[orderId]/route.ts` - GET, PUT, DELETE
  - **Check:** Validate qua `order.merchantId` - có thể cần optimize?
- [ ] `orders/[orderId]/pickup/route.ts` - POST
  - **Check:** Validate qua `order.merchantId` - có thể cần optimize?
- [ ] `orders/[orderId]/return/route.ts` - POST
  - **Check:** Validate qua `order.merchantId` - có thể cần optimize?
- [ ] `orders/[orderId]/status/route.ts` - PUT
  - **Check:** Validate qua `order.merchantId` - có thể cần optimize?
- [ ] `orders/[orderId]/qr-code/route.ts` - GET
  - **Check:** Validate qua `order.merchantId` - có thể cần optimize?
- [ ] `orders/by-number/[orderNumber]/route.ts` - GET
  - **Check:** Validate qua `order.merchantId` - có thể cần optimize?
- [ ] `orders/route.ts` - GET, POST (List/Create - role-based filtering)
- [ ] `orders/export/route.ts` - GET (Export)
- [ ] `orders/statistics/route.ts` - GET (Statistics)
- [ ] `orders/stats/route.ts` - GET (Stats)
- [ ] `orders/cursor/route.ts` - GET (Cursor pagination)
- [ ] `orders/swagger/page.tsx` - (Swagger docs, không cần)

**Expected:** Routes không có merchant ID trong path, validate qua resource ownership - **KHÔNG CẦN** `validateMerchantAccess`

#### `/outlets/` - Cần kiểm tra
- [ ] `outlets/route.ts` - GET, POST
  - **Check:** Validate qua query params `merchantId` - có thể cần optimize?
- [ ] `outlets/swagger/page.tsx` - (Swagger docs, không cần)

**Expected:** Routes validate qua query params - **KHÔNG CẦN** `validateMerchantAccess` (không có merchant ID trong path)

---

### 🟢 Priority 3: Other Routes (LOW PRIORITY - Không liên quan đến merchant/outlet)

#### `/auth/` - Authentication Routes
- [ ] `auth/login/route.ts` - POST
- [ ] `auth/register/route.ts` - POST
- [ ] `auth/logout/route.ts` - POST
- [ ] `auth/forgot-password/route.ts` - POST
- [ ] `auth/reset-password/route.ts` - POST
- [ ] `auth/change-password/route.ts` - POST
- [ ] `auth/verify/route.ts` - GET
- [ ] `auth/verify-email/route.ts` - POST
- [ ] `auth/resend-verification/route.ts` - POST
- [ ] `auth/helper/page.tsx` - (Helper page, không cần)

**Expected:** Public/auth routes - **KHÔNG CẦN** `validateMerchantAccess`

#### `/users/` - User Management
- [ ] `users/[id]/route.ts` - GET, PUT, DELETE
- [ ] `users/[id]/change-password/route.ts` - PUT
- [ ] `users/[id]/permissions/route.ts` - GET, PUT
- [ ] `users/route.ts` - GET, POST (List/Create)
- [ ] `users/profile/route.ts` - GET, PUT
- [ ] `users/permissions/bulk/route.ts` - POST
- [ ] `users/delete-account/route.ts` - DELETE
- [ ] `users/swagger/page.tsx` - (Swagger docs, không cần)

**Expected:** User management routes - **KHÔNG CẦN** `validateMerchantAccess` (không có merchant ID trong path)

#### `/subscriptions/` - Subscription Management
- [ ] `subscriptions/[id]/route.ts` - GET, PUT, DELETE
- [ ] `subscriptions/[id]/change-plan/route.ts` - PUT
- [ ] `subscriptions/[id]/cancel/route.ts` - POST
- [ ] `subscriptions/[id]/pause/route.ts` - POST
- [ ] `subscriptions/[id]/resume/route.ts` - POST
- [ ] `subscriptions/[id]/renew/route.ts` - POST
- [ ] `subscriptions/[id]/payments/route.ts` - GET
- [ ] `subscriptions/[id]/activities/route.ts` - GET
- [ ] `subscriptions/[id]/addons/` - (Addons routes)
- [ ] `subscriptions/route.ts` - GET, POST
- [ ] `subscriptions/status/route.ts` - GET
- [ ] `subscriptions/stats/route.ts` - GET
- [ ] `subscriptions/expired/route.ts` - GET
- [ ] `subscriptions/extend/route.ts` - POST
- [ ] `subscriptions/addons/` - (Addons routes)
- [ ] `subscriptions/swagger/page.tsx` - (Swagger docs, không cần)

**Expected:** Subscription routes - **KHÔNG CẦN** `validateMerchantAccess` (validate qua subscription.merchantId)

#### `/analytics/` - Analytics Routes
- [ ] `analytics/dashboard/route.ts` - GET
- [ ] `analytics/enhanced-dashboard/route.ts` - GET
- [ ] `analytics/growth-metrics/route.ts` - GET
- [ ] `analytics/income/route.ts` - GET
- [ ] `analytics/income/daily/route.ts` - GET
- [ ] `analytics/orders/route.ts` - GET
- [ ] `analytics/recent-activities/route.ts` - GET
- [ ] `analytics/recent-orders/route.ts` - GET
- [ ] `analytics/system/route.ts` - GET
- [ ] `analytics/today-metrics/route.ts` - GET
- [ ] `analytics/top-customers/route.ts` - GET
- [ ] `analytics/top-products/route.ts` - GET
- [ ] `analytics/docs/page.tsx` - (Swagger docs, không cần)
- [ ] `analytics/swagger/page.tsx` - (Swagger docs, không cần)

**Expected:** Analytics routes với role-based filtering - **KHÔNG CẦN** `validateMerchantAccess`

#### `/payments/` - Payment Routes
- [ ] `payments/route.ts` - GET, POST
- [ ] `payments/manual/route.ts` - POST
- [ ] `payments/process/route.ts` - POST

**Expected:** Payment routes - **KHÔNG CẦN** `validateMerchantAccess` (validate qua order.merchantId)

#### `/plans/` - Plan Management
- [ ] `plans/[id]/route.ts` - GET, PUT, DELETE
- [ ] `plans/[id]/variants/route.ts` - GET
- [ ] `plans/route.ts` - GET, POST
- [ ] `plans/public/route.ts` - GET (Public)
- [ ] `plans/stats/route.ts` - GET
- [ ] `plans/swagger/page.tsx` - (Swagger docs, không cần)

**Expected:** Plan routes - **KHÔNG CẦN** `validateMerchantAccess`

#### `/categories/` - Category Management
- [ ] `categories/[id]/route.ts` - GET, PUT, DELETE
- [ ] `categories/route.ts` - GET, POST
- [ ] `categories/swagger/page.tsx` - (Swagger docs, không cần)

**Expected:** Category routes - **KHÔNG CẦN** `validateMerchantAccess`

#### `/settings/` - Settings Routes
- [ ] `settings/merchant/route.ts` - GET, PUT
- [ ] `settings/outlet/route.ts` - GET, PUT
- [ ] `settings/billing/route.ts` - GET, PUT
- [ ] `settings/currency/route.ts` - GET, PUT

**Expected:** Settings routes - **KHÔNG CẦN** `validateMerchantAccess` (validate qua user scope)

#### `/calendar/` - Calendar Routes
- [ ] `calendar/orders/route.ts` - GET

**Expected:** Calendar routes với role-based filtering - **KHÔNG CẦN** `validateMerchantAccess`

#### `/public/` - Public Routes
- [ ] `public/[tenantKey]/categories/route.ts` - GET
- [ ] `public/[tenantKey]/products/route.ts` - GET

**Expected:** Public routes - **KHÔNG CẦN** `validateMerchantAccess`

#### `/admin/` - Admin Routes
- [ ] `admin/import-data/route.ts` - POST
- [ ] `admin/import-data/sessions/[id]/route.ts` - GET, DELETE

**Expected:** Admin routes - **KHÔNG CẦN** `validateMerchantAccess`

#### `/system/` - System Routes
- [ ] `system/api-keys/route.ts` - GET, POST
- [ ] `system/api-keys/test/route.ts` - POST
- [ ] `system/health/route.ts` - GET
- [ ] `system/integrity/route.ts` - GET

**Expected:** System routes - **KHÔNG CẦN** `validateMerchantAccess`

#### `/health/` - Health Check Routes
- [ ] `health/route.ts` - GET
- [ ] `health/database/route.ts` - GET
- [ ] `health/volume/route.ts` - GET

**Expected:** Health check routes - **KHÔNG CẦN** `validateMerchantAccess`

#### `/audit-logs/` - Audit Log Routes
- [ ] `audit-logs/[id]/route.ts` - GET
- [ ] `audit-logs/route.ts` - GET
- [ ] `audit-logs/stats/route.ts` - GET

**Expected:** Audit log routes - **KHÔNG CẦN** `validateMerchantAccess`

#### `/billing-cycles/` - Billing Cycle Routes
- [ ] `billing-cycles/[id]/route.ts` - GET, PUT, DELETE
- [ ] `billing-cycles/route.ts` - GET, POST

**Expected:** Billing cycle routes - **KHÔNG CẦN** `validateMerchantAccess`

#### `/sync-standalone/` - Sync Routes
- [ ] `sync-standalone/route.ts` - POST
- [ ] `sync-standalone/export/route.ts` - GET
- [ ] `sync-standalone/resume/route.ts` - POST
- [ ] `sync-standalone/rollback/route.ts` - POST
- [ ] `sync-standalone/sessions/[id]/route.ts` - GET, DELETE

**Expected:** Sync routes - **KHÔNG CẦN** `validateMerchantAccess`

#### `/sync-proxy/` - Sync Proxy Routes
- [ ] `sync-proxy/route.ts` - POST
- [ ] `sync-proxy/login/route.ts` - POST

**Expected:** Sync proxy routes - **KHÔNG CẦN** `validateMerchantAccess`

#### `/mobile/` - Mobile Routes
- [ ] `mobile/auth/login/route.ts` - POST
- [ ] `mobile/notifications/register-device/route.ts` - POST
- [ ] `mobile/products/route.ts.disabled` - (Disabled)
- [ ] `mobile/sync/check/route.ts` - GET

**Expected:** Mobile routes - **KHÔNG CẦN** `validateMerchantAccess`

#### `/notifications/` - Notification Routes
- [ ] (Check if exists)

**Expected:** Notification routes - **KHÔNG CẦN** `validateMerchantAccess`

#### `/shops/` - Shop Routes
- [ ] (Check if exists)

**Expected:** Shop routes - **KHÔNG CẦN** `validateMerchantAccess`

#### `/upload/` - Upload Routes
- [ ] `upload/image/route.ts` - POST
- [ ] `upload/cleanup/route.ts` - POST

**Expected:** Upload routes - **KHÔNG CẦN** `validateMerchantAccess`

#### `/docs/` - Documentation Routes
- [ ] `docs/route.ts` - GET

**Expected:** Documentation routes - **KHÔNG CẦN** `validateMerchantAccess`

#### `/debug/` - Debug Routes
- [ ] `debug/subscription-status/route.ts` - GET

**Expected:** Debug routes - **KHÔNG CẦN** `validateMerchantAccess`

#### `/test-aws/` - Test Routes
- [ ] `test-aws/route.ts` - GET

**Expected:** Test routes - **KHÔNG CẦN** `validateMerchantAccess`

#### `/cron/` - Cron Routes
- [ ] `cron/subscription-renewal/route.ts.disabled` - (Disabled)

**Expected:** Cron routes - **KHÔNG CẦN** `validateMerchantAccess`

#### `/subscription/` - Legacy Subscription Routes
- [ ] `subscription/limits/route.ts.disabled` - (Disabled)

**Expected:** Legacy subscription routes - **KHÔNG CẦN** `validateMerchantAccess`

---

## 📊 Tổng kết

### Routes đã hoàn thành
- ✅ **13 files** trong `/merchants/[id]/` đã dùng `validateMerchantAccess`
- ✅ **~25 endpoints** đã được chuẩn hóa

### Routes cần kiểm tra
- 🔍 **Priority 2:** `/products/`, `/customers/`, `/orders/`, `/outlets/` - Kiểm tra xem có cần optimize không
- 🔍 **Priority 3:** Các routes khác - Xác nhận không cần `validateMerchantAccess`

### Tiêu chí đánh giá

**Routes CẦN optimize (nếu có):**
- Có manual validation code trùng lặp
- Validate merchant/outlet access nhưng không dùng `validateMerchantAccess`
- Có thể refactor để dùng `validateMerchantAccess` mà không làm phức tạp code

**Routes KHÔNG CẦN optimize:**
- Validate qua resource ownership (product.merchant.id, customer.merchantId, etc.) - Đây là cách đúng
- Không có merchant/outlet ID trong path params
- Public routes hoặc system routes

---

## 🎯 Kế hoạch thực hiện

### Phase 1: Review Priority 2 Routes ✅
1. Kiểm tra `/products/[id]/route.ts` và `/products/[id]/availability/route.ts`
2. Kiểm tra `/customers/[id]/route.ts` và `/customers/[id]/orders/route.ts`
3. Kiểm tra `/orders/[orderId]/route.ts` và các nested routes
4. Kiểm tra `/outlets/route.ts`

**Expected Result:** Xác nhận các routes này validate đúng cách qua resource ownership, không cần `validateMerchantAccess`

### Phase 2: Review Priority 3 Routes ✅
1. Quick scan các routes khác
2. Xác nhận không có routes nào cần `validateMerchantAccess`

**Expected Result:** Tất cả routes đều đúng thiết kế, không cần thay đổi

### Phase 3: Final Report ✅
1. Tạo báo cáo tổng kết
2. Xác nhận 100% completion

---

## ✅ Kết luận

**Status:** Đang thực hiện review toàn diện

**Next Steps:**
1. Review từng folder theo priority
2. Document findings
3. Tạo final report


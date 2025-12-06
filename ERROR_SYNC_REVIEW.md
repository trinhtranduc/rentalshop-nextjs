# Error Synchronization Review Report

## Tổng quan

Sau khi review toàn bộ codebase, phát hiện **132 chỗ** còn chưa đồng bộ với error handling pattern (chỉ dùng error codes, không dùng detailed messages).

## Phân loại lỗi

### 1. API Routes - ResponseBuilder.error() với detailed messages (57 chỗ)

#### ✅ Đã có Error Code + Translation:
- `MERCHANT_ASSOCIATION_REQUIRED` - ✅ Có translation
- `USER_ID_REQUIRED` - ✅ Có translation  
- `USER_NOT_FOUND` - ✅ Có translation
- `UPDATE_USER_OUT_OF_SCOPE` - ✅ Có translation
- `DELETE_USER_OUT_OF_SCOPE` - ✅ Có translation
- `UPDATE_USER_FAILED` - ✅ Có translation
- `RETRIEVE_USERS_FAILED` - ✅ Có translation
- `CANNOT_DELETE_SELF` - ✅ Có translation
- `CANNOT_DELETE_LAST_ADMIN` - ✅ Có translation
- `NO_MERCHANT_ACCESS` - ✅ Có translation
- `OUTLET_REQUIRED` - ✅ Có translation
- `INVALID_USER_ROLE` - ✅ Có translation
- `INVALID_OUTLET_ID` - ✅ Có translation
- `PRODUCT_OUTLET_NOT_FOUND` - ✅ Có translation
- `NO_VALID_FIELDS` - ✅ Có translation
- `INVALID_DATE` - ✅ Có translation
- `CURRENCY_REQUIRED` - ✅ Có translation
- `INVALID_CURRENCY` - ✅ Có translation
- `INVALID_USER_ID_FORMAT` - ✅ Có translation (dùng `INVALID_USER_ID`)
- `INVALID_REQUEST` - ✅ Có translation
- `TOKEN_REQUIRED` - ✅ Có translation
- `EMAIL_ALREADY_VERIFIED` - ✅ Có translation
- `EMAIL_SEND_FAILED` - ✅ Có translation
- `INVALID_DATE_FORMAT` - ✅ Có translation

#### ❌ Chưa có Error Code trong ErrorCode enum:
- `MISSING_PARAMETERS` - ❌ Chưa có trong ErrorCode enum
- `INVALID_DATE_RANGE` - ❌ Chưa có trong ErrorCode enum
- `INVALID_ID` - ❌ Chưa có trong ErrorCode enum (có thể dùng `INVALID_INPUT`)
- `INVALID_JSON` - ❌ Chưa có trong ErrorCode enum (có `INVALID_JSON_DATA` trong translation)
- `OUTLET_STOCK_REQUIRED` - ❌ Chưa có trong ErrorCode enum
- `INVALID_OUTLET_STOCK` - ❌ Chưa có trong ErrorCode enum
- `NO_DEFAULT_BANK_ACCOUNT` - ❌ Chưa có trong ErrorCode enum
- `INVALID_ORDER_ID_FORMAT` - ❌ Chưa có trong ErrorCode enum
- `ACCESS_DENIED` - ❌ Chưa có trong ErrorCode enum (có thể dùng `FORBIDDEN`)
- `INVALID_LIMITS_FORMAT` - ❌ Chưa có trong ErrorCode enum
- `INVALID_FEATURES_FORMAT` - ❌ Chưa có trong ErrorCode enum
- `NO_FIELDS_TO_UPDATE` - ❌ Chưa có trong ErrorCode enum (có `NO_VALID_FIELDS`)

### 2. Database Layer - throw new Error() với detailed messages (75 chỗ)

#### Các patterns cần fix:

**a) "not found" errors** - Cần convert sang ApiError với ErrorCode:
- `Merchant with id X not found` → `MERCHANT_NOT_FOUND` ✅
- `Outlet with id X not found` → `OUTLET_NOT_FOUND` ✅
- `User with id X not found` → `USER_NOT_FOUND` ✅
- `Product with id X not found` → `PRODUCT_NOT_FOUND` ✅
- `Customer with id X not found` → `CUSTOMER_NOT_FOUND` ✅
- `Category with id X not found` → `CATEGORY_NOT_FOUND` ✅
- `Plan not found` → `PLAN_NOT_FOUND` ✅
- `Subscription not found` → `SUBSCRIPTION_NOT_FOUND` ✅

**b) Business rule errors** - Cần convert sang ApiError:
- `Merchant already has a subscription` → Cần error code mới hoặc `BUSINESS_RULE_VIOLATION`
- `Cannot renew cancelled subscription` → Cần error code mới hoặc `BUSINESS_RULE_VIOLATION`
- `Default outlet cannot be disabled` → Cần error code mới hoặc `BUSINESS_RULE_VIOLATION`
- `Category is not active` → Cần error code mới hoặc `BUSINESS_RULE_VIOLATION`
- `Category does not belong to merchant` → Cần error code mới hoặc `BUSINESS_RULE_VIOLATION`
- `Outlet does not belong to merchant` → Cần error code mới hoặc `BUSINESS_RULE_VIOLATION`
- `User is already deleted` → Cần error code mới hoặc `BUSINESS_RULE_VIOLATION`
- `User is not deleted` → Cần error code mới hoặc `BUSINESS_RULE_VIOLATION`

**c) Registration errors** - Cần convert sang ApiError:
- `Merchant code is required for outlet user registration` → Cần error code mới
- `Invalid merchant code` → Cần error code mới
- `Invalid outlet code` → Cần error code mới
- `Registration failed` → `INTERNAL_SERVER_ERROR` ✅

**d) System errors** - Có thể giữ hoặc convert:
- `Failed to generate unique order number` → `INTERNAL_SERVER_ERROR` ✅
- `Unsupported order number format` → Cần error code mới
- `Order number collision detected` → Cần error code mới
- `Maximum retries exceeded` → `INTERNAL_SERVER_ERROR` ✅
- `Prisma client is required` → `INTERNAL_SERVER_ERROR` ✅

## Files cần fix

### API Routes (57 files):
1. `apps/api/app/api/analytics/income/daily/route.ts` - 3 errors
2. `apps/api/app/api/orders/route.ts` - 1 error
3. `apps/api/app/api/customers/[id]/orders/route.ts` - 1 error
4. `apps/api/app/api/plan-limit-addons/[id]/route.ts` - 3 errors
5. `apps/api/app/api/users/route.ts` - 10 errors
6. `apps/api/app/api/users/[id]/route.ts` - 1 error
7. `apps/api/app/api/customers/route.ts` - 1 error
8. `apps/api/app/api/products/route.ts` - 2 errors
9. `apps/api/app/api/merchants/[id]/outlets/[outletId]/bank-accounts/route.ts` - 1 error
10. `apps/api/app/api/merchants/[id]/outlets/[outletId]/bank-accounts/[accountId]/route.ts` - 2 errors
11. `apps/api/app/api/products/[id]/availability/route.ts` - 4 errors
12. `apps/api/app/api/products/[id]/route.ts` - 1 error
13. `apps/api/app/api/orders/[orderId]/qr-code/route.ts` - 3 errors
14. `apps/api/app/api/users/profile/route.ts` - 1 error
15. `apps/api/app/api/products/availability/route.ts` - 5 errors
16. `apps/api/app/api/settings/currency/route.ts` - 3 errors
17. `apps/api/app/api/users/[id]/change-password/route.ts` - 2 errors
18. `apps/api/app/api/users/permissions/bulk/route.ts` - 2 errors
19. `apps/api/app/api/plans/[id]/route.ts` - 4 errors
20. `apps/api/app/api/auth/forgot-password/route.ts` - 1 error
21. `apps/api/app/api/auth/verify-email/route.ts` - 4 errors
22. `apps/api/app/api/auth/resend-verification/route.ts` - 1 error
23. `packages/utils/src/api/route-helpers.ts` - 1 error

### Database Layer (75 errors trong 8 files):
1. `packages/database/src/registration.ts` - 5 errors
2. `packages/database/src/user.ts` - 13 errors
3. `packages/database/src/index.ts` - 2 errors
4. `packages/database/src/product.ts` - 18 errors
5. `packages/database/src/customer.ts` - 8 errors
6. `packages/database/src/outlet.ts` - 7 errors
7. `packages/database/src/order.ts` - 2 errors
8. `packages/database/src/subscription.ts` - 8 errors
9. `packages/database/src/order-number-generator.ts` - 10 errors
10. `packages/database/src/audit.ts` - 1 error

## Khuyến nghị

### Priority 1: Fix API Routes với error codes đã có
- Remove detailed messages từ `ResponseBuilder.error()` calls
- Chỉ dùng error codes đã có translations

### Priority 2: Fix Database Layer "not found" errors
- Convert tất cả `throw new Error('X not found')` → `throw new ApiError(ErrorCode.X_NOT_FOUND)`
- Đã có error codes và translations sẵn

### Priority 3: Add missing error codes
- Thêm các error codes mới vào `ErrorCode` enum
- Thêm translations vào `locales/vi/errors.json` và `locales/en/errors.json`

### Priority 4: Fix business rule errors
- Convert sang `BUSINESS_RULE_VIOLATION` hoặc tạo error codes mới nếu cần

## Tổng kết

- **Đã đồng bộ**: ✅ EMAIL_EXISTS, PHONE_EXISTS, PLAN_LIMIT_EXCEEDED và các errors trong validation.ts, errors.ts
- **Chưa đồng bộ**: ❌ 132 chỗ (57 API routes + 75 database layer)
- **Cần action**: Fix từng nhóm theo priority


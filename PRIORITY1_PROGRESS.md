# Priority 1 Progress Report

## ✅ Đã hoàn thành

### 1. Core Changes
- ✅ **Sửa `ResponseBuilder.error()` signature**: Chỉ accept error code, không accept detailed message
- ✅ **Fix internal usages**: Sửa 3 chỗ trong `response-builder.ts` và `route-helpers.ts`

### 2. Files đã fix (10+ files)
- ✅ `apps/api/app/api/analytics/income/daily/route.ts` - 3 errors
- ✅ `apps/api/app/api/orders/route.ts` - 1 error
- ✅ `apps/api/app/api/customers/[id]/orders/route.ts` - 1 error
- ✅ `apps/api/app/api/plan-limit-addons/[id]/route.ts` - 3 errors
- ✅ `apps/api/app/api/users/route.ts` - 10+ errors
- ✅ `apps/api/app/api/users/[id]/route.ts` - 1 error
- ✅ `apps/api/app/api/customers/route.ts` - 5+ errors
- ✅ `apps/api/app/api/customers/export/route.ts` - 1 error
- ✅ `packages/utils/src/api/route-helpers.ts` - 1 error

## ⚠️ Còn lại

### Số lượng: ~368 chỗ còn cần fix

### Các file còn lại cần fix:
- `apps/api/app/api/products/route.ts`
- `apps/api/app/api/products/availability/route.ts`
- `apps/api/app/api/products/[id]/availability/route.ts`
- `apps/api/app/api/products/[id]/route.ts`
- `apps/api/app/api/orders/[orderId]/qr-code/route.ts`
- `apps/api/app/api/users/profile/route.ts`
- `apps/api/app/api/settings/currency/route.ts`
- `apps/api/app/api/users/[id]/change-password/route.ts`
- `apps/api/app/api/users/permissions/bulk/route.ts`
- `apps/api/app/api/plans/[id]/route.ts`
- `apps/api/app/api/auth/forgot-password/route.ts`
- `apps/api/app/api/auth/verify-email/route.ts`
- `apps/api/app/api/auth/resend-verification/route.ts`
- Và nhiều file khác...

## 📋 Pattern cần fix

### Pattern 1: Simple string messages
```typescript
// BEFORE:
ResponseBuilder.error('CODE', 'detailed message')

// AFTER:
ResponseBuilder.error('CODE')
```

### Pattern 2: Validation errors
```typescript
// BEFORE:
ResponseBuilder.error('VALIDATION_ERROR', parsed.error.flatten())

// AFTER:
ResponseBuilder.validationError(parsed.error.flatten())
```

### Pattern 3: Template strings
```typescript
// BEFORE:
ResponseBuilder.error('CODE', `Message with ${variable}`)

// AFTER:
ResponseBuilder.error('CODE')
```

### Pattern 4: Object errors
```typescript
// BEFORE:
ResponseBuilder.error('CODE', errorObject)

// AFTER:
ResponseBuilder.error('CODE')
```

## 🎯 Recommendation

### Option 1: Continue manual fix (Recommended for quality)
- Fix từng file một để đảm bảo quality
- Review từng chỗ để đảm bảo error code đúng
- Estimated time: 2-3 hours

### Option 2: Use find & replace với careful review
- Dùng regex để fix hàng loạt
- Review kỹ các cases đặc biệt (validation errors, template strings)
- Estimated time: 30 minutes + review time

### Option 3: Fix theo priority files
- Fix các file quan trọng nhất trước (products, orders, auth)
- Các file ít dùng có thể fix sau
- Estimated time: 1 hour

## ✅ Next Steps

1. **Continue fixing remaining files** - Tôi có thể tiếp tục fix
2. **Review và test** - Test để đảm bảo không break
3. **Move to Priority 2** - Fix database layer errors


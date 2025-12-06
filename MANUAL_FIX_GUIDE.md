# Hướng dẫn Fix Thủ Công ResponseBuilder.error()

## Cách Fix Thủ Công

### Bước 1: Tìm các chỗ cần fix trong file

```bash
# Tìm trong một file cụ thể
grep -n "ResponseBuilder\.error.*," apps/api/app/api/products/route.ts

# Hoặc dùng VS Code/Cursor:
# Ctrl+Shift+F (Find in Files)
# Pattern: ResponseBuilder\.error\([^,)]+,\s*['\"]
```

### Bước 2: Fix từng pattern

#### Pattern 1: Simple string message
```typescript
// ❌ BEFORE:
ResponseBuilder.error('USER_NOT_FOUND', 'User not found')

// ✅ AFTER:
ResponseBuilder.error('USER_NOT_FOUND')
```

#### Pattern 2: Validation error với flatten()
```typescript
// ❌ BEFORE:
ResponseBuilder.error('VALIDATION_ERROR', parsed.error.flatten())

// ✅ AFTER:
ResponseBuilder.validationError(parsed.error.flatten())
```

#### Pattern 3: Template string
```typescript
// ❌ BEFORE:
ResponseBuilder.error('CUSTOMER_DUPLICATE', `A customer with this ${field} already exists`)

// ✅ AFTER:
ResponseBuilder.error('CUSTOMER_DUPLICATE')
```

#### Pattern 4: Object/error variable
```typescript
// ❌ BEFORE:
ResponseBuilder.error('INVALID_DATE_RANGE', dateRangeResult.error)

// ✅ AFTER:
ResponseBuilder.error('INVALID_INPUT') // hoặc error code phù hợp
```

### Bước 3: Verify error code có translation

Check trong:
- `locales/vi/errors.json`
- `locales/en/errors.json`
- `packages/utils/src/api/response-builder.ts` (ERROR_MESSAGES)

Nếu chưa có, cần:
1. Thêm vào ErrorCode enum (nếu cần)
2. Thêm vào ERROR_MESSAGES
3. Thêm vào translation files

### Bước 4: Test

Sau khi fix, test để đảm bảo:
- API vẫn hoạt động
- Error messages được translate đúng
- Không có lỗi TypeScript

## Quick Reference

### Common Error Codes đã có:
- `USER_NOT_FOUND`
- `MERCHANT_NOT_FOUND`
- `OUTLET_NOT_FOUND`
- `PRODUCT_NOT_FOUND`
- `CUSTOMER_NOT_FOUND`
- `ORDER_NOT_FOUND`
- `VALIDATION_ERROR` → Dùng `ResponseBuilder.validationError()`
- `INVALID_INPUT`
- `MISSING_REQUIRED_FIELD`
- `FORBIDDEN`
- `UNAUTHORIZED`
- `MERCHANT_ASSOCIATION_REQUIRED`
- `NO_MERCHANT_ACCESS`
- `OUTLET_REQUIRED`
- `INVALID_DATE_FORMAT`
- `INVALID_CURRENCY`
- `CURRENCY_REQUIRED`
- `EMAIL_ALREADY_VERIFIED`
- `EMAIL_SEND_FAILED`
- `TOKEN_REQUIRED`
- `CANNOT_DELETE_SELF`
- `CANNOT_DELETE_LAST_ADMIN`
- `UPDATE_USER_OUT_OF_SCOPE`
- `DELETE_USER_OUT_OF_SCOPE`
- `CUSTOMER_DUPLICATE`
- `PRODUCT_OUTLET_NOT_FOUND`
- `INVALID_USER_ROLE`
- `INVALID_OUTLET_ID`
- `NO_VALID_FIELDS`
- `INVALID_DATE`
- `INVALID_REQUEST`
- `USER_ID_REQUIRED`
- `CUSTOMER_ID_REQUIRED`
- `RETRIEVE_USERS_FAILED`
- `UPDATE_USER_FAILED`

### Error Codes cần map:
- `INVALID_ID` → `INVALID_INPUT`
- `INVALID_JSON` → `INVALID_INPUT`
- `INVALID_DATE_RANGE` → `INVALID_INPUT`
- `MISSING_PARAMETERS` → `MISSING_REQUIRED_FIELD`
- `OUTLET_STOCK_REQUIRED` → Cần thêm error code mới hoặc dùng `MISSING_REQUIRED_FIELD`
- `INVALID_OUTLET_STOCK` → `INVALID_INPUT`
- `NO_DEFAULT_BANK_ACCOUNT` → Cần thêm error code mới hoặc dùng `NOT_FOUND`
- `INVALID_ORDER_ID_FORMAT` → `INVALID_INPUT`
- `ACCESS_DENIED` → `FORBIDDEN`
- `INVALID_LIMITS_FORMAT` → `INVALID_INPUT`
- `INVALID_FEATURES_FORMAT` → `INVALID_INPUT`
- `NO_FIELDS_TO_UPDATE` → `NO_VALID_FIELDS`


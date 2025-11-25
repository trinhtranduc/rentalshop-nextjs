# Type-Safe Constants Update Plan

## Overview
Replace all string literals with type-safe constants from `@rentalshop/constants` package across all API routes. This improves type safety, enables better IDE autocomplete, prevents typos, and makes refactoring easier.

## Available Constants
- `USER_ROLE`: ADMIN, MERCHANT, OUTLET_ADMIN, OUTLET_STAFF
- `ORDER_STATUS`: RESERVED, PICKUPED, RETURNED, COMPLETED, CANCELLED
- `ORDER_TYPE`: RENT, SALE
- `SUBSCRIPTION_STATUS`: TRIAL, ACTIVE, PAST_DUE, CANCELLED, PAUSED, EXPIRED
- `PAYMENT_STATUS`: PENDING, COMPLETED, FAILED, REFUNDED, CANCELLED

## Files to Update

### 1. apps/api/app/api/users/route.ts
**Issues:**
- Line 15: `role?: 'ADMIN' | 'MERCHANT' | 'OUTLET_ADMIN' | 'OUTLET_STAFF'` → Use `UserRole` type
- Lines 62, 73, 76, 79, 86, 92, 106: String literals for role comparisons → Use `USER_ROLE` constants
- Lines 163, 167, 171, 187, 207, 372: String literals for role comparisons → Use `USER_ROLE` constants

**Changes:**
- Import `USER_ROLE, type UserRole` from `@rentalshop/constants`
- Replace `'ADMIN'` → `USER_ROLE.ADMIN`
- Replace `'MERCHANT'` → `USER_ROLE.MERCHANT`
- Replace `'OUTLET_ADMIN'` → `USER_ROLE.OUTLET_ADMIN`
- Replace `'OUTLET_STAFF'` → `USER_ROLE.OUTLET_STAFF`
- Replace type definition with `UserRole`

### 2. apps/api/app/api/outlets/route.ts
**Issues:**
- Lines 12, 101, 226, 337: `withAuthRoles(['ADMIN', 'MERCHANT', ...])` → Use `USER_ROLE` constants
- Line 55: `user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF'` → Use constants

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace `['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF']` → `[USER_ROLE.ADMIN, USER_ROLE.MERCHANT, USER_ROLE.OUTLET_ADMIN, USER_ROLE.OUTLET_STAFF]`
- Replace `['ADMIN', 'MERCHANT']` → `[USER_ROLE.ADMIN, USER_ROLE.MERCHANT]`
- Replace string comparisons with constants

### 3. apps/api/app/api/customers/route.ts
**Issues:**
- Lines 14, 143, 288: `withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])` → Use constants
- Lines 61, 63, 163, 170, 324: String literals for role comparisons

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace all `withAuthRoles` arrays with `USER_ROLE` constants
- Replace all string comparisons with constants

### 4. apps/api/app/api/products/route.ts
**Issues:**
- Already uses `USER_ROLE.ADMIN` in some places, but needs consistency check

**Changes:**
- Verify all role comparisons use `USER_ROLE` constants

### 5. apps/api/app/api/orders/route.ts
**Issues:**
- Line 87: `user.role === 'ADMIN'` → Use `USER_ROLE.ADMIN`
- Already uses `ORDER_TYPE` and `ORDER_STATUS` constants correctly

**Changes:**
- Import `USER_ROLE` if not already imported
- Replace string comparison with constant

### 6. apps/api/app/api/orders/stats/route.ts
**Issues:**
- Line 13: `withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])` → Use constants
- Line 29: `user.role === 'ADMIN'` → Use constant
- Lines 39, 46, 54: `status: 'PICKUPED'`, `status: 'COMPLETED'` → Use `ORDER_STATUS` constants

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace `withAuthRoles` array with constants
- Replace `'PICKUPED'` → `ORDER_STATUS.PICKUPED`
- Replace `'COMPLETED'` → `ORDER_STATUS.COMPLETED`

### 7. apps/api/app/api/analytics/income/route.ts
**Issues:**
- Line 13: `withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])` → Use constants
- Lines 37, 54: `user.role === 'MERCHANT'` → Use constant

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace all occurrences

### 8. apps/api/app/api/analytics/orders/route.ts
**Issues:**
- Line 12: `withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])` → Use constants
- Lines 23, 37, 86, 92, 97: String literals for role comparisons

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace all occurrences

### 9. apps/api/app/api/analytics/dashboard/route.ts
**Issues:**
- Line 13: `withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])` → Use constants
- Lines 41, 75, 82: String literals for role comparisons

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace all occurrences

### 10. apps/api/app/api/analytics/today-metrics/route.ts
**Issues:**
- Line 13: `withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])` → Use constants
- Lines 29, 36, 43: String literals for role comparisons

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace all occurrences

### 11. apps/api/app/api/analytics/top-customers/route.ts
**Issues:**
- Line 9: `withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])` → Use constants
- Lines 43, 49, 55, 121: String literals for role comparisons

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace all occurrences

### 12. apps/api/app/api/analytics/recent-orders/route.ts
**Issues:**
- Line 33: `status: { not: 'CANCELLED' }` → Use `ORDER_STATUS.CANCELLED`

**Changes:**
- Import `ORDER_STATUS` from `@rentalshop/constants`
- Replace string literal with constant

### 13. apps/api/app/api/analytics/enhanced-dashboard/route.ts
**Issues:**
- Lines 147, 156: `status: 'PICKUPED'` → Use `ORDER_STATUS.PICKUPED`

**Changes:**
- Import `ORDER_STATUS` from `@rentalshop/constants`
- Replace string literals with constants

### 14. apps/api/app/api/subscriptions/route.ts
**Issues:**
- Line 14: `withAuthRoles(['ADMIN', 'MERCHANT'])` → Use constants
- Line 30: `user.role !== 'ADMIN'` → Use constant

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace all occurrences

### 15. apps/api/app/api/subscriptions/[id]/cancel/route.ts
**Issues:**
- Line 15: `withAuthRoles(['ADMIN', 'MERCHANT'])` → Use constants
- Line 34: `status: 'CANCELLED'` → Use `SUBSCRIPTION_STATUS.CANCELLED`
- Line 49: `newStatus: 'CANCELLED'` → Use constant
- Line 56: `user.role === 'ADMIN'` → Use constant

**Changes:**
- Import `USER_ROLE, SUBSCRIPTION_STATUS` from `@rentalshop/constants`
- Replace all occurrences

### 16. apps/api/app/api/subscriptions/[id]/renew/route.ts
**Issues:**
- Line 15: `withAuthRoles(['ADMIN', 'MERCHANT'])` → Use constants

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace array with constants

### 17. apps/api/app/api/subscriptions/[id]/resume/route.ts
**Issues:**
- Line 54: `user.role === 'ADMIN'` → Use constant

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace string comparison

### 18. apps/api/app/api/subscriptions/[id]/pause/route.ts
**Issues:**
- Line 54: `user.role === 'ADMIN'` → Use constant

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace string comparison

### 19. apps/api/app/api/subscriptions/[id]/route.ts
**Issues:**
- Line 97: `status: 'CANCELLED'` → Use `SUBSCRIPTION_STATUS.CANCELLED`

**Changes:**
- Import `SUBSCRIPTION_STATUS` from `@rentalshop/constants`
- Replace string literal

### 20. apps/api/app/api/subscriptions/status/route.ts
**Issues:**
- Line 19: `withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])` → Use constants

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace array with constants

### 21. apps/api/app/api/auth/login/route.ts
**Issues:**
- Line 46: `user.role === 'MERCHANT'` → Use constant

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace string comparison

### 22. apps/api/app/api/auth/register/route.ts
**Issues:**
- Line 196: `role: 'MERCHANT'` → Use `USER_ROLE.MERCHANT`

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace string literal

### 23. apps/api/app/api/merchants/route.ts
**Issues:**
- Lines 11, 237: `withAuthRoles(['ADMIN'])` → Use constants

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace arrays with `[USER_ROLE.ADMIN]`

### 24. apps/api/app/api/merchants/[id]/route.ts
**Issues:**
- Lines 16, 73, 158: `withAuthRoles(['ADMIN', 'MERCHANT'])` or `['ADMIN']` → Use constants

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace all arrays

### 25. apps/api/app/api/merchants/[id]/plan/route.ts
**Issues:**
- Lines 15, 63: `withAuthRoles(['ADMIN', 'MERCHANT'])` → Use constants
- Line 156: `user.role === 'ADMIN'` → Use constant

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace all occurrences

### 26. apps/api/app/api/merchants/[id]/orders/route.ts
**Issues:**
- Line 91: `status: 'RESERVED'` → Use `ORDER_STATUS.RESERVED`

**Changes:**
- Import `ORDER_STATUS` from `@rentalshop/constants`
- Replace string literal

### 27. apps/api/app/api/merchants/register/route.ts
**Issues:**
- Line 71: `role: 'MERCHANT'` → Use `USER_ROLE.MERCHANT`

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace string literal

### 28. apps/api/app/api/customers/[id]/route.ts
**Issues:**
- Lines 16, 79, 145: `withAuthRoles(['ADMIN', 'MERCHANT', ...])` → Use constants

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace all arrays

### 29. apps/api/app/api/orders/by-number/[orderNumber]/route.ts
**Issues:**
- Line 17: `withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])` → Use constants
- Lines 27-28: String literals for ADMIN check

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace array and string comparisons

### 30. apps/api/app/api/orders/[orderId]/status/route.ts
**Issues:**
- Line 44: `withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])` → Use constants

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace array

### 31. apps/api/app/api/users/[id]/route.ts
**Issues:**
- Line 170: `existingUser.role === 'ADMIN' || (existingUser.role === 'MERCHANT'` → Use constants

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace string comparisons

### 32. apps/api/app/api/users/[id]/change-password/route.ts
**Issues:**
- Lines 88, 92, 103: String literals for role comparisons

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace all string comparisons

### 33. apps/api/app/api/users/profile/route.ts
**Issues:**
- Lines 177, 188: `currentUser?.role === 'ADMIN'` → Use constant

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace string comparisons

### 34. apps/api/app/api/products/[id]/availability/route.ts
**Issues:**
- Lines 85, 88, 123: String literals for role comparisons

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace all string comparisons

### 35. apps/api/app/api/products/availability/route.ts
**Issues:**
- Lines 61, 64, 73: String literals for role comparisons

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace all string comparisons

### 36. apps/api/app/api/settings/outlet/route.ts
**Issues:**
- Lines 25, 54: String literals for role comparisons

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace string comparisons

### 37. apps/api/app/api/categories/route.ts
**Issues:**
- Lines 23, 85: String literals for role comparisons

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace string comparisons

### 38. apps/api/app/api/categories/[id]/route.ts
**Issues:**
- Line 37: String literal for role comparison

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace string comparison

### 39. apps/api/app/api/plans/[id]/route.ts
**Issues:**
- Lines 16, 136, 296: `withAuthRoles(['ADMIN'])` → Use constants

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace arrays with `[USER_ROLE.ADMIN]`

### 40. apps/api/app/api/payments/manual/route.ts
**Issues:**
- Line 65: `status: 'COMPLETED'` → Use `PAYMENT_STATUS.COMPLETED`

**Changes:**
- Import `PAYMENT_STATUS` from `@rentalshop/constants`
- Replace string literal

### 41. apps/api/app/api/system/integrity/route.ts
**Issues:**
- Line 375: `orderType != 'CANCELLED'` → Use `ORDER_STATUS.CANCELLED`

**Changes:**
- Import `ORDER_STATUS` from `@rentalshop/constants`
- Replace string literal

### 42. apps/api/app/api/system/api-keys/route.ts
**Issues:**
- Lines 12, 35: `withAuthRoles(['ADMIN'])` → Use constants

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace arrays

### 43. apps/api/app/api/subscriptions/stats/route.ts
**Issues:**
- Line 12: `withAuthRoles(['ADMIN'])` → Use constants

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace array

### 44. apps/api/app/api/sync-standalone/route.ts
**Issues:**
- Lines 28, 185: `withAuthRoles(['ADMIN'])` → Use constants

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace arrays

### 45. apps/api/app/api/upload/cleanup/route.ts
**Issues:**
- Line 9: `withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])` → Use constants

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace array

### 46. apps/api/app/api/test-aws/route.ts
**Issues:**
- Line 9: `withAuthRoles(['ADMIN'])` → Use constants

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace array

### 47. apps/api/middleware.ts
**Issues:**
- Lines 196, 210: String literals for role comparisons

**Changes:**
- Import `USER_ROLE` from `@rentalshop/constants`
- Replace string comparisons

## Implementation Strategy

1. **Start with high-impact files**: Update files with most occurrences first (users, orders, analytics)
2. **Group by constant type**: Update all USER_ROLE first, then ORDER_STATUS, then others
3. **Verify imports**: Ensure all necessary constants are imported from `@rentalshop/constants`
4. **Test after each file**: Run linter to catch any type errors
5. **Consistent pattern**: Use the same pattern across all files:
   - Import constants at top: `import { USER_ROLE, ORDER_STATUS, ... } from '@rentalshop/constants'`
   - Replace string literals with constants
   - Replace type definitions with exported types

## Benefits

- **Type Safety**: TypeScript will catch typos and invalid values at compile time
- **Refactoring**: Easy to rename constants across entire codebase
- **IDE Support**: Better autocomplete and IntelliSense
- **Consistency**: Single source of truth for all status/role values
- **Maintainability**: Changes to constants only need to be made in one place


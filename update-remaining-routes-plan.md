# Plan: Update Remaining Routes to Use validateMerchantAccess

## Analysis

### Routes Already Using validateMerchantAccess ✅
- All `/api/merchants/[id]/...` routes (10 files) - COMPLETED

### Routes That Can Use validateMerchantAccess

#### 1. Bank Accounts Routes (Nested Merchant Routes)
**Files:**
- `apps/api/app/api/merchants/[id]/outlets/[outletId]/bank-accounts/route.ts`
- `apps/api/app/api/merchants/[id]/outlets/[outletId]/bank-accounts/[accountId]/route.ts`

**Current Status:**
- Using `validateMerchantOutletAccess` (manual validation)
- Can be replaced with `validateMerchantAccess(merchantId, user, userScope, outletId)`

**Benefits:**
- Consistent with other merchant routes
- Reduces code duplication
- Better error handling

### Routes That Cannot Use validateMerchantAccess (No Merchant ID in Path)

These routes don't have merchant ID in path params, so they validate merchant ownership differently:

#### 2. Products Routes
- `apps/api/app/api/products/[id]/route.ts` - Validates product.merchant.id === userScope.merchantId
- `apps/api/app/api/products/[id]/availability/route.ts` - Validates product.merchant.id === userScope.merchantId

**Note:** These routes validate merchant ownership by checking the resource's merchant, not by merchant ID in path. This is correct and doesn't need `validateMerchantAccess`.

#### 3. Customers Routes
- `apps/api/app/api/customers/[id]/route.ts` - Validates customer.merchantId === userScope.merchantId
- `apps/api/app/api/customers/[id]/orders/route.ts` - Validates customer.merchantId === userScope.merchantId

**Note:** Same as products - validates ownership through resource's merchant, not path param. This is correct.

#### 4. Outlets Routes
- `apps/api/app/api/outlets/route.ts` - Uses query params, not path params. Validates outlet.merchant.id === userScope.merchantId

**Note:** This route uses query params (`?id=123`), not path params. Validation is done after fetching outlet. This is correct.

## Implementation Plan

### Phase 1: Update Bank Accounts Routes

**File 1: `apps/api/app/api/merchants/[id]/outlets/[outletId]/bank-accounts/route.ts`**

**GET endpoint:**
- Replace manual validation with `validateMerchantAccess(merchantId, user, userScope, outletId)`
- Remove: `isNaN` check, merchant association check, manual outlet verification
- Use: `validateMerchantAccess` returns `{ merchant, outlet }`

**POST endpoint:**
- Already uses `validateMerchantOutletAccess` but can be replaced with `validateMerchantAccess`
- Remove: Manual outlet verification after `validateMerchantOutletAccess`
- Use: `validateMerchantAccess` returns outlet object

**File 2: `apps/api/app/api/merchants/[id]/outlets/[outletId]/bank-accounts/[accountId]/route.ts`**

**GET endpoint:**
- Replace manual validation with `validateMerchantAccess(merchantId, user, userScope, outletId)`
- Remove: All manual validation checks
- Use: `validateMerchantAccess` for merchant/outlet validation

**PUT endpoint:**
- Replace `validateMerchantOutletAccess` with `validateMerchantAccess`
- Remove: Manual bank account verification (outlet check is already done by `validateMerchantAccess`)

**DELETE endpoint:**
- Replace `validateMerchantOutletAccess` with `validateMerchantAccess`
- Remove: Manual bank account verification

### Phase 2: Verification

After updates:
1. All bank account routes use `validateMerchantAccess`
2. Consistent error messages
3. No duplicate validation logic
4. All imports are correct

## Files to Update

1. ✅ `apps/api/app/api/merchants/[id]/outlets/[outletId]/bank-accounts/route.ts` - GET, POST
2. ✅ `apps/api/app/api/merchants/[id]/outlets/[outletId]/bank-accounts/[accountId]/route.ts` - GET, PUT, DELETE

## Benefits

- **Consistency**: All nested merchant routes use same validation pattern
- **DRY**: Eliminates duplicate validation code
- **Maintainability**: Single source of truth for merchant/outlet validation
- **Security**: Ensures all routes have proper validation

## Notes

- Routes without merchant ID in path (products, customers, outlets) correctly validate ownership through the resource itself
- These routes don't need `validateMerchantAccess` because they don't have merchant ID in path params
- Bank accounts routes are the only remaining routes that can benefit from `validateMerchantAccess`


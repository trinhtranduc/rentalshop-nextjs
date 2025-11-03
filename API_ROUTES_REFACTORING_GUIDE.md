# API Routes Refactoring Guide

## Overview

All API routes (except authentication and health checks) need to be refactored for multi-tenant support. This guide provides the pattern to follow.

## Refactoring Pattern

### Step 1: Add Multi-Tenant Configuration

```typescript
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
```

### Step 2: Import Tenant DB Utilities

```typescript
import { getTenantDb } from '@rentalshop/database';
```

### Step 3: Extract Subdomain from Request

```typescript
export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN'])(
  async (request, { user }) => {
    const subdomain = request.headers.get('x-tenant-subdomain');
    
    if (!subdomain) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
        { status: 400 }
      );
    }
    
    // Get tenant DB
    const db = await getTenantDb(subdomain);
    
    // Use db instead of imported db
  }
);
```

### Step 4: Remove merchantId Filtering

**BEFORE (Old pattern):**
```typescript
const products = await db.product.findMany({
  where: {
    merchantId: userScope.merchantId,  // ❌ Remove this
    status: 'active'
  }
});
```

**AFTER (New pattern):**
```typescript
const db = await getTenantDb(subdomain);

const products = await db.product.findMany({
  where: {
    // NO merchantId - DB is already isolated per tenant
    status: 'active'
  }
});
```

### Step 5: Update Role-Based Filtering

**BEFORE (Old pattern):**
```typescript
let filterMerchantId = userScope.merchantId;
if (user.role === 'ADMIN') {
  filterMerchantId = queryMerchantId || userScope.merchantId;
}

let filterOutletId = userScope.outletId;
if (user.role === 'MERCHANT') {
  filterOutletId = queryOutletId || userScope.outletId;
}
```

**AFTER (New pattern):**
```typescript
// Only outlet filtering needed (merchant isolation automatic)
let filterOutletId = undefined;

if (user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF') {
  // Outlet users see only their outlet
  filterOutletId = user.outletId;
} else if (user.role === 'MERCHANT') {
  // Merchants see all outlets in their tenant DB
  filterOutletId = queryOutletId; // Optional query filter
}
```

## Files That Don't Need Changes

These routes are system-level and don't need multi-tenant refactoring:
- `apps/api/app/api/health/route.ts` - Health check
- `apps/api/app/api/docs/route.ts` - API documentation
- `apps/api/app/api/auth/login/route.ts` - Already updated
- `apps/api/app/api/auth/register/route.ts` - Already updated
- `apps/api/app/api/auth/logout/route.ts` - No DB access

## Files That Need Refactoring

### Priority 1: Core Data Models
- `apps/api/app/api/orders/**/*.ts` (multiple files)
- `apps/api/app/api/products/**/*.ts` (multiple files)
- `apps/api/app/api/customers/**/*.ts` (multiple files)
- `apps/api/app/api/outlets/**/*.ts` (multiple files)
- `apps/api/app/api/users/**/*.ts` (multiple files)

### Priority 2: Supporting Models
- `apps/api/app/api/categories/**/*.ts`
- `apps/api/app/api/payments/**/*.ts`
- `apps/api/app/api/order-items/**/*.ts`

### Priority 3: Analytics & Reports
- `apps/api/app/api/analytics/**/*.ts`
- `apps/api/app/api/orders/stats/route.ts`
- `apps/api/app/api/customers/[id]/orders/route.ts`

### Priority 4: Special Cases
- `apps/api/app/api/merchants/**/*.ts` - May need Main DB access
- `apps/api/app/api/subscriptions/**/*.ts` - May need Main DB access
- `apps/api/app/api/plans/**/*.ts` - May need Main DB access

## Common Patterns to Remove

### Pattern 1: Merchant ID Filtering
```typescript
// ❌ OLD
searchFilters.merchantId = userScope.merchantId;

// ✅ NEW - Remove entirely
```

### Pattern 2: Merchant Lookup
```typescript
// ❌ OLD
const merchant = await db.merchants.findById(outlet.merchantId);

// ✅ NEW - Remove, no merchant lookup needed
```

### Pattern 3: Merchant Association Checks
```typescript
// ❌ OLD
if (user.role !== 'ADMIN' && !userScope.merchantId) {
  return NextResponse.json(
    ResponseBuilder.error('MERCHANT_ASSOCIATION_REQUIRED'),
    { status: 403 }
  );
}

// ✅ NEW - Changed to subdomain check
if (!subdomain) {
  return NextResponse.json(
    ResponseBuilder.error('TENANT_REQUIRED'),
    { status: 400 }
  );
}
```

### Pattern 4: Role-Based Merchant Filtering
```typescript
// ❌ OLD
if (user.role === 'ADMIN') {
  searchFilters.merchantId = queryMerchantId;
} else {
  searchFilters.merchantId = userScope.merchantId;
}

// ✅ NEW - Remove entirely, DB is isolated
```

## Testing Checklist

After refactoring each file:

- [ ] Import `getTenantDb` added
- [ ] `export const dynamic = 'force-dynamic'` added
- [ ] Subdomain extracted from headers
- [ ] All `merchantId` references removed
- [ ] All `db` references changed to `tenantDb`
- [ ] Where clauses no longer filter by merchantId
- [ ] Role-based filtering updated (outlet only)

## Example: Complete Refactoring

### BEFORE
```typescript
import { db } from '@rentalshop/database';

export const GET = withManagementAuth(async (request, { user, userScope }) => {
  const products = await db.products.search({
    merchantId: userScope.merchantId,
    categoryId: categoryId,
    available: true
  });
  
  return NextResponse.json(ResponseBuilder.success('PRODUCTS_FOUND', products));
});
```

### AFTER
```typescript
import { getTenantDb } from '@rentalshop/database';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const GET = withManagementAuth(async (request, { user }) => {
  const subdomain = request.headers.get('x-tenant-subdomain');
  
  if (!subdomain) {
    return NextResponse.json(
      ResponseBuilder.error('TENANT_REQUIRED'),
      { status: 400 }
    );
  }
  
  const db = await getTenantDb(subdomain);
  
  // Note: No merchantId in where clause - DB is isolated
  const products = await db.product.findMany({
    where: {
      categoryId: categoryId,
      available: true
    }
  });
  
  return NextResponse.json(ResponseBuilder.success('PRODUCTS_FOUND', products));
});
```

## Batch Refactoring Strategy

1. **Group 1**: Start with simple read-only routes (GET endpoints)
2. **Group 2**: Refactor write operations (POST, PUT, DELETE)
3. **Group 3**: Handle complex routes (analytics, reports)
4. **Group 4**: Special cases (merchants, subscriptions)

## Automated Testing

After each group:
1. Test registration flow (creates tenant)
2. Test login with subdomain
3. Test API calls with X-Subdomain header
4. Verify data isolation between tenants

## Progress Tracking

Use grep to find remaining merchantId references:

```bash
# Find files with merchantId
grep -r "merchantId" apps/api/app/api --include="*.ts" | grep -v ".md"

# Count occurrences
grep -r "merchantId" apps/api/app/api --include="*.ts" | wc -l
```


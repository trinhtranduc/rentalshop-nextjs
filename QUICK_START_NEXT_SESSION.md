# Quick Start Guide - Next Session

## ✅ What's Complete

Phase 1 multi-tenant foundation is **100% complete** and working:

1. ✅ Main DB schema (`prisma/main/schema.prisma`)
2. ✅ Tenant DB schema (all `merchantId` removed)
3. ✅ Tenant DB Manager (`packages/database/src/tenant-db-manager.ts`)
4. ✅ Register API (auto-creates tenant databases)
5. ✅ Login API (admin vs tenant routing)
6. ✅ Middleware (header-based subdomain forwarding)
7. ✅ Environment & scripts configured
8. ✅ Prisma clients generated

## 🎯 What's Next

**Task**: Refactor 105 API route files to use tenant DB

**Priority**: Start with smallest/simplest files first

## 🚀 Quick Start Commands

```bash
# Navigate to project
cd /Users/mac/Source-Code/rentalshop-nextjs

# Generate both Prisma clients
yarn db:generate:all

# Build database package
yarn workspace @rentalshop/database build

# Start API server (if needed for testing)
yarn workspace @rentalshop/api dev
```

## 📋 Refactoring Pattern

For each API route file:

### 1. Add Configuration
```typescript
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
```

### 2. Import Tenant DB
```typescript
import { getTenantDb } from '@rentalshop/database';
```

### 3. Extract Subdomain
```typescript
const subdomain = request.headers.get('x-tenant-subdomain');
if (!subdomain) {
  return NextResponse.json(
    ResponseBuilder.error('TENANT_REQUIRED'),
    { status: 400 }
  );
}
```

### 4. Use Tenant DB
```typescript
const db = await getTenantDb(subdomain);

// Replace old: db.orders.search()
// With: db.order.findMany()
```

### 5. Remove merchantId
```typescript
// ❌ OLD
where: { merchantId: userScope.merchantId }

// ✅ NEW
where: { }  // DB is isolated, no merchantId needed
```

## 📁 Start With These Files

### Smallest Files First (7-50 lines):
```bash
apps/api/app/api/docs/route.ts         # 7 lines - no changes needed
apps/api/app/api/health/route.ts       # 16 lines - no changes needed
apps/api/app/api/plans/stats/route.ts  # 28 lines
apps/api/app/api/auth/logout/route.ts  # 51 lines
apps/api/app/api/audit-logs/stats/route.ts  # 50 lines
```

### Core Data Models (Critical):
```bash
apps/api/app/api/products/route.ts
apps/api/app/api/customers/route.ts
apps/api/app/api/outlets/route.ts
apps/api/app/api/users/route.ts
apps/api/app/api/orders/route.ts
```

## 🔧 Testing After Each Refactor

1. **Check for syntax errors**:
   ```bash
   yarn workspace @rentalshop/api lint
   ```

2. **Verify build**:
   ```bash
   yarn workspace @rentalshop/api build
   ```

3. **Look for merchantId**:
   ```bash
   grep -n "merchantId" apps/api/app/api/[your-file].ts
   ```

## 📊 Progress Tracking

Track progress with grep:

```bash
# Count merchantId references
grep -r "merchantId" apps/api/app/api --include="*.ts" | wc -l

# Find files with merchantId
grep -r "merchantId" apps/api/app/api --include="*.ts" | cut -d: -f1 | sort -u
```

## 📚 Key Documentation

- **Refactoring Guide**: `API_ROUTES_REFACTORING_GUIDE.md`
- **Status Report**: `MULTI_TENANT_PHASE1_STATUS.md`
- **Complete Docs**: `MULTI_TENANT_IMPLEMENTATION_COMPLETE.md`
- **Original Plan**: `multi-tenant-implementation.plan.md`

## ⚠️ Important Notes

1. **Removed**: `db.merchants` no longer exists
2. **Removed**: All `merchantId` fields from tenant schema
3. **Added**: `getTenantDb(subdomain)` for database access
4. **Added**: `export const dynamic = 'force-dynamic'` to all API routes
5. **Changed**: `db` → `tenantDb` in all routes

## 🎉 Success Criteria

Phase 1 complete when:
- [ ] All API routes use `getTenantDb(subdomain)`
- [ ] No `merchantId` references remain
- [ ] All files have `dynamic = 'force-dynamic'`
- [ ] Build succeeds without errors
- [ ] Registration creates tenant DB
- [ ] Login works for admin + tenant

## 🚨 Common Issues

### Issue: `Cannot find name 'db'`
**Solution**: Import `getTenantDb` and use it instead

### Issue: `Property 'merchants' does not exist`
**Solution**: Remove `db.merchants` references (no longer exists)

### Issue: TypeScript type errors
**Solution**: Regenerate Prisma clients: `yarn db:generate:all`

### Issue: `TENANT_REQUIRED` errors
**Solution**: Ensure `x-tenant-subdomain` header is set in requests

## 💡 Pro Tips

1. **Start small**: Refactor 5-10 simple files first
2. **Test frequently**: Build after each group of changes
3. **Use grep**: Find all merchantId references before starting
4. **Follow pattern**: Stick to the refactoring guide exactly
5. **Check logs**: Watch for runtime errors in API calls

## 🏁 End Goal

**Complete Phase 1**: All 105 API routes refactored for multi-tenant, all tests passing

**Then Phase 2**: Hostname-based subdomain routing, DNS setup, SSL certificates

Good luck! 🚀


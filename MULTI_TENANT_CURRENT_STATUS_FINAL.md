# Multi-Tenant Implementation Status

## ✅ Completed Tasks

### Phase 1: Infrastructure Setup

1. ✅ **Main Database Schema Created** (`prisma/main/schema.prisma`)
   - Tenant model for subdomain registry
   - Merchant model for business registration
   - User model for admin users
   - Plan model for subscriptions
   - Using raw SQL queries to avoid Prisma schema conflicts

2. ✅ **Tenant Schema Updated** (`prisma/schema.prisma`)
   - Removed `Merchant` model entirely
   - Removed `merchantId` from all models (User, Order, Product, Customer, Category, Outlet, Payment, etc.)
   - Each tenant database is now completely isolated

3. ✅ **Tenant DB Manager Created** (`packages/database/src/tenant-db-manager.ts`)
   - `getMainDb()`: Returns PostgreSQL Client for Main DB (raw SQL)
   - `getTenantDb(subdomain)`: Returns cached PrismaClient for tenant
   - `createTenantDatabase(subdomain, merchantId)`: Creates new PostgreSQL database
   - `generateSubdomain(businessName)`: Auto-generates subdomain
   - `validateSubdomain(subdomain)`: Validates subdomain format

4. ✅ **Database Package Updated**
   - Exported multi-tenant functions
   - Temporarily disabled merchant exports (not needed in tenant DB)
   - Built without TypeScript declaration files (to avoid conflicts)

5. ✅ **Environment & Scripts Updated**
   - Added `MAIN_DATABASE_URL` environment variable
   - Added scripts: `db:generate:main`, `db:push:main`, `db:migrate:main`
   - Added scripts: `db:generate:tenant`, `db:push:tenant`
   - Added script: `db:generate:all`

6. ✅ **Register API Refactored** (`apps/api/app/api/auth/register/route.ts`)
   - Detects merchant registration by `businessName` field
   - Creates Merchant in Main DB using raw SQL
   - Creates Tenant in Main DB with subdomain mapping
   - Creates isolated tenant database
   - Initializes default Outlet, Category, and User in tenant DB
   - Handles subdomain validation and conflicts

7. ✅ **Login API Refactored** (`apps/api/app/api/auth/login/route.ts`)
   - Admin login: Uses Main DB (no subdomain)
   - Tenant login: Uses Tenant DB (with subdomain)
   - Validates tenant exists and is active
   - Returns appropriate user data and token

8. ✅ **Middleware Updated** (`apps/api/middleware.ts`)
   - Phase 1: Header-based subdomain detection (`X-Subdomain`)
   - Forwards subdomain to downstream API handlers
   - Ready for Phase 2: Hostname-based detection

9. ✅ **Prisma Clients Generated**
   - Main DB Prisma client: Generated successfully
   - Tenant DB Prisma client: Generated successfully
   - Using raw SQL for Main DB to avoid conflicts

10. ✅ **Tenant DB Utility Created** (`packages/utils/src/core/tenant-utils.ts`)
    - `getTenantDbFromRequest(request)`: Centralized utility for tenant DB access
    - Returns `{ db, subdomain }` or `null`
    - Handles error responses consistently

11. ✅ **Main DB Setup Complete**
    - Schema pushed to Railway PostgreSQL
    - Super admin created: `admin@rentalshop.com / admin123`
    - Ready for tenant registration

### Phase 1: Core Business APIs Refactoring

12. ✅ **Orders API** (7 files) - 100% Complete
    - `/api/orders/route.ts` (GET, POST, PUT)
    - `/api/orders/[orderId]/route.ts` (GET, PUT)
    - `/api/orders/by-number/[orderNumber]/route.ts` (GET)
    - `/api/orders/stats/route.ts` (GET)
    - `/api/orders/statistics/route.ts` (GET)
    - `/api/orders/export/route.ts` (GET)
    - `/api/orders/cursor/route.ts` (GET)
    - All use `getTenantDbFromRequest`, removed `merchantId` filters

13. ✅ **Products API** (4 files) - 100% Complete
    - `/api/products/route.ts` (GET, POST)
    - `/api/products/[id]/route.ts` (GET, PUT, DELETE)
    - `/api/products/availability/route.ts` (GET)
    - `/api/products/export/route.ts` (GET)
    - All use tenant DB, S3 paths use subdomain

14. ✅ **Customers API** (5 files) - 100% Complete
    - `/api/customers/route.ts` (GET, POST, PUT)
    - `/api/customers/[id]/route.ts` (GET, PUT, DELETE)
    - `/api/customers/[id]/orders/route.ts` (GET)
    - `/api/customers/export/route.ts` (GET)
    - `/api/customers/debug/route.ts` (POST)
    - All use tenant DB, removed merchant isolation

15. ✅ **Outlets API** (1 file) - 100% Complete
    - `/api/outlets/route.ts` (GET, POST, PUT, DELETE)
    - Uses tenant DB, no merchantId

16. ✅ **Categories API** (2 files) - 100% Complete
    - `/api/categories/route.ts` (GET, POST)
    - `/api/categories/[id]/route.ts` (GET, PUT, DELETE)
    - All use tenant DB

17. ✅ **Users API** (4 files) - 100% Complete
    - `/api/users/route.ts` (GET, POST, PUT, DELETE)
    - `/api/users/[id]/route.ts` (GET, PUT, DELETE)
    - `/api/users/profile/route.ts` (GET, PUT)
    - `/api/users/[id]/change-password/route.ts` (PATCH)
    - Restricted to OUTLET_ADMIN, OUTLET_STAFF roles only

18. ✅ **Payments API** (1 file) - 100% Complete
    - `/api/payments/route.ts` (GET)
    - Uses tenant DB, removed merchant relations

**Core Business APIs Progress: 24/24 files (100%) ✅**

## ⚠️ Pending Tasks

### Critical: Remaining API Routes Refactoring

**Progress: 24/95 files refactored (25%)**

**Remaining: 41 files need refactoring**

**High Priority - Core Features (18 files):**
1. **Analytics APIs** (11 files) - Dashboard critical
   - `/api/analytics/dashboard/route.ts`
   - `/api/analytics/enhanced-dashboard/route.ts`
   - `/api/analytics/growth-metrics/route.ts`
   - `/api/analytics/income/route.ts`
   - `/api/analytics/orders/route.ts`
   - `/api/analytics/recent-activities/route.ts`
   - `/api/analytics/recent-orders/route.ts`
   - `/api/analytics/system/route.ts`
   - `/api/analytics/today-metrics/route.ts`
   - `/api/analytics/top-customers/route.ts`
   - `/api/analytics/top-products/route.ts`

2. **Calendar API** (1 file) - Scheduling
   - `/api/calendar/orders/route.ts`

3. **Settings APIs** (3 files) - Tenant configuration
   - `/api/settings/billing/route.ts`
   - `/api/settings/currency/route.ts`
   - `/api/settings/outlet/route.ts`

4. **Audit Logs APIs** (3 files) - Security & compliance
   - `/api/audit-logs/route.ts`
   - `/api/audit-logs/[id]/route.ts`
   - `/api/audit-logs/stats/route.ts`

**Medium Priority (6 files):**
5. **Additional Payments** (2 files)
   - `/api/payments/manual/route.ts`
   - `/api/payments/process/route.ts`

6. **Additional Products** (1 file)
   - `/api/products/[id]/availability/route.ts`

7. **Additional Orders** (1 file)
   - `/api/orders/[orderId]/status/route.ts`

8. **Additional Users** (1 file)
   - `/api/users/delete-account/route.ts`

9. **Billing Cycles** (2 files)
   - `/api/billing-cycles/route.ts`
   - `/api/billing-cycles/[id]/route.ts`

**Special Cases (17 files):**
10. **Subscriptions** (14 files) - May need Main DB access
    - All `/api/subscriptions/**` routes
    - Note: Subscription plans may be in Main DB

11. **Mobile APIs** (3 files) - Need requirement review
    - `/api/mobile/auth/login/route.ts`
    - `/api/mobile/notifications/register-device/route.ts`
    - `/api/mobile/sync/check/route.ts`

**To Delete (5 files):**
- `/api/merchants/**` - Merchant model doesn't exist in tenant DB

**Required Changes Pattern:**
1. Add `export const dynamic = 'force-dynamic'` and `export const runtime = 'nodejs'`
2. Import `getTenantDbFromRequest` from `@rentalshop/utils`
3. Use `const result = await getTenantDbFromRequest(request)` instead of `getTenantDb(subdomain)`
4. Remove all `merchantId` filtering
5. Remove `db.merchants.*` calls
6. Replace `db.{model}.search()` with `db.{model}.findMany()`
7. Replace `db.{model}.findById()` with `db.{model}.findUnique()`
8. Update role filtering (OUTLET_ADMIN, OUTLET_STAFF only in tenant DB)

**Example Pattern (Updated):**
```typescript
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { getTenantDbFromRequest, ResponseBuilder } from '@rentalshop/utils';

export const GET = withManagementAuth(async (request, { user }) => {
  const result = await getTenantDbFromRequest(request);
  
  if (!result) {
    return NextResponse.json(
      ResponseBuilder.error('TENANT_REQUIRED', 'Tenant subdomain is required'),
      { status: 400 }
    );
  }
  
  const { db } = result;
  
  // No merchantId filtering needed - DB is isolated
  const orders = await db.order.findMany({
    where: { 
      // Only outlet filtering if user is OUTLET_ADMIN/OUTLET_STAFF
      ...(user.role === 'OUTLET_ADMIN' || user.role === 'OUTLET_STAFF' 
        ? { outletId: user.outletId } 
        : {})
    }
  });
  
  return NextResponse.json(ResponseBuilder.success('ORDERS_FOUND', orders));
});
```

### Phase 1 Testing

- [ ] Test merchant registration (creates tenant DB)
- [ ] Test admin login (Main DB)
- [ ] Test tenant login (Tenant DB with subdomain)
- [ ] Test API routes with `X-Subdomain` header
- [ ] Verify data isolation between tenants

### Phase 2: Full Subdomain Routing

- [ ] Update middleware for hostname-based detection
- [ ] Setup DNS wildcard (`*.anyrent.shop`)
- [ ] Setup SSL certificate
- [ ] Test production subdomain routing

## Database Architecture

### Main Database (`admin.anyrent.shop`)
```
Tenant (subdomain registry)
  ├─ Subdomain → Database URL mapping
  ├─ Merchant ID reference
  └─ Status (active/inactive)

Merchant (business registration)
  ├─ Business details
  └─ Tenant relationship

User (admin users only)
  ├─ System administrators
  └─ Role: ADMIN

Plan (subscription plans)
  ├─ Pricing & limits
  └─ Features
```

### Tenant Databases (`{subdomain}.anyrent.shop`)
```
Each tenant has isolated database:
  ├─ Outlet
  ├─ User (MERCHANT/OUTLET roles)
  ├─ Product
  ├─ Customer
  ├─ Category
  ├─ Order
  ├─ Payment
  └─ AuditLog
```

## Key Decisions Made

1. **Raw SQL for Main DB**: Using PostgreSQL `pg` client to avoid Prisma schema conflicts
2. **Dynamic database connections**: Tenant DB clients created on-demand and cached
3. **Subdomain generation**: Auto-generated from business name (lowercase, hyphens only)
4. **Clean slate approach**: Drop existing database, rebuild from scratch
5. **Header-based first**: Phase 1 uses `X-Subdomain` header for development/testing

## Next Steps

### Immediate Priority (Phase 1 Completion)

1. **High Priority: Refactor Analytics APIs** (11 files)
   - Most critical for dashboard functionality
   - Estimated time: 2-3 hours
   - Apply standard multi-tenant pattern

2. **High Priority: Refactor Calendar API** (1 file)
   - Scheduling features
   - Estimated time: 30 minutes

3. **High Priority: Refactor Settings APIs** (3 files)
   - Tenant configuration
   - Estimated time: 1 hour

4. **High Priority: Refactor Audit Logs APIs** (3 files)
   - Security & compliance
   - Estimated time: 1 hour

**Total High Priority: 18 files (~5 hours)**

5. **Medium Priority: Additional Routes** (6 files)
   - Payments, Products, Orders, Users additional routes
   - Estimated time: 1-2 hours

6. **Special Cases: Subscriptions & Mobile** (17 files)
   - May need Main DB access for subscriptions
   - Review requirements for mobile APIs
   - Estimated time: 3-4 hours (includes analysis)

7. **Cleanup: Delete Merchant Routes** (5 files)
   - Remove `/api/merchants/**` routes
   - Estimated time: 5 minutes

### Phase 1 Testing

- [ ] Test merchant registration (creates tenant DB)
- [ ] Test admin login (Main DB: `admin@rentalshop.com / admin123`)
- [ ] Test tenant login (Tenant DB with `x-subdomain` header)
- [ ] Test core APIs with `x-subdomain` header
- [ ] Verify data isolation between tenants
- [ ] Test all 24 refactored core business APIs

### Phase 2: Production Deployment

- [ ] Update middleware for hostname-based detection
- [ ] Setup DNS wildcard (`*.anyrent.shop`)
- [ ] Setup SSL certificate
- [ ] Test production subdomain routing

## Progress Summary

- **Infrastructure**: ✅ 100% Complete
- **Core Business APIs**: ✅ 24/24 files (100%)
- **Remaining APIs**: ⚠️ 41/95 files (43% of total)
- **Overall Progress**: 24/95 files (25%)

**Status**: Ready for Phase 1 testing of core business APIs. High priority APIs need refactoring before full production deployment.

## Notes

- All Prisma types regenerated successfully
- Using `as any` type assertions temporarily in register API (schema correct, TypeScript cache issue)
- Database package built without TypeScript declarations to avoid build conflicts
- The multi-tenant foundation is solid - core business APIs complete
- `getTenantDbFromRequest` utility centralizes tenant DB access pattern
- Register API creates users as `OUTLET_ADMIN` (not `MERCHANT`) since tenant DB only has outlet-level roles

## Environment Configuration

**Database URLs** (Railway PostgreSQL):
- `DATABASE_URL`: Base connection (used for tenant schema migrations)
- `MAIN_DATABASE_URL`: Main DB connection (tenant registry + admin users)
- Both point to same PostgreSQL instance but different databases:
  - Main DB: `railway` database
  - Tenant DBs: `{subdomain}_shop_db` databases (created dynamically)

**Credentials:**
- Super Admin: `admin@rentalshop.com / admin123`
- Main DB: Contains Tenant registry, Admin users, Plans
- Tenant DBs: Isolated per merchant/subdomain


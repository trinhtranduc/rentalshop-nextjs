# 🎯 Multi-Tenant Implementation Plan

Kế hoạch triển khai Multi-Tenant Architecture với Admin Panel (chung) và Client App (per-tenant).

---

## 📊 Kiến Trúc Tổng Quan

```
┌─────────────────────────────────────────────────────────┐
│                    DOMAIN STRUCTURE                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  admin.anyrent.shop    → Admin Panel (Shared DB)         │
│  ├─ Quản lý tất cả merchants                            │
│  ├─ Tạo tenant mới                                       │
│  ├─ View system-wide analytics                          │
│  └─ Subscription management                             │
│                                                          │
│  abc.anyrent.shop      → Client App (Tenant DB #1)       │
│  ├─ Dashboard của shop "abc"                            │
│  ├─ Products của shop "abc"                             │
│  ├─ Orders của shop "abc"                               │
│  └─ Users đăng ký cho shop "abc"                        │
│                                                          │
│  xyz.anyrent.shop      → Client App (Tenant DB #2)       │
│  ├─ Dashboard của shop "xyz"                            │
│  ├─ Products của shop "xyz"                             │
│  └─ ...                                                 │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Architecture

```
┌─────────────────────────────────────────────────────────┐
│            MAIN DATABASE (Shared)                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  tenants                                                 │
│  ├─ id, subdomain, merchantId, databaseUrl, status       │
│                                                          │
│  users (System-wide authentication)                      │
│  ├─ ADMIN users (login từ admin.anyrent.shop)           │
│  ├─ MERCHANT users (login từ admin.anyrent.shop)         │
│  └─ OUTLET users (login từ tenant subdomain)             │
│                                                          │
│  plans (Subscription plans)                             │
│                                                          │
└─────────────────────────────────────────────────────────┘
              │
              │ Lookup by subdomain
              ▼
┌─────────────────────┐    ┌─────────────────────┐
│  Tenant DB #1       │    │  Tenant DB #2        │
│  abc_shop_db        │    │  xyz_shop_db         │
│                     │    │                      │
│  - orders           │    │  - orders            │
│  - products         │    │  - products          │
│  - customers        │    │  - customers         │
│  - outlets          │    │  - outlets           │
│  - users (outlet)   │    │  - users (outlet)    │
│                     │    │                      │
└─────────────────────┘    └─────────────────────┘
```

**Key Points:**
- ✅ **Admin Panel**: Dùng Main DB (shared) để quản lý tất cả tenants
- ✅ **Client App**: Mỗi tenant có DB riêng, hoàn toàn tách biệt
- ✅ **Users**: ADMIN/MERCHANT ở Main DB, OUTLET users ở Tenant DBs

---

## 🔐 User Flow & Authentication

### **1. Admin Panel (admin.anyrent.shop)**

```
User truy cập: admin.anyrent.shop
  ↓
Middleware: No subdomain → Main domain
  ↓
Auth: Login với role ADMIN hoặc MERCHANT
  ↓
Database: Main DB (shared)
  ↓
Features:
  - View all tenants
  - Create new tenant
  - Manage subscription plans
  - System-wide analytics
```

### **2. Tenant Client (abc.anyrent.shop)**

```
User truy cập: abc.anyrent.shop
  ↓
Middleware: Detect subdomain "abc"
  ↓
Lookup tenant trong Main DB
  ↓
Auth: Login với user trong Tenant DB
  ↓
Database: Tenant DB (abc_shop_db)
  ↓
Features:
  - Dashboard (chỉ data của shop abc)
  - Products (chỉ của shop abc)
  - Orders (chỉ của shop abc)
  - Users (chỉ outlet users của shop abc)
```

### **3. User Registration Flow**

```
User đăng ký tại: abc.anyrent.shop/register
  ↓
Middleware: Detect subdomain "abc"
  ↓
Get tenant từ Main DB (subdomain = "abc")
  ↓
Create user trong Tenant DB (abc_shop_db)
  ↓
Assign role: OUTLET_ADMIN hoặc OUTLET_STAFF
  ↓
User có thể login tại: abc.anyrent.shop/login
```

---

## 📋 Implementation Plan

### **Phase 1: Setup Infrastructure (Week 1)**

#### **1.1. Main Database Schema**

```prisma
// prisma/main-schema.prisma
generator client {
  provider = "prisma-client-js"
  output   = "../packages/database/src/generated/main-client"
}

datasource db {
  provider = "postgresql"
  url      = env("MAIN_DATABASE_URL")
}

model Tenant {
  id          String   @id @default(cuid())
  subdomain  String   @unique  // "abc", "xyz"
  name        String   // Shop name
  merchantId  Int      @unique  // Link với Merchant (tạm thời)
  databaseUrl String   // Connection string
  status      String   @default("active") // active, suspended, deleted
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([subdomain])
  @@index([merchantId])
  @@index([status])
}

model User {
  id          Int      @id @default(autoincrement())
  email       String   @unique
  password    String
  firstName   String
  lastName    String
  phone       String?
  role        String   @default("OUTLET_STAFF")
  isActive    Boolean  @default(true)
  merchantId  Int?     // For ADMIN/MERCHANT users
  tenantId    String?  // For OUTLET users (link to Tenant)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([email])
  @@index([merchantId])
  @@index([tenantId])
}

model Plan {
  id          Int      @id @default(autoincrement())
  name        String   @unique
  description String
  basePrice   Float
  currency    String   @default("USD")
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

#### **1.2. Tenant Database Schema**

```prisma
// prisma/schema.prisma (cho Tenant DBs)
// Giữ NGUYÊN schema hiện tại NHƯNG:
// - XÓA merchantId columns
// - XÓA Merchant model
// - XÓA Merchant relations

model User {
  id         Int      @id @default(autoincrement())
  email      String   @unique
  password   String
  firstName  String
  lastName   String
  phone      String?
  role       String   @default("OUTLET_STAFF") // Only OUTLET_* roles
  isActive   Boolean  @default(true)
  outletId   Int?     // Optional - for outlet assignment
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  outlet     Outlet?  @relation(fields: [outletId], references: [id])
  
  @@index([email])
  @@index([outletId])
}

model Order {
  id         Int      @id @default(autoincrement())
  orderNumber String  @unique
  status     String   @default("RESERVED")
  // ... other fields (NO merchantId!)
  outletId   Int
  customerId Int?
  createdById Int
  
  outlet     Outlet   @relation(fields: [outletId], references: [id])
  customer   Customer? @relation(fields: [customerId], references: [id])
  createdBy  User     @relation(fields: [createdById], references: [id])
  
  @@index([outletId])
  @@index([status])
}

model Product {
  id         Int      @id @default(autoincrement())
  name       String
  barcode    String?  @unique
  // ... other fields (NO merchantId!)
  categoryId Int
  
  category   Category @relation(fields: [categoryId], references: [id])
  
  @@index([categoryId])
}

// ... other models (tương tự - xóa merchantId)
```

#### **1.3. Database Utilities**

```typescript
// packages/database/src/tenant-db-manager.ts
import { PrismaClient as MainPrismaClient } from '@prisma/client/main-client';
import { PrismaClient as TenantPrismaClient } from '@prisma/client';
import { Client } from 'pg';

// Main DB client (singleton)
let mainDb: MainPrismaClient | null = null;

export function getMainDb(): MainPrismaClient {
  if (!mainDb) {
    mainDb = new MainPrismaClient({
      datasources: {
        db: { url: process.env.MAIN_DATABASE_URL! }
      }
    });
  }
  return mainDb;
}

// Tenant DB clients cache
const tenantClients = new Map<string, TenantPrismaClient>();

export async function getTenantDb(subdomain: string): Promise<TenantPrismaClient> {
  // Check cache
  if (tenantClients.has(subdomain)) {
    return tenantClients.get(subdomain)!;
  }
  
  // Get tenant from main DB
  const tenant = await getMainDb().tenant.findUnique({
    where: { subdomain }
  });
  
  if (!tenant || tenant.status !== 'active') {
    throw new Error(`Tenant not found or inactive: ${subdomain}`);
  }
  
  // Create tenant Prisma client
  const client = new TenantPrismaClient({
    datasources: {
      db: { url: tenant.databaseUrl }
    }
  });
  
  // Cache client
  tenantClients.set(subdomain, client);
  return client;
}

// Create tenant database
export async function createTenantDatabase(
  subdomain: string, 
  merchantId: number
): Promise<string> {
  const dbName = `${subdomain}_shop_db`;
  const mainDbUrl = process.env.MAIN_DATABASE_URL!;
  
  // Parse connection URL
  const url = new URL(mainDbUrl);
  const host = url.hostname;
  const port = url.port || '5432';
  const username = url.username;
  const password = url.password;
  const adminDbName = url.pathname.slice(1);
  
  // Connect to PostgreSQL as admin
  const adminClient = new Client({
    host,
    port: parseInt(port),
    user: username,
    password,
    database: adminDbName
  });
  
  await adminClient.connect();
  
  try {
    // Create database
    await adminClient.query(`CREATE DATABASE ${dbName};`);
    
    // Create tenant database URL
    const tenantDbUrl = `postgresql://${username}:${password}@${host}:${port}/${dbName}`;
    
    // Run migrations
    await migrateTenantDatabase(tenantDbUrl);
    
    return tenantDbUrl;
  } finally {
    await adminClient.end();
  }
}

// Migrate tenant database
async function migrateTenantDatabase(databaseUrl: string) {
  const originalUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = databaseUrl;
  
  try {
    // Use Prisma migrate hoặc db push
    const { execSync } = require('child_process');
    execSync('npx prisma db push', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: databaseUrl }
    });
  } finally {
    if (originalUrl) {
      process.env.DATABASE_URL = originalUrl;
    }
  }
}
```

---

### **Phase 2: Middleware & Routing (Week 1-2)**

#### **2.1. Subdomain Detection Middleware**

```typescript
// apps/api/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { getMainDb } from '@rentalshop/database';

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;
  
  // Extract subdomain
  const subdomain = extractSubdomain(hostname);
  
  const requestHeaders = new Headers(request.headers);
  
  // Admin panel (admin.anyrent.shop hoặc no subdomain)
  if (!subdomain || subdomain === 'admin' || subdomain === 'www') {
    // Main domain - use Main DB
    requestHeaders.set('x-tenant-mode', 'main');
    return NextResponse.next({
      request: { headers: requestHeaders }
    });
  }
  
  // API routes - skip subdomain detection
  if (pathname.startsWith('/api/')) {
    // API routes sẽ handle subdomain riêng
    return NextResponse.next();
  }
  
  // Tenant subdomain (abc.anyrent.shop)
  try {
    const mainDb = getMainDb();
    const tenant = await mainDb.tenant.findUnique({
      where: { subdomain }
    });
    
    if (!tenant) {
      return NextResponse.redirect('https://anyrent.shop/404');
    }
    
    if (tenant.status !== 'active') {
      return NextResponse.redirect('https://anyrent.shop/suspended');
    }
    
    // Attach tenant info
    requestHeaders.set('x-tenant-subdomain', subdomain);
    requestHeaders.set('x-tenant-id', tenant.id);
    requestHeaders.set('x-tenant-mode', 'tenant');
    
    return NextResponse.next({
      request: { headers: requestHeaders }
    });
  } catch (error) {
    console.error('Tenant lookup error:', error);
    return NextResponse.redirect('https://anyrent.shop/500');
  }
}

function extractSubdomain(hostname: string): string | null {
  // Remove port
  const host = hostname.split(':')[0];
  
  // Local development
  if (host === 'localhost' || host === '127.0.0.1') {
    // Use custom header for dev
    return null; // Will be handled by X-Subdomain header
  }
  
  // Production: abc.anyrent.shop
  const parts = host.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }
  
  return null;
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

#### **2.2. API Route Middleware Helper**

```typescript
// packages/database/src/api-helpers.ts
import { NextRequest } from 'next/server';
import { getMainDb, getTenantDb } from './tenant-db-manager';

export async function getDbFromRequest(request: NextRequest) {
  const tenantMode = request.headers.get('x-tenant-mode');
  const subdomain = request.headers.get('x-tenant-subdomain');
  
  if (tenantMode === 'main' || !subdomain) {
    // Admin panel - use Main DB
    return {
      db: getMainDb(),
      mode: 'main' as const
    };
  }
  
  // Tenant client - use Tenant DB
  const tenantDb = await getTenantDb(subdomain);
  return {
    db: tenantDb,
    mode: 'tenant' as const,
    subdomain
  };
}
```

---

### **Phase 3: Tenant Creation API (Week 2)**

#### **3.1. Create Tenant Endpoint**

```typescript
// apps/api/app/api/admin/tenants/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { getMainDb, createTenantDatabase } from '@rentalshop/database';
import { generateSubdomain, validateSubdomain } from '@rentalshop/utils';
import { ResponseBuilder, handleApiError } from '@rentalshop/utils';

export const POST = withAuthRoles(['ADMIN'])(async (request, { user }) => {
  try {
    const body = await request.json();
    const { name, email, phone, merchantId } = body;
    
    // Generate subdomain
    const subdomain = generateSubdomain(name);
    
    // Validate subdomain
    if (!validateSubdomain(subdomain)) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_SUBDOMAIN'),
        { status: 400 }
      );
    }
    
    // Check if subdomain already exists
    const mainDb = getMainDb();
    const existing = await mainDb.tenant.findUnique({
      where: { subdomain }
    });
    
    if (existing) {
      return NextResponse.json(
        ResponseBuilder.error('SUBDOMAIN_ALREADY_EXISTS'),
        { status: 400 }
      );
    }
    
    // Create tenant database
    const databaseUrl = await createTenantDatabase(subdomain, merchantId);
    
    // Create tenant record
    const tenant = await mainDb.tenant.create({
      data: {
        subdomain,
        name,
        merchantId,
        databaseUrl,
        status: 'active'
      }
    });
    
    return NextResponse.json(
      ResponseBuilder.success('TENANT_CREATED_SUCCESS', {
        id: tenant.id,
        subdomain: tenant.subdomain,
        name: tenant.name,
        url: `https://${tenant.subdomain}.anyrent.shop`,
        databaseUrl: tenant.databaseUrl
      }),
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Error creating tenant:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

export const GET = withAuthRoles(['ADMIN'])(async (request) => {
  try {
    const mainDb = getMainDb();
    const tenants = await mainDb.tenant.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(
      ResponseBuilder.success('TENANTS_FETCHED_SUCCESS', tenants)
    );
  } catch (error) {
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
```

---

### **Phase 4: User Registration (Week 2-3)**

#### **4.1. Tenant Registration Endpoint**

```typescript
// apps/api/app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTenantDb, getMainDb } from '@rentalshop/database';
import { hashPassword } from '@rentalshop/auth';
import { ResponseBuilder, handleApiError } from '@rentalshop/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, firstName, lastName, phone, role = 'OUTLET_STAFF' } = body;
    
    // Get subdomain từ header (set bởi middleware)
    const subdomain = request.headers.get('x-tenant-subdomain');
    
    if (!subdomain) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_SUBDOMAIN_REQUIRED'),
        { status: 400 }
      );
    }
    
    // Validate tenant exists
    const mainDb = getMainDb();
    const tenant = await mainDb.tenant.findUnique({
      where: { subdomain }
    });
    
    if (!tenant || tenant.status !== 'active') {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_NOT_FOUND'),
        { status: 404 }
      );
    }
    
    // Get tenant database
    const tenantDb = await getTenantDb(subdomain);
    
    // Check if email already exists trong tenant DB
    const existing = await tenantDb.user.findUnique({
      where: { email }
    });
    
    if (existing) {
      return NextResponse.json(
        ResponseBuilder.error('EMAIL_ALREADY_EXISTS'),
        { status: 400 }
      );
    }
    
    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Create user trong tenant DB
    const user = await tenantDb.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role, // OUTLET_ADMIN or OUTLET_STAFF
        isActive: true
      }
    });
    
    return NextResponse.json(
      ResponseBuilder.success('USER_REGISTERED_SUCCESS', {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }),
      { status: 201 }
    );
    
  } catch (error) {
    console.error('Registration error:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}
```

#### **4.2. Tenant Login Endpoint**

```typescript
// apps/api/app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTenantDb, getMainDb } from '@rentalshop/database';
import { verifyPassword, generateToken } from '@rentalshop/auth';
import { ResponseBuilder, handleApiError } from '@rentalshop/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    
    // Get subdomain từ header
    const subdomain = request.headers.get('x-tenant-subdomain');
    
    if (!subdomain) {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_SUBDOMAIN_REQUIRED'),
        { status: 400 }
      );
    }
    
    // Validate tenant
    const mainDb = getMainDb();
    const tenant = await mainDb.tenant.findUnique({
      where: { subdomain }
    });
    
    if (!tenant || tenant.status !== 'active') {
      return NextResponse.json(
        ResponseBuilder.error('TENANT_NOT_FOUND'),
        { status: 404 }
      );
    }
    
    // Get tenant database
    const tenantDb = await getTenantDb(subdomain);
    
    // Find user trong tenant DB
    const user = await tenantDb.user.findUnique({
      where: { email }
    });
    
    if (!user) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_CREDENTIALS'),
        { status: 401 }
      );
    }
    
    // Verify password
    const isValid = await verifyPassword(password, user.password);
    
    if (!isValid) {
      return NextResponse.json(
        ResponseBuilder.error('INVALID_CREDENTIALS'),
        { status: 401 }
      );
    }
    
    // Generate token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantSubdomain: subdomain, // Add tenant info to token
      tenantId: tenant.id
    });
    
    return NextResponse.json(
      ResponseBuilder.success('LOGIN_SUCCESS', {
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantSubdomain: subdomain
        }
      })
    );
    
  } catch (error) {
    console.error('Login error:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
}
```

---

### **Phase 5: API Routes Update (Week 3-4)**

#### **5.1. Update Orders API**

```typescript
// apps/api/app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDbFromRequest } from '@rentalshop/database';
import { withAuthRoles } from '@rentalshop/auth';
import { ResponseBuilder, handleApiError } from '@rentalshop/utils';

export const GET = withAuthRoles(['ADMIN', 'MERCHANT', 'OUTLET_ADMIN', 'OUTLET_STAFF'])(
  async (request, { user }) => {
    try {
      // Get database từ request (Main DB hoặc Tenant DB)
      const { db, mode, subdomain } = await getDbFromRequest(request);
      
      if (mode === 'main') {
        // Admin panel - có thể query all tenants
        // Tạm thời return empty hoặc require tenant filter
        return NextResponse.json(
          ResponseBuilder.success('ORDERS_FETCHED_SUCCESS', [])
        );
      }
      
      // Tenant mode - query từ tenant DB
      const { searchParams } = new URL(request.url);
      const status = searchParams.get('status');
      
      const where: any = {};
      if (status) {
        where.status = status;
      }
      
      // NO merchantId filter needed - mỗi DB chỉ có 1 tenant!
      const orders = await db.order.findMany({
        where,
        include: {
          customer: true,
          outlet: true,
          orderItems: {
            include: { product: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 50
      });
      
      return NextResponse.json(
        ResponseBuilder.success('ORDERS_FETCHED_SUCCESS', orders)
      );
      
    } catch (error) {
      const { response, statusCode } = handleApiError(error);
      return NextResponse.json(response, { status: statusCode });
    }
  }
);
```

---

### **Phase 6: Migration Scripts (Week 4)**

#### **6.1. Clear All Databases Script**

```typescript
// scripts/clear-all-databases.ts
import { getMainDb } from '@rentalshop/database';
import { PrismaClient } from '@prisma/client';
import { Client } from 'pg';

async function clearAllDatabases() {
  console.log('🗑️  Starting database cleanup...');
  
  // 1. Clear Main Database
  console.log('Clearing Main Database...');
  const mainDb = getMainDb();
  
  await mainDb.tenant.deleteMany({});
  await mainDb.user.deleteMany({});
  await mainDb.plan.deleteMany({});
  
  console.log('✅ Main Database cleared');
  
  // 2. Get all tenant databases
  const tenants = await mainDb.tenant.findMany({
    select: { databaseUrl: true, subdomain: true }
  });
  
  // 3. Clear each tenant database
  for (const tenant of tenants) {
    console.log(`Clearing tenant database: ${tenant.subdomain}...`);
    
    try {
      const tenantDb = new PrismaClient({
        datasources: {
          db: { url: tenant.databaseUrl }
        }
      });
      
      // Delete all data
      await tenantDb.orderItem.deleteMany({});
      await tenantDb.payment.deleteMany({});
      await tenantDb.order.deleteMany({});
      await tenantDb.outletStock.deleteMany({});
      await tenantDb.product.deleteMany({});
      await tenantDb.category.deleteMany({});
      await tenantDb.customer.deleteMany({});
      await tenantDb.outlet.deleteMany({});
      await tenantDb.user.deleteMany({});
      
      await tenantDb.$disconnect();
      console.log(`✅ Tenant ${tenant.subdomain} cleared`);
    } catch (error) {
      console.error(`❌ Error clearing ${tenant.subdomain}:`, error);
    }
  }
  
  // 4. Optionally drop all tenant databases
  const dropDatabases = process.env.DROP_TENANT_DATABASES === 'true';
  
  if (dropDatabases) {
    console.log('🗑️  Dropping tenant databases...');
    
    const mainDbUrl = process.env.MAIN_DATABASE_URL!;
    const url = new URL(mainDbUrl);
    const adminClient = new Client({
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1)
    });
    
    await adminClient.connect();
    
    for (const tenant of tenants) {
      const dbName = `${tenant.subdomain}_shop_db`;
      try {
        await adminClient.query(`DROP DATABASE IF EXISTS ${dbName};`);
        console.log(`✅ Dropped database: ${dbName}`);
      } catch (error) {
        console.error(`❌ Error dropping ${dbName}:`, error);
      }
    }
    
    await adminClient.end();
  }
  
  console.log('✅ All databases cleared!');
}

// Run script
if (require.main === module) {
  clearAllDatabases()
    .catch(console.error)
    .finally(() => process.exit(0));
}

export { clearAllDatabases };
```

#### **6.2. Package.json Scripts**

```json
{
  "scripts": {
    "db:clear-all": "ts-node scripts/clear-all-databases.ts",
    "db:clear-main": "railway run --service apis npx prisma db push --schema=prisma/main-schema.prisma --accept-data-loss --force-reset",
    "db:migrate-tenant": "ts-node scripts/migrate-tenant-database.ts",
    "db:create-tenant": "ts-node scripts/create-tenant-test.ts"
  }
}
```

---

## ✅ Implementation Checklist

### **Week 1: Infrastructure**
- [ ] Create Main Database schema (`prisma/main-schema.prisma`)
- [ ] Setup Main Database on Railway
- [ ] Create Tenant DB Manager utilities
- [ ] Implement subdomain detection middleware
- [ ] Update Tenant schema (remove merchantId)

### **Week 2: Core Features**
- [ ] Tenant creation API
- [ ] Tenant registration flow
- [ ] Tenant login flow
- [ ] Admin panel tenant management

### **Week 3: API Updates**
- [ ] Update Orders API (tenant-aware)
- [ ] Update Products API (tenant-aware)
- [ ] Update Customers API (tenant-aware)
- [ ] Update Users API (tenant-aware)

### **Week 4: Testing & Migration**
- [ ] Clear database scripts
- [ ] Migration scripts
- [ ] End-to-end testing
- [ ] Performance testing

---

## 🧪 Testing Plan

### **1. Tenant Creation**
```bash
# Create tenant via API
curl -X POST https://admin.anyrent.shop/api/admin/tenants \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ABC Shop",
    "email": "abc@example.com",
    "phone": "+1234567890",
    "merchantId": 1
  }'

# Expected: Tenant created, database created, subdomain: "abc"
```

### **2. User Registration**
```bash
# Register user tại tenant subdomain
curl -X POST https://abc.anyrent.shop/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "role": "OUTLET_ADMIN"
  }'

# Expected: User created trong abc_shop_db
```

### **3. Data Isolation**
```bash
# Create product tại abc.anyrent.shop
# Verify product chỉ có trong abc_shop_db
# Verify product KHÔNG có trong xyz_shop_db
```

---

## 🚀 Deployment Steps

1. **Setup Main Database**
   ```bash
   railway add postgresql --name main-db
   railway variables --set MAIN_DATABASE_URL='${{Postgres.DATABASE_URL}}'
   ```

2. **Deploy API Service**
   ```bash
   git push
   ```

3. **Create First Tenant**
   ```bash
   # Via Admin Panel hoặc API
   ```

4. **Test End-to-End**
   ```bash
   # Test registration, login, data isolation
   ```

---

## 📝 Notes

- ✅ **Admin Panel**: Vẫn dùng Main DB, có thể clear toàn bộ
- ✅ **Client App**: Mỗi tenant có DB riêng, hoàn toàn tách biệt
- ✅ **User Registration**: Tự động tạo trong tenant DB
- ✅ **Clear Database**: Script sẵn sàng để test

**Ready to implement?** Bắt đầu với Phase 1! 🚀


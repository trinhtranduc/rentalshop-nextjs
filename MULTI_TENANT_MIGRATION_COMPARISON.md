# 🔄 Multi-Tenant Migration: So Sánh Hiện Tại vs Mới

Tài liệu so sánh chi tiết kiến trúc hiện tại và kiến trúc multi-tenant mới.

---

## 📊 Tổng Quan So Sánh

| Aspect | **Hiện Tại (Shared DB)** | **Mới (Database-per-Tenant)** |
|--------|-------------------------|-------------------------------|
| **Database** | 1 database cho tất cả merchants | 1 Main DB + N Tenant DBs |
| **Routing** | URL-based (`/merchants/123`) | Subdomain-based (`abc.anyrent.shop`) |
| **Data Isolation** | `merchantId` filter | Database-level isolation |
| **Connection** | 1 Prisma client | Dynamic Prisma clients |
| **Performance** | Medium (shared resources) | High (isolated resources) |
| **Scalability** | Limited | Excellent |
| **Backup** | All merchants together | Per-tenant backup |

---

## 🏗️ Kiến Trúc So Sánh

### **HIỆN TẠI: Shared Database Architecture**

```
┌─────────────────────────────────────────────┐
│         Single PostgreSQL Database          │
├─────────────────────────────────────────────┤
│                                             │
│  ┌───────────────────────────────────────┐   │
│  │  merchants (id, name, email, ...)    │   │
│  │  ├─ merchant_id: 1                   │   │
│  │  ├─ merchant_id: 2                   │   │
│  │  └─ merchant_id: 3                   │   │
│  └───────────────────────────────────────┘   │
│                                             │
│  ┌───────────────────────────────────────┐   │
│  │  orders (merchantId filter)           │   │
│  │  ├─ WHERE merchantId = 1             │   │
│  │  ├─ WHERE merchantId = 2             │   │
│  │  └─ WHERE merchantId = 3             │   │
│  └───────────────────────────────────────┘   │
│                                             │
│  ┌───────────────────────────────────────┐   │
│  │  products, customers, outlets...       │   │
│  │  (all với merchantId column)          │   │
│  └───────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

**Flow hiện tại:**
```
1. User login → JWT chứa merchantId
2. API request → Extract merchantId từ JWT
3. Database query → WHERE merchantId = ?
4. Return data
```

### **MỚI: Database-per-Tenant Architecture**

```
┌─────────────────────────────────────────────────────────┐
│            Main Database (Tenant Registry)               │
├─────────────────────────────────────────────────────────┤
│  tenants                                                │
│  ├─ subdomain: "abc" → database_url: "postgres://..."  │
│  ├─ subdomain: "xyz" → database_url: "postgres://..."  │
│  └─ subdomain: "shop1" → database_url: "postgres://..."│
│                                                          │
│  users (authentication)                                  │
│  plans (subscription plans)                              │
└─────────────────────────────────────────────────────────┘
              │
              │ Lookup by subdomain
              ▼
┌─────────────────────┐    ┌─────────────────────┐
│  Tenant DB #1        │    │  Tenant DB #2        │
│  abc_shop_db        │    │  xyz_shop_db         │
│                     │    │                      │
│  - orders           │    │  - orders            │
│  - products         │    │  - products          │
│  - customers        │    │  - customers          │
│  - outlets          │    │  - outlets           │
│  (NO merchantId!)   │    │  (NO merchantId!)    │
└─────────────────────┘    └─────────────────────┘
```

**Flow mới:**
```
1. User truy cập: abc.anyrent.shop
2. Middleware detect subdomain: "abc"
3. Lookup tenant trong Main DB
4. Get database_url từ tenant record
5. Connect tới tenant database
6. Query KHÔNG CẦN merchantId filter
7. Return data
```

---

## 🔄 Thay Đổi Chi Tiết

### **1. Database Schema**

#### **HIỆN TẠI:**

```prisma
// prisma/schema.prisma
model Merchant {
  id    Int    @id @default(autoincrement())
  name  String
  email String @unique
  // ... other fields
}

model Order {
  id         Int @id @default(autoincrement())
  merchantId Int  // ← Filter bằng merchantId
  // ... other fields
  merchant   Merchant @relation(fields: [merchantId], references: [id])
}

model Product {
  id         Int @id @default(autoincrement())
  merchantId Int  // ← Filter bằng merchantId
  // ... other fields
  merchant   Merchant @relation(fields: [merchantId], references: [id])
}

// Tất cả models đều có merchantId
```

#### **MỚI:**

```prisma
// prisma/main-schema.prisma (Tenant Registry)
model Tenant {
  id          String   @id @default(cuid())
  subdomain   String   @unique  // "abc"
  merchantId  Int      @unique  // Link với Merchant
  databaseUrl String   // Connection string
  status      String   @default("active")
}

model User {
  // System-wide users (authentication)
  id         Int    @id @default(autoincrement())
  email      String @unique
  merchantId Int?   // Optional - for tenant assignment
}

model Plan {
  // Subscription plans (shared)
  id   Int    @id @default(autoincrement())
  name String @unique
}

// prisma/schema.prisma (Tenant Databases)
// SAME schema nhưng KHÔNG CÓ merchantId!

model Order {
  id       Int @id @default(autoincrement())
  // NO merchantId - mỗi DB chỉ có 1 tenant!
  // ... other fields
}

model Product {
  id       Int @id @default(autoincrement())
  // NO merchantId - mỗi DB chỉ có 1 tenant!
  // ... other fields
}
```

**Thay đổi:**
- ✅ Tạo Main Database schema riêng
- ✅ Tenant schema giữ nguyên (NHƯNG xóa merchantId columns)
- ✅ Không cần merchantId foreign keys nữa

---

### **2. Database Connection**

#### **HIỆN TẠI:**

```typescript
// packages/database/src/client.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL // Single database URL
    }
  }
});

// Usage:
const orders = await prisma.order.findMany({
  where: { merchantId: user.merchantId } // ← Filter by merchantId
});
```

#### **MỚI:**

```typescript
// packages/database/src/tenant-db-manager.ts
import { PrismaClient as MainPrismaClient } from '@prisma/client/main-client';
import { PrismaClient as TenantPrismaClient } from '@prisma/client';

// Main database (tenant registry)
export function getMainDb(): MainPrismaClient {
  return new MainPrismaClient({
    datasources: {
      db: { url: process.env.MAIN_DATABASE_URL }
    }
  });
}

// Tenant database (dynamic)
const tenantClients = new Map<string, TenantPrismaClient>();

export function getTenantDb(subdomain: string): TenantPrismaClient {
  // 1. Check cache
  if (tenantClients.has(subdomain)) {
    return tenantClients.get(subdomain)!;
  }
  
  // 2. Get tenant from main DB
  const tenant = await getMainDb().tenant.findUnique({
    where: { subdomain }
  });
  
  // 3. Create client với tenant database URL
  const client = new TenantPrismaClient({
    datasources: {
      db: { url: tenant.databaseUrl }
    }
  });
  
  // 4. Cache client
  tenantClients.set(subdomain, client);
  return client;
}

// Usage:
const subdomain = request.headers.get('x-tenant-subdomain');
const db = getTenantDb(subdomain);
const orders = await db.order.findMany(); // ← NO merchantId filter!
```

**Thay đổi:**
- ✅ Tạo Main Database client riêng
- ✅ Dynamic Tenant Database client
- ✅ Connection caching
- ✅ Không cần merchantId filter nữa

---

### **3. Middleware - Subdomain Detection**

#### **HIỆN TẠI:**

```typescript
// apps/api/middleware.ts
export async function middleware(request: NextRequest) {
  // Extract token từ header
  const token = request.headers.get('authorization');
  const payload = verifyTokenSimple(token);
  
  // Forward merchantId từ JWT
  requestHeaders.set('x-user-id', payload.userId.toString());
  requestHeaders.set('x-user-role', payload.role);
  // merchantId trong JWT payload
  
  return NextResponse.next({ request: { headers: requestHeaders } });
}
```

#### **MỚI:**

```typescript
// apps/api/middleware.ts
export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  
  // 1. Extract subdomain
  const subdomain = extractSubdomain(hostname);
  
  if (!subdomain || subdomain === 'www' || subdomain === 'api') {
    // Main domain - use shared DB
    return NextResponse.next();
  }
  
  // 2. Validate tenant exists
  const mainDb = getMainDb();
  const tenant = await mainDb.tenant.findUnique({
    where: { subdomain }
  });
  
  if (!tenant || tenant.status !== 'active') {
    return NextResponse.redirect('https://anyrent.shop/404');
  }
  
  // 3. Attach tenant info to headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-subdomain', subdomain);
  requestHeaders.set('x-tenant-id', tenant.id);
  requestHeaders.set('x-merchant-id', tenant.merchantId.toString());
  
  return NextResponse.next({
    request: { headers: requestHeaders }
  });
}

function extractSubdomain(hostname: string): string | null {
  // abc.anyrent.shop => "abc"
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }
  return null;
}
```

**Thay đổi:**
- ✅ Detect subdomain từ hostname
- ✅ Lookup tenant từ Main DB
- ✅ Forward tenant info trong headers
- ✅ Handle invalid subdomains

---

### **4. API Routes**

#### **HIỆN TẠI:**

```typescript
// apps/api/app/api/orders/route.ts
import { db } from '@rentalshop/database';

export const GET = withAuthRoles(['ADMIN', 'MERCHANT'])(
  async (request, { user, userScope }) => {
    // userScope.merchantId từ JWT
    const orders = await db.orders.search({
      merchantId: userScope.merchantId, // ← Filter by merchantId
      status: 'ACTIVE'
    });
    
    return NextResponse.json({ orders });
  }
);
```

#### **MỚI:**

```typescript
// apps/api/app/api/orders/route.ts
import { getTenantDb } from '@rentalshop/database';

export const GET = withAuthRoles(['ADMIN', 'MERCHANT'])(
  async (request, { user, userScope }) => {
    // Get subdomain từ header (set bởi middleware)
    const subdomain = request.headers.get('x-tenant-subdomain');
    
    if (!subdomain) {
      return NextResponse.json(
        { error: 'Tenant subdomain required' },
        { status: 400 }
      );
    }
    
    // Get tenant-specific database
    const db = getTenantDb(subdomain);
    
    // Query KHÔNG CẦN merchantId filter!
    const orders = await db.order.findMany({
      where: {
        status: 'ACTIVE'
        // NO merchantId - mỗi DB chỉ có 1 tenant
      },
      include: {
        customer: true,
        orderItems: true
      }
    });
    
    return NextResponse.json({ orders });
  }
);
```

**Thay đổi:**
- ✅ Get subdomain từ header (thay vì merchantId từ JWT)
- ✅ Use tenant DB thay vì shared DB
- ✅ Xóa tất cả `merchantId` filters
- ✅ Queries đơn giản hơn (không cần WHERE merchantId)

---

### **5. Database Package API**

#### **HIỆN TẠI:**

```typescript
// packages/database/src/index.ts
export const db = {
  orders: {
    search: async (filters: { merchantId: number, ... }) => {
      return await prisma.order.findMany({
        where: {
          merchantId: filters.merchantId, // ← Required!
          // ... other filters
        }
      });
    }
  },
  products: {
    search: async (filters: { merchantId: number, ... }) => {
      return await prisma.product.findMany({
        where: {
          merchantId: filters.merchantId, // ← Required!
        }
      });
    }
  }
};
```

#### **MỚI:**

```typescript
// packages/database/src/index.ts
export function getTenantDb(subdomain: string) {
  // Returns tenant-specific PrismaClient
  // Each tenant has isolated database
}

// Usage trong API routes:
export const db = {
  // Main DB operations (tenant registry)
  tenants: {
    findBySubdomain: async (subdomain: string) => {
      const mainDb = getMainDb();
      return await mainDb.tenant.findUnique({ where: { subdomain } });
    }
  },
  
  // Tenant DB operations (dynamic)
  // Không cần merchantId trong filters nữa!
  orders: {
    search: async (subdomain: string, filters: { status?: string, ... }) => {
      const db = getTenantDb(subdomain);
      return await db.order.findMany({
        where: {
          // NO merchantId - each DB is isolated!
          status: filters.status,
          // ... other filters
        }
      });
    }
  }
};
```

**Thay đổi:**
- ✅ Dynamic database selection based on subdomain
- ✅ Remove merchantId từ tất cả filters
- ✅ Simpler queries (no tenant filtering needed)

---

### **6. Merchant Creation Flow**

#### **HIỆN TẠI:**

```typescript
// apps/api/app/api/merchants/route.ts
export const POST = async (request) => {
  const { name, email, phone } = await request.json();
  
  // Create merchant trong shared DB
  const merchant = await db.merchants.create({
    name, email, phone
  });
  
  // Create default outlet
  const outlet = await db.outlets.create({
    merchantId: merchant.id,
    name: `${merchant.name} - Main Store`
  });
  
  return NextResponse.json({ merchant });
};
```

#### **MỚI:**

```typescript
// apps/api/app/api/merchants/route.ts
export const POST = async (request) => {
  const { name, email, phone } = await request.json();
  
  // 1. Create merchant trong shared DB (tạm thời giữ lại)
  const merchant = await db.merchants.create({
    name, email, phone
  });
  
  // 2. Generate subdomain từ shop name
  const subdomain = generateSubdomain(name);
  
  // 3. Create tenant database
  const databaseUrl = await createTenantDatabase(subdomain, merchant.id);
  
  // 4. Create tenant record trong Main DB
  const tenant = await getMainDb().tenant.create({
    data: {
      subdomain,
      name,
      merchantId: merchant.id,
      databaseUrl,
      status: 'active'
    }
  });
  
  // 5. Run migrations trên tenant DB
  await migrateTenantDatabase(databaseUrl);
  
  // 6. Create default outlet trong tenant DB
  const tenantDb = getTenantDb(subdomain);
  const outlet = await tenantDb.outlet.create({
    data: {
      name: `${name} - Main Store`,
      isDefault: true
    }
  });
  
  return NextResponse.json({
    merchant,
    tenant: {
      subdomain: tenant.subdomain,
      url: `https://${tenant.subdomain}.anyrent.shop`
    }
  });
};
```

**Thay đổi:**
- ✅ Auto-create tenant database khi tạo merchant
- ✅ Auto-generate subdomain
- ✅ Auto-run migrations
- ✅ Setup default outlet trong tenant DB

---

### **7. Frontend Routing**

#### **HIỆN TẠI:**

```
https://admin.anyrent.shop
  ├─ /merchants/1/dashboard
  ├─ /merchants/1/products
  └─ /merchants/1/orders
```

#### **MỚI:**

```
https://abc.anyrent.shop (Tenant subdomain)
  ├─ /dashboard
  ├─ /products
  └─ /orders

https://admin.anyrent.shop (Main admin)
  ├─ /merchants (list all merchants)
  └─ /merchants/1 (view merchant details)
```

**Thay đổi:**
- ✅ Merchant dashboard move sang subdomain
- ✅ Cleaner URLs (không cần /merchants/1 prefix)
- ✅ Admin panel vẫn ở main domain

---

## 📋 Migration Checklist

### **Phase 1: Setup Infrastructure**
- [ ] Tạo Main Database schema (`prisma/main-schema.prisma`)
- [ ] Setup Main Database trên Railway
- [ ] Tạo Tenant DB Manager utilities
- [ ] Implement subdomain detection middleware

### **Phase 2: Tenant Creation**
- [ ] API endpoint để tạo tenant
- [ ] Auto-create tenant database
- [ ] Auto-run migrations
- [ ] Subdomain validation & generation

### **Phase 3: Data Migration**
- [ ] Export existing data theo merchant
- [ ] Import vào tenant databases
- [ ] Verify data integrity
- [ ] Remove merchantId columns từ tenant schemas

### **Phase 4: API Updates**
- [ ] Update tất cả API routes để use tenant DB
- [ ] Remove merchantId filters
- [ ] Update database package exports
- [ ] Update frontend để support subdomain routing

### **Phase 5: Testing & Deployment**
- [ ] Test tenant creation flow
- [ ] Test subdomain routing
- [ ] Test data isolation
- [ ] Performance testing
- [ ] Deploy to production

---

## ⚠️ Breaking Changes

### **1. Database Schema**
- ❌ **BREAKING**: Tenant schemas không còn `merchantId` columns
- ❌ **BREAKING**: Không còn `Merchant` relation trong tenant DBs
- ✅ **NEW**: Main DB có `Tenant` model

### **2. API Routes**
- ❌ **BREAKING**: Tất cả routes cần `x-tenant-subdomain` header
- ❌ **BREAKING**: Queries không accept `merchantId` filter nữa
- ✅ **NEW**: Subdomain-based routing thay vì URL-based

### **3. Frontend**
- ❌ **BREAKING**: URLs thay đổi (subdomain-based)
- ❌ **BREAKING**: Need to handle subdomain routing
- ✅ **NEW**: Cleaner URLs (no /merchants/1 prefix)

### **4. Database Package**
- ❌ **BREAKING**: `db.orders.search()` signature thay đổi
- ❌ **BREAKING**: Need subdomain parameter
- ✅ **NEW**: Simpler queries (no merchantId filter)

---

## 🎯 Migration Strategy

### **Option 1: Big Bang Migration** (Không khuyến nghị)
- Migrate tất cả cùng lúc
- High risk, downtime
- ❌ Không recommend

### **Option 2: Gradual Migration** (Khuyến nghị) ⭐

**Phase 1: Dual Write (1-2 tuần)**
- Keep shared DB
- Create tenant DBs cho new merchants
- Write vào cả 2 databases
- Verify data consistency

**Phase 2: Migrate Existing (2-4 tuần)**
- Export existing merchants data
- Import vào tenant DBs
- Create tenant records
- Verify all data migrated

**Phase 3: Switch Read (1 tuần)**
- Read từ tenant DBs
- Vẫn write vào cả 2
- Monitor performance

**Phase 4: Full Switch (1 tuần)**
- Read & Write chỉ từ tenant DBs
- Archive shared DB
- Remove dual write code

---

## 💰 Cost Comparison

### **Hiện Tại:**
```
PostgreSQL (Shared):    $5/month
API Service:            $5/month
───────────────────────────────
Total:                  ~$10/month
```

### **Mới (10 tenants):**
```
Main PostgreSQL:        $5/month
API Service:            $5/month
Tenant Databases:       $0 (same PostgreSQL instance)
───────────────────────────────
Total:                  ~$10/month ✅ Same cost!
```

### **Mới (100 tenants):**
```
Main PostgreSQL:        $5/month
API Service:            $5/month
Tenant Databases:       $0 (same PostgreSQL instance)
───────────────────────────────
Total:                  ~$10/month ✅ Still same cost!
```

**Note:** Với shared PostgreSQL instance, cost không tăng khi có nhiều tenant databases!

---

## 🚀 Benefits

### **Performance**
- ✅ Isolated databases = better performance
- ✅ No cross-tenant query overhead
- ✅ Independent scaling

### **Security**
- ✅ Database-level isolation
- ✅ No risk of data leakage
- ✅ Easier compliance (GDPR, etc.)

### **Operational**
- ✅ Per-tenant backup/restore
- ✅ Easier troubleshooting
- ✅ Independent maintenance

### **Developer Experience**
- ✅ Cleaner code (no merchantId filters)
- ✅ Simpler queries
- ✅ Better TypeScript support

---

## 📚 Next Steps

1. **Review** migration plan
2. **Setup** Main Database
3. **Implement** Tenant DB Manager
4. **Test** với 1-2 tenants
5. **Migrate** existing data
6. **Deploy** to production

---

**Ready to start?** Xem [RAILWAY_MULTI_TENANT_GUIDE.md](./RAILWAY_MULTI_TENANT_GUIDE.md) để bắt đầu! 🚀


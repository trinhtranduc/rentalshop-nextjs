# 🏢 Multi-Tenant Architecture với Subdomain Routing

## 📚 Tên Gọi Mô Hình

Mô hình bạn muốn triển khai có tên gọi là:

**"Multi-Tenant SaaS với Database-per-Tenant Architecture và Subdomain Routing"**

### Các Thuật Ngữ Chính:

1. **Multi-Tenancy (Đa Thuê Bao)**: 
   - Một ứng dụng phục vụ nhiều khách hàng (tenants) độc lập
   - Mỗi tenant là một merchant/store riêng biệt

2. **Database-per-Tenant**:
   - Mỗi tenant có database riêng
   - Tăng performance, bảo mật, và khả năng scale

3. **Subdomain Routing**:
   - Mỗi tenant có subdomain riêng: `{shopname}.anyrent.shop`
   - Ví dụ: `abc.anyrent.shop`, `xyz.anyrent.shop`

---

## 🏗️ Các Mô Hình Multi-Tenancy

### 1. Shared Database, Shared Schema (Hiện tại của bạn)
```
┌─────────────────────────────────────┐
│     Shared Database                  │
│  ┌───────────────────────────────┐   │
│  │  merchants (tenant_id)        │   │
│  │  orders (tenant_id)           │   │
│  │  products (tenant_id)         │   │
│  └───────────────────────────────┘   │
└─────────────────────────────────────┘
```
- ✅ Dễ triển khai
- ✅ Chi phí thấp
- ❌ Performance thấp khi có nhiều tenant
- ❌ Khó backup/restore từng tenant
- ❌ Security risks cao hơn

### 2. Shared Database, Separate Schema (Schema-per-Tenant)
```
┌─────────────────────────────────────┐
│     Shared Database                  │
│  ┌──────────┐  ┌──────────┐         │
│  │ abc_shop │  │ xyz_shop │         │
│  │ schema   │  │ schema   │         │
│  └──────────┘  └──────────┘         │
└─────────────────────────────────────┘
```
- ✅ Isolation tốt hơn
- ✅ Backup theo schema
- ❌ Phức tạp hơn
- ❌ Vẫn dùng chung resources

### 3. Database-per-Tenant ⭐ (Mô hình bạn muốn)
```
┌──────────────┐    ┌──────────────┐
│  abc_shop_db │    │  xyz_shop_db │
│  (abc shop)  │    │  (xyz shop)  │
└──────────────┘    └──────────────┘
```
- ✅ **Performance cao nhất** - mỗi DB độc lập
- ✅ **Security tốt nhất** - hoàn toàn tách biệt
- ✅ **Scalability tốt** - scale từng tenant riêng
- ✅ **Backup/Restore dễ dàng** - theo từng DB
- ✅ **Custom schema** - mỗi tenant có thể customize
- ❌ Chi phí cao hơn (nhiều DB)
- ❌ Quản lý phức tạp hơn

---

## 🎯 Kiến Trúc Tổng Quan

### Flow Hoạt Động:

```
1. User truy cập: abc.anyrent.shop
   ↓
2. Next.js Middleware detect subdomain: "abc"
   ↓
3. Lookup tenant database từ "abc"
   ↓
4. Connect tới database của tenant "abc"
   ↓
5. Serve data từ database đó
```

### Cấu Trúc Database:

```
Main Database (Shared):
├── tenants (danh sách các tenant)
│   ├── id
│   ├── subdomain (abc, xyz)
│   ├── database_url
│   ├── merchant_id
│   └── status
│
└── users (system-wide users)

Tenant Databases (Separate):
├── abc_shop_db (PostgreSQL)
│   ├── orders
│   ├── products
│   ├── customers
│   └── ...
│
└── xyz_shop_db (PostgreSQL)
    ├── orders
    ├── products
    ├── customers
    └── ...
```

---

## 🛠️ Implementation Plan

### Bước 1: Setup Main Database (Tenant Registry)

Cần một database chung để quản lý danh sách tenants:

```prisma
// prisma/main-schema.prisma
model Tenant {
  id          String   @id @default(cuid())
  subdomain   String   @unique  // "abc", "xyz"
  name        String
  merchantId  Int      @unique  // Link với Merchant hiện tại
  databaseUrl String   // Connection string tới tenant DB
  status      String   @default("active") // active, suspended, deleted
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([subdomain])
  @@index([merchantId])
}
```

### Bước 2: Dynamic Database Connection

Tạo utility để connect tới database động:

```typescript
// packages/database/src/tenant-db.ts
import { PrismaClient } from '@prisma/client';

// Cache các Prisma clients theo tenant
const tenantClients = new Map<string, PrismaClient>();

export function getTenantDb(subdomain: string): PrismaClient {
  // Check cache trước
  if (tenantClients.has(subdomain)) {
    return tenantClients.get(subdomain)!;
  }
  
  // Load tenant config từ main DB
  const tenant = await getTenantBySubdomain(subdomain);
  
  if (!tenant) {
    throw new Error(`Tenant not found: ${subdomain}`);
  }
  
  if (tenant.status !== 'active') {
    throw new Error(`Tenant is ${tenant.status}`);
  }
  
  // Tạo Prisma client với database URL của tenant
  const client = new PrismaClient({
    datasources: {
      db: {
        url: tenant.databaseUrl
      }
    }
  });
  
  // Cache client
  tenantClients.set(subdomain, client);
  
  return client;
}

async function getTenantBySubdomain(subdomain: string) {
  // Query từ main database
  const mainDb = new PrismaClient();
  return await mainDb.tenant.findUnique({
    where: { subdomain }
  });
}
```

### Bước 3: Subdomain Detection Middleware

```typescript
// apps/api/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  
  // Extract subdomain
  const subdomain = extractSubdomain(hostname);
  
  if (!subdomain || subdomain === 'www' || subdomain === 'api' || subdomain === 'admin') {
    // Main domain hoặc special subdomains
    return NextResponse.next();
  }
  
  // Validate tenant exists
  const tenant = await getTenantBySubdomain(subdomain);
  
  if (!tenant) {
    return NextResponse.redirect('https://anyrent.shop/404');
  }
  
  if (tenant.status !== 'active') {
    return NextResponse.redirect('https://anyrent.shop/suspended');
  }
  
  // Attach tenant info to request headers
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-tenant-subdomain', subdomain);
  requestHeaders.set('x-tenant-id', tenant.id);
  requestHeaders.set('x-merchant-id', tenant.merchantId.toString());
  
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

function extractSubdomain(hostname: string): string | null {
  // Remove port if present
  const host = hostname.split(':')[0];
  
  // Local development: localhost hoặc 127.0.0.1
  if (host === 'localhost' || host === '127.0.0.1') {
    // Use custom header for dev: X-Subdomain: abc
    return request.headers.get('x-subdomain');
  }
  
  // Production: abc.anyrent.shop
  const parts = host.split('.');
  
  // abc.anyrent.shop => ["abc", "anyrent", "shop"]
  if (parts.length >= 3) {
    return parts[0]; // "abc"
  }
  
  return null;
}
```

### Bước 4: API Routes với Tenant Context

```typescript
// apps/api/app/api/orders/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTenantDb } from '@rentalshop/database';

export async function GET(request: NextRequest) {
  try {
    // Get tenant từ header
    const subdomain = request.headers.get('x-tenant-subdomain');
    
    if (!subdomain) {
      return NextResponse.json(
        { error: 'Tenant subdomain required' },
        { status: 400 }
      );
    }
    
    // Get tenant-specific database
    const db = getTenantDb(subdomain);
    
    // Query từ tenant database
    const orders = await db.order.findMany({
      where: {
        // Không cần filter merchantId vì mỗi DB chỉ có 1 tenant
      },
      include: {
        customer: true,
        orderItems: true,
      },
    });
    
    return NextResponse.json({ orders });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

### Bước 5: Tenant Creation Flow

Khi merchant tạo store, tự động tạo database:

```typescript
// apps/api/app/api/tenants/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createTenantDatabase, generateSubdomain } from '@rentalshop/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { merchantId, shopName } = body;
    
    // 1. Generate subdomain từ shop name
    const subdomain = generateSubdomain(shopName);
    // abc shop => "abc"
    // xyz-super-shop => "xyz-super"
    
    // 2. Create database cho tenant
    const databaseUrl = await createTenantDatabase(subdomain);
    // Kết quả: postgresql://user:pass@host/abc_shop_db
    
    // 3. Run migrations cho tenant database
    await migrateTenantDatabase(databaseUrl);
    
    // 4. Lưu thông tin tenant vào main database
    const mainDb = new PrismaClient();
    const tenant = await mainDb.tenant.create({
      data: {
        subdomain,
        name: shopName,
        merchantId,
        databaseUrl,
        status: 'active',
      },
    });
    
    return NextResponse.json({ tenant });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

---

## 🗄️ Database Setup Scripts

### 1. Tạo Database Utility

```typescript
// packages/database/src/tenant-utils.ts
import { execSync } from 'child_process';

export async function createTenantDatabase(subdomain: string): Promise<string> {
  const dbName = `${subdomain}_shop_db`;
  const dbUser = `${subdomain}_user`;
  const dbPassword = generateSecurePassword();
  
  // PostgreSQL command
  const commands = [
    `CREATE DATABASE ${dbName};`,
    `CREATE USER ${dbUser} WITH PASSWORD '${dbPassword}';`,
    `GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${dbUser};`,
  ];
  
  // Execute via psql hoặc PostgreSQL client
  execSync(`psql -U postgres -c "${commands.join(' ')}"`);
  
  // Return connection string
  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = process.env.POSTGRES_PORT || '5432';
  
  return `postgresql://${dbUser}:${dbPassword}@${host}:${port}/${dbName}`;
}

export async function migrateTenantDatabase(databaseUrl: string) {
  // Set DATABASE_URL cho Prisma
  process.env.DATABASE_URL = databaseUrl;
  
  // Run migrations
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
    },
  });
}

function generateSecurePassword(): string {
  // Generate random secure password
  return require('crypto').randomBytes(32).toString('hex');
}

export function generateSubdomain(shopName: string): string {
  return shopName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-') // Replace special chars
    .replace(/-+/g, '-')          // Remove duplicate dashes
    .replace(/^-|-$/g, '')        // Remove leading/trailing dashes
    .substring(0, 50);            // Limit length
}
```

---

## 🔒 Security Considerations

### 1. Subdomain Validation
- Chỉ cho phép chữ cái, số, và dấu gạch ngang
- Giới hạn độ dài
- Tránh reserved subdomains (www, api, admin, mail, etc.)

### 2. Database Isolation
- Mỗi tenant có user/password riêng
- Không share connection pool
- Tự động disconnect khi không dùng

### 3. Rate Limiting
- Rate limit theo từng tenant
- Prevent DDoS attacks trên từng subdomain

---

## 📊 Performance Optimization

### 1. Connection Pooling
```typescript
// Cache Prisma clients để tránh tạo lại
const tenantClients = new Map<string, PrismaClient>();

// Cleanup unused connections
setInterval(() => {
  // Disconnect clients không dùng trong 5 phút
}, 5 * 60 * 1000);
```

### 2. Database Connection Limits
```typescript
// Mỗi tenant DB có connection pool riêng
const client = new PrismaClient({
  datasources: {
    db: { url: tenant.databaseUrl }
  },
  // Optimize connection pool
  log: ['error'],
});
```

### 3. Caching Tenant Info
```typescript
// Cache tenant lookup để tránh query main DB nhiều lần
const tenantCache = new Map<string, Tenant>();

async function getTenant(subdomain: string) {
  if (tenantCache.has(subdomain)) {
    return tenantCache.get(subdomain)!;
  }
  
  const tenant = await mainDb.tenant.findUnique({
    where: { subdomain }
  });
  
  if (tenant) {
    tenantCache.set(subdomain, tenant);
    // Cache 5 phút
    setTimeout(() => tenantCache.delete(subdomain), 5 * 60 * 1000);
  }
  
  return tenant;
}
```

---

## 🚀 Deployment Considerations

### 1. Railway / Production
```bash
# Setup PostgreSQL databases
# Option 1: Shared PostgreSQL với nhiều databases
POSTGRES_HOST=xxx.railway.app
POSTGRES_PORT=5432

# Option 2: Separate PostgreSQL instances per tenant (better isolation)
# Sử dụng Railway PostgreSQL addon cho mỗi tenant mới
```

### 2. DNS Configuration
```
# Wildcard DNS record
*.anyrent.shop => CNAME => your-server.com

# Hoặc sử dụng Cloudflare
*.anyrent.shop => Proxied => Your IP
```

### 3. SSL Certificates
```
# Wildcard SSL certificate
*.anyrent.shop SSL cert

# Hoặc Let's Encrypt với wildcard DNS challenge
certbot certonly --dns-cloudflare -d "*.anyrent.shop"
```

---

## 📝 Migration Strategy

### Chuyển từ Shared DB sang Database-per-Tenant:

1. **Phase 1: Dual Write**
   - Vẫn write vào shared DB
   - Đồng thời write vào tenant DB
   - Verify data consistency

2. **Phase 2: Migrate Existing Data**
   - Export data theo merchant
   - Import vào tenant database riêng
   - Verify data integrity

3. **Phase 3: Switch Read**
   - Read từ tenant DB
   - Vẫn write vào cả 2
   - Monitor performance

4. **Phase 4: Full Switch**
   - Chỉ dùng tenant DB
   - Archive shared DB
   - Remove dual write code

---

## ⚠️ Challenges & Solutions

### Challenge 1: Database Migration
**Problem**: Mỗi tenant DB cần migrate riêng
**Solution**: 
- Script tự động migrate khi tạo tenant
- Version control cho schema changes
- Rollback strategy

### Challenge 2: Cross-Tenant Queries
**Problem**: Không thể query across tenants
**Solution**:
- Keep shared data trong main DB (users, plans)
- Tenant-specific data trong tenant DB

### Challenge 3: Backup & Restore
**Problem**: Backup nhiều databases
**Solution**:
- Automated backup script per tenant
- Point-in-time recovery per tenant
- Test restore process

### Challenge 4: Cost Management
**Problem**: Nhiều DB = chi phí cao
**Solution**:
- Shared PostgreSQL instance với nhiều databases
- Archive inactive tenants
- Tiered storage

---

## 🎯 Recommended Architecture

### Hybrid Approach (Recommended):

```
Main Database (Shared):
├── tenants (tenant registry)
├── users (authentication)
├── plans (subscription plans)
└── payments (system-wide)

Tenant Databases (Per Merchant):
├── orders
├── products
├── customers
└── outlet_stocks
```

**Lý do:**
- ✅ Authentication data shared (users login từ bất kỳ subdomain nào)
- ✅ Tenant registry shared (lookup nhanh)
- ✅ Business data isolated (performance tốt)
- ✅ Backup/restore dễ dàng

---

## 📚 Next Steps

1. **Setup Main Database Schema** - Tenant registry
2. **Create Subdomain Middleware** - Detect và route
3. **Implement Tenant DB Creation** - Auto-create khi merchant tạo store
4. **Migrate Existing Data** - Phân tách data hiện tại
5. **Update API Routes** - Use tenant DB thay vì shared DB
6. **Setup DNS & SSL** - Wildcard subdomain support
7. **Monitoring & Logging** - Track per-tenant metrics

---

## 🚂 Railway Deployment

**👉 Xem hướng dẫn chi tiết:** [RAILWAY_MULTI_TENANT_GUIDE.md](./RAILWAY_MULTI_TENANT_GUIDE.md)

Guide này bao gồm:
- ✅ Setup Main Database trên Railway
- ✅ Tạo Tenant Database động (2 options)
- ✅ DNS Configuration cho wildcard subdomain
- ✅ Environment Variables setup
- ✅ Tenant Creation Flow với Railway
- ✅ Monitoring & Cost management
- ✅ Troubleshooting guide

---

## 🔗 Resources

- [Prisma Multi-Tenant Guide](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)
- [Next.js Middleware](https://nextjs.org/docs/advanced-features/middleware)
- [PostgreSQL Multi-Database](https://www.postgresql.org/docs/current/managing-databases.html)
- [Subdomain Routing Patterns](https://vercel.com/docs/concepts/edge-network/headers)
- [Railway Multi-Tenant Deployment](./RAILWAY_MULTI_TENANT_GUIDE.md)

---

**Lưu ý**: Đây là kiến trúc phức tạp, nên triển khai từng bước và test kỹ trước khi production! 🚀


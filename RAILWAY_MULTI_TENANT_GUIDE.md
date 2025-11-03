# 🚂 Railway Multi-Tenant Deployment Guide

Hướng dẫn chi tiết triển khai Multi-Tenant Architecture với Database-per-Tenant và Subdomain Routing trên Railway.

---

## 📋 Table of Contents

1. [Kiến Trúc Railway Multi-Tenant](#-kiến-trúc-railway-multi-tenant)
2. [Setup Main Database (Tenant Registry)](#-setup-main-database-tenant-registry)
3. [Tạo Tenant Database Động](#-tạo-tenant-database-động)
4. [DNS Configuration (Wildcard Subdomain)](#-dns-configuration-wildcard-subdomain)
5. [Environment Variables Setup](#-environment-variables-setup)
6. [Deployment Steps](#-deployment-steps)
7. [Tenant Creation Flow](#-tenant-creation-flow)
8. [Monitoring & Costs](#-monitoring--costs)
9. [Troubleshooting](#-troubleshooting)

---

## 🏗️ Kiến Trúc Railway Multi-Tenant

### Railway Project Structure

```
┌─────────────────────────────────────────────────────────────┐
│                  RAILWAY PROJECT                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐    ┌────────────────────────────────┐ │
│  │   MAIN DATABASE  │    │      API SERVER                 │ │
│  │   (PostgreSQL)   │◄───│  (Subdomain Detection)          │ │
│  │                  │    │  - Tenant Registry              │ │
│  │  - tenants       │    │  - Dynamic DB Connection         │ │
│  │  - users         │    │                                  │ │
│  │  - plans         │    └────────────────────────────────┘ │
│  └──────────────────┘              │                        │
│                                    │                        │
│                          ┌─────────┴──────────┐             │
│                          │                    │             │
│              ┌───────────▼──────┐  ┌──────────▼───────────┐ │
│              │  TENANT DB #1    │  │   TENANT DB #2       │ │
│              │  abc_shop_db      │  │   xyz_shop_db        │ │
│              │                   │  │                      │ │
│              │  - orders         │  │  - orders            │ │
│              │  - products      │  │  - products          │ │
│              │  - customers     │  │  - customers         │ │
│              └───────────────────┘  └──────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Flow Hoạt Động:

```
1. User truy cập: abc.anyrent.shop
   ↓
2. Railway Route → API Server
   ↓
3. Next.js Middleware detect subdomain: "abc"
   ↓
4. Query Main DB để lấy tenant config
   ↓
5. Get connection string cho abc_shop_db
   ↓
6. Connect tới tenant database
   ↓
7. Serve data từ tenant DB
```

---

## 📊 Setup Main Database (Tenant Registry)

### Bước 1: Tạo Main Database trên Railway

```bash
# Install Railway CLI (nếu chưa có)
npm install -g @railway/cli

# Login Railway
railway login

# Link project
railway link

# Thêm PostgreSQL cho Main Database
railway add postgresql --name main-db
```

### Bước 2: Tạo Prisma Schema cho Main Database

Tạo schema riêng cho Main Database (Tenant Registry):

```prisma
// prisma/main-schema.prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
  output       = "../packages/database/src/generated/main-client"
}

datasource db {
  provider = "postgresql"
  url      = env("MAIN_DATABASE_URL")
}

// Tenant Registry - Quản lý danh sách tenants
model Tenant {
  id          String   @id @default(cuid())
  subdomain   String   @unique  // "abc", "xyz"
  name        String   // Shop name
  merchantId  Int      @unique  // Link với Merchant hiện tại
  databaseUrl String   // Connection string tới tenant DB
  status      String   @default("active") // active, suspended, deleted
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@index([subdomain])
  @@index([merchantId])
  @@index([status])
}

// System-wide users (authentication)
model User {
  id                     Int                    @id @default(autoincrement())
  email                  String                 @unique
  password               String
  firstName              String
  lastName               String
  phone                  String?
  role                   String                 @default("OUTLET_STAFF")
  isActive               Boolean                @default(true)
  emailVerified          Boolean                @default(false)
  createdAt              DateTime               @default(now())
  updatedAt              DateTime               @updatedAt
  merchantId             Int?
  outletId               Int?
  
  @@index([email])
  @@index([merchantId])
}

// Subscription plans (shared)
model Plan {
  id            Int       @id @default(autoincrement())
  name          String    @unique
  description   String
  basePrice     Float
  currency      String    @default("USD")
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### Bước 3: Setup Environment Variables

```bash
# Set MAIN_DATABASE_URL cho Main Database
railway variables --set MAIN_DATABASE_URL='${{Postgres.DATABASE_URL}}' --service apis

# Lưu ý: Postgres ở đây là service name của Main Database
# Nếu tên service khác, thay bằng tên đó
```

### Bước 4: Push Schema & Seed Data

```bash
# Push schema lên Main Database
railway run --service apis npx prisma db push --schema=prisma/main-schema.prisma --accept-data-loss

# Generate Prisma client cho Main DB
railway run --service apis npx prisma generate --schema=prisma/main-schema.prisma
```

---

## 🔄 Tạo Tenant Database Động

### Option 1: Shared PostgreSQL với Nhiều Databases (Khuyến nghị)

**Ưu điểm:**
- ✅ Chi phí thấp (1 PostgreSQL instance)
- ✅ Dễ quản lý
- ✅ Railway hỗ trợ tốt

**Nhược điểm:**
- ⚠️ Shared resources (nhưng vẫn isolated data)

#### Implementation:

```typescript
// packages/database/src/tenant-db-manager.ts
import { PrismaClient as MainPrismaClient } from '@prisma/client/main-client';
import { PrismaClient as TenantPrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

// Main database client (for tenant registry)
let mainDb: MainPrismaClient | null = null;

export function getMainDb(): MainPrismaClient {
  if (!mainDb) {
    mainDb = new MainPrismaClient({
      datasources: {
        db: {
          url: process.env.MAIN_DATABASE_URL!
        }
      }
    });
  }
  return mainDb;
}

// Tenant database clients cache
const tenantClients = new Map<string, TenantPrismaClient>();

export function getTenantDb(subdomain: string): TenantPrismaClient {
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
  
  // Create Prisma client với tenant database URL
  const client = new TenantPrismaClient({
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

// Create tenant database on Railway
export async function createTenantDatabase(subdomain: string, merchantId: number): Promise<string> {
  const dbName = `${subdomain}_shop_db`;
  const mainDbUrl = process.env.MAIN_DATABASE_URL!;
  
  // Parse main database URL
  const mainUrl = new URL(mainDbUrl);
  const host = mainUrl.hostname;
  const port = mainUrl.port || '5432';
  const username = mainUrl.username;
  const password = mainUrl.password;
  const mainDbName = mainUrl.pathname.slice(1); // Remove leading /
  
  // Tạo database mới trên cùng PostgreSQL instance
  // Railway PostgreSQL instance cho phép tạo nhiều databases
  const createDbUrl = `postgresql://${username}:${password}@${host}:${port}/${mainDbName}`;
  
  // Create database via psql
  try {
    // Sử dụng Railway CLI để chạy psql command
    execSync(
      `psql "${createDbUrl}" -c "CREATE DATABASE ${dbName};"`,
      { stdio: 'inherit' }
    );
    
    // Tạo database URL cho tenant
    const tenantDbUrl = `postgresql://${username}:${password}@${host}:${port}/${dbName}`;
    
    // Run migrations trên tenant database
    await migrateTenantDatabase(tenantDbUrl);
    
    return tenantDbUrl;
  } catch (error) {
    // Database might already exist
    if (error.message.includes('already exists')) {
      const tenantDbUrl = `postgresql://${username}:${password}@${host}:${port}/${dbName}`;
      return tenantDbUrl;
    }
    throw error;
  }
}

// Migrate tenant database
async function migrateTenantDatabase(databaseUrl: string) {
  // Set DATABASE_URL temporarily
  const originalUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = databaseUrl;
  
  try {
    // Push schema (sử dụng schema.prisma chính cho tenant DBs)
    execSync('npx prisma db push --accept-data-loss', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl
      }
    });
    
    // Generate Prisma client
    execSync('npx prisma generate', {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl
      }
    });
  } finally {
    // Restore original DATABASE_URL
    if (originalUrl) {
      process.env.DATABASE_URL = originalUrl;
    }
  }
}

// Cleanup unused connections
export function cleanupTenantConnections() {
  tenantClients.forEach((client, subdomain) => {
    // Disconnect clients không dùng trong 5 phút
    setTimeout(() => {
      client.$disconnect();
      tenantClients.delete(subdomain);
    }, 5 * 60 * 1000);
  });
}
```

### Option 2: Railway API để Tạo PostgreSQL Services (Advanced)

Nếu muốn mỗi tenant có PostgreSQL service riêng (better isolation nhưng cost cao):

```typescript
// packages/database/src/railway-api-client.ts
import axios from 'axios';

interface RailwayProject {
  id: string;
  name: string;
}

interface RailwayService {
  id: string;
  name: string;
  serviceDetails?: {
    image?: string;
    variables?: Record<string, string>;
  };
}

export class RailwayApiClient {
  private apiKey: string;
  private baseUrl = 'https://api.railway.app/v1';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  private async request<T>(method: string, path: string, data?: any): Promise<T> {
    const response = await axios({
      method,
      url: `${this.baseUrl}${path}`,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      data
    });
    return response.data;
  }
  
  // Get project ID
  async getProject(projectName: string): Promise<RailwayProject> {
    const projects = await this.request<RailwayProject[]>('GET', '/projects');
    return projects.find(p => p.name === projectName)!;
  }
  
  // Create PostgreSQL service for tenant
  async createPostgresService(projectId: string, tenantName: string): Promise<RailwayService> {
    return await this.request<RailwayService>('POST', `/projects/${projectId}/services`, {
      name: `postgres-${tenantName}`,
      source: {
        image: 'postgres:15'
      }
    });
  }
  
  // Get DATABASE_URL from service
  async getDatabaseUrl(serviceId: string): Promise<string> {
    const service = await this.request<RailwayService>('GET', `/services/${serviceId}`);
    // Railway tự động tạo DATABASE_URL variable
    return service.serviceDetails?.variables?.DATABASE_URL || '';
  }
}
```

**Sử dụng Railway API:**

```typescript
// Khi tạo tenant mới
export async function createTenantWithRailwayApi(
  subdomain: string,
  merchantId: number
): Promise<string> {
  const apiKey = process.env.RAILWAY_API_TOKEN!;
  const projectName = process.env.RAILWAY_PROJECT_NAME!;
  
  const client = new RailwayApiClient(apiKey);
  
  // Get project
  const project = await client.getProject(projectName);
  
  // Create PostgreSQL service
  const service = await client.createPostgresService(project.id, subdomain);
  
  // Wait for service to be ready (30-60 seconds)
  await new Promise(resolve => setTimeout(resolve, 60000));
  
  // Get DATABASE_URL
  const databaseUrl = await client.getDatabaseUrl(service.id);
  
  // Run migrations
  await migrateTenantDatabase(databaseUrl);
  
  // Save to main database
  await getMainDb().tenant.create({
    data: {
      subdomain,
      merchantId,
      databaseUrl,
      status: 'active'
    }
  });
  
  return databaseUrl;
}
```

---

## 🌐 DNS Configuration (Wildcard Subdomain)

### Bước 1: Setup DNS trên Domain Provider

**Ví dụ với Cloudflare:**

1. **Tạo Wildcard A Record:**
   ```
   Type: A
   Name: *
   Content: [Railway IP Address]
   Proxy: Enabled (Proxied)
   ```

2. **Hoặc CNAME Record:**
   ```
   Type: CNAME
   Name: *
   Target: [your-app].up.railway.app
   Proxy: Enabled (Proxied)
   ```

**Ví dụ với Namecheap/GoDaddy:**

1. **A Record:**
   ```
   Host: *
   Type: A
   Value: [Railway IP]
   TTL: Automatic
   ```

2. **CNAME Record (Khuyến nghị):**
   ```
   Host: *
   Type: CNAME
   Value: [your-app].up.railway.app
   TTL: Automatic
   ```

### Bước 2: Setup Custom Domain trên Railway

```bash
# Railway tự động nhận wildcard domain
# Chỉ cần setup root domain

# Via Railway Dashboard:
# Settings → Domains → Add Domain
# Domain: anyrent.shop

# Railway sẽ tự động:
# - Verify domain ownership
# - Provision SSL certificate (Let's Encrypt)
# - Route all subdomains (*.anyrent.shop)
```

### Bước 3: Verify DNS Configuration

```bash
# Test DNS resolution
dig abc.anyrent.shop
dig xyz.anyrent.shop

# Both should resolve to Railway IP
```

---

## 🔧 Environment Variables Setup

### Main Database Variables

```bash
# API Service - Main Database
railway variables --set MAIN_DATABASE_URL='${{Postgres.DATABASE_URL}}' --service apis

# Railway API Token (nếu dùng Option 2)
railway variables --set RAILWAY_API_TOKEN='your-railway-api-token' --service apis
railway variables --set RAILWAY_PROJECT_NAME='your-project-name' --service apis
```

### Base URL Configuration

```bash
# Root domain
railway variables --set ROOT_DOMAIN='anyrent.shop' --service apis

# API base URL
railway variables --set API_URL='https://api.anyrent.shop' --service apis

# CORS origins (wildcard subdomains)
railway variables --set CORS_ORIGINS='https://*.anyrent.shop,https://anyrent.shop' --service apis
```

---

## 🚀 Deployment Steps

### Step 1: Setup Main Database

```bash
# Push main schema
railway run --service apis npx prisma db push \
  --schema=prisma/main-schema.prisma \
  --accept-data-loss

# Generate main client
railway run --service apis npx prisma generate \
  --schema=prisma/main-schema.prisma
```

### Step 2: Seed Main Database

```bash
# Seed tenant registry (nếu có)
railway run --service apis node scripts/seed-main-db.js
```

### Step 3: Deploy API Service

```bash
# Push code (Railway auto-deploys)
git push

# Hoặc deploy trực tiếp
railway up --service apis

# Monitor logs
railway logs --service apis -f
```

### Step 4: Test Subdomain Routing

```bash
# Test tenant lookup
curl https://api.anyrent.shop/api/tenants/abc

# Test với subdomain
curl https://abc.anyrent.shop/api/health
```

---

## 🏪 Tenant Creation Flow

### API Endpoint để Tạo Tenant

```typescript
// apps/api/app/api/tenants/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuthRoles } from '@rentalshop/auth';
import { createTenantDatabase, getMainDb } from '@rentalshop/database';
import { generateSubdomain } from '@rentalshop/utils';

export const POST = withAuthRoles(['ADMIN', 'MERCHANT'])(
  async (request, { user }) => {
    try {
      const body = await request.json();
      const { merchantId, shopName } = body;
      
      // Generate subdomain
      const subdomain = generateSubdomain(shopName);
      
      // Check if subdomain already exists
      const mainDb = getMainDb();
      const existing = await mainDb.tenant.findUnique({
        where: { subdomain }
      });
      
      if (existing) {
        return NextResponse.json(
          { error: 'Subdomain already exists', subdomain },
          { status: 400 }
        );
      }
      
      // Create tenant database
      const databaseUrl = await createTenantDatabase(subdomain, merchantId);
      
      // Save tenant to main database
      const tenant = await mainDb.tenant.create({
        data: {
          subdomain,
          name: shopName,
          merchantId,
          databaseUrl,
          status: 'active'
        }
      });
      
      return NextResponse.json({
        success: true,
        tenant: {
          id: tenant.id,
          subdomain: tenant.subdomain,
          name: tenant.name,
          status: tenant.status,
          url: `https://${tenant.subdomain}.anyrent.shop`
        }
      }, { status: 201 });
      
    } catch (error) {
      console.error('Error creating tenant:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
  }
);
```

### Utility Functions

```typescript
// packages/utils/src/tenant-utils.ts
export function generateSubdomain(shopName: string): string {
  return shopName
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')  // Replace special chars
    .replace(/-+/g, '-')           // Remove duplicate dashes
    .replace(/^-|-$/g, '')         // Remove leading/trailing dashes
    .substring(0, 50);             // Limit length
}

export function validateSubdomain(subdomain: string): boolean {
  // Reserved subdomains
  const reserved = [
    'www', 'api', 'admin', 'app', 'mail', 'ftp',
    'localhost', 'staging', 'dev', 'test', 'demo'
  ];
  
  if (reserved.includes(subdomain)) {
    return false;
  }
  
  // Validate format: only lowercase letters, numbers, hyphens
  const pattern = /^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$/;
  return pattern.test(subdomain);
}
```

---

## 📊 Monitoring & Costs

### Cost Estimation

**Option 1: Shared PostgreSQL (Khuyến nghị)**
```
Main Database:        $5/month (PostgreSQL Hobby)
API Service:         $5/month
Tenant Databases:    $0 (same PostgreSQL instance)
────────────────────────────────────
Total:               ~$10/month
```

**Option 2: Separate PostgreSQL per Tenant**
```
Main Database:       $5/month
API Service:         $5/month
Per Tenant DB:       $5/month × N tenants
────────────────────────────────────
10 tenants:          ~$60/month
100 tenants:         ~$510/month
```

### Monitoring Queries

```sql
-- Count tenants
SELECT COUNT(*) FROM "Tenant" WHERE status = 'active';

-- List all tenant databases
SELECT subdomain, name, status, "createdAt" 
FROM "Tenant" 
ORDER BY "createdAt" DESC;

-- Check tenant database sizes (nếu dùng shared PostgreSQL)
SELECT 
  datname AS database_name,
  pg_size_pretty(pg_database_size(datname)) AS size
FROM pg_database
WHERE datname LIKE '%_shop_db'
ORDER BY pg_database_size(datname) DESC;
```

### Railway Metrics

```bash
# View service metrics
railway metrics --service apis

# Check database usage
railway logs --service apis | grep "database"
```

---

## 🔍 Troubleshooting

### Issue: Subdomain không resolve

**Error:** `DNS_PROBE_FINISHED_NXDOMAIN`

**Solution:**
```bash
# 1. Kiểm tra DNS records
dig abc.anyrent.shop

# 2. Verify Railway domain setup
railway domain list

# 3. Check DNS propagation
# Có thể mất 24-48 giờ để propagate
```

### Issue: Tenant database không tạo được

**Error:** `Database creation failed`

**Solution:**
```bash
# 1. Check PostgreSQL permissions
railway run --service apis psql $MAIN_DATABASE_URL -c "\l"

# 2. Verify MAIN_DATABASE_URL
railway variables --service apis | grep MAIN_DATABASE_URL

# 3. Check logs
railway logs --service apis | grep "createTenantDatabase"
```

### Issue: Connection pooling exhausted

**Error:** `too many connections`

**Solution:**
```typescript
// Implement connection pooling limits
const client = new PrismaClient({
  datasources: {
    db: { url: tenant.databaseUrl }
  },
  log: ['error', 'warn'],
});

// Limit concurrent connections
// Railway PostgreSQL: ~100 connections max
```

### Issue: Middleware không detect subdomain

**Error:** `x-tenant-subdomain header missing`

**Solution:**
```typescript
// Verify middleware chạy trước routes
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

// Debug subdomain extraction
console.log('Hostname:', request.headers.get('host'));
console.log('Subdomain:', extractSubdomain(hostname));
```

---

## ✅ Deployment Checklist

### Pre-deployment:
- [ ] Railway account created
- [ ] Main Database created và schema pushed
- [ ] DNS wildcard record configured
- [ ] Railway custom domain setup
- [ ] Environment variables set
- [ ] Railway API token generated (nếu dùng Option 2)

### Deployment:
- [ ] Main database seeded với tenant registry
- [ ] API service deployed
- [ ] Subdomain routing middleware tested
- [ ] Tenant creation endpoint tested
- [ ] SSL certificates provisioned

### Post-deployment:
- [ ] Test tenant creation flow
- [ ] Verify subdomain routing
- [ ] Test database isolation
- [ ] Monitor costs và usage
- [ ] Setup backup strategy

---

## 📚 Additional Resources

- **Railway Docs**: https://docs.railway.app
- **Railway PostgreSQL**: https://docs.railway.app/databases/postgresql
- **Wildcard DNS**: https://www.cloudflare.com/learning/dns/glossary/wildcard-dns-record/
- **Prisma Multi-Database**: https://www.prisma.io/docs/guides/database/multi-database

---

## 🎉 Done!

Multi-tenant system đã sẵn sàng trên Railway! 🚀

**Next Steps:**
1. Test tenant creation
2. Monitor database usage
3. Setup automated backups
4. Scale theo nhu cầu

**Your URLs:**
- Main: `https://anyrent.shop`
- API: `https://api.anyrent.shop`
- Tenant Example: `https://abc.anyrent.shop`

---

*Last Updated: January 2025*


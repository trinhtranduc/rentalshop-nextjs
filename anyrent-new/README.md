# AnyRent Multi-Tenant Demo POC

A production-ready multi-tenant demo application that proves the pattern works with separate databases per tenant and subdomain-based routing.

## Architecture

### Database Strategy

- **Main Database (Raw SQL)**: Stores tenant metadata (subdomain, merchant info, database URLs)
  - Uses `pg` Client for queries
  - NO Prisma client generation (avoids conflicts)
  
- **Tenant Databases (Prisma)**: Each tenant gets an isolated PostgreSQL database
  - Full Prisma client with type safety
  - Same schema, isolated data
  - Dynamic connections per tenant

### Key Features

✅ **Registration Flow**: Create tenant → Create isolated database → Redirect to subdomain
✅ **Subdomain Routing**: `abc.localhost:3000` routes to tenant ABC's data
✅ **Database Isolation**: Each tenant has separate database, complete data isolation
✅ **No Prisma Conflicts**: Main DB uses Raw SQL, only Tenant DB uses Prisma

## Project Structure

```
anyrent-new/
├── apps/
│   ├── api/          # Backend API (port 3002)
│   ├── admin/        # Admin dashboard (port 3000)
│   └── client/       # Client app for tenants (port 3001)
├── packages/
│   └── demo-shared/  # Shared utilities (Main DB, Tenant DB, subdomain utils)
└── prisma/
    ├── main/         # Main DB schema (documentation only, NO generator)
    └── schema.prisma # Tenant DB schema (ONLY Prisma generation)
```

## Setup Instructions

### Prerequisites

- Node.js 18+
- PostgreSQL database (for Main DB)
- Yarn package manager

### 1. Install Dependencies

```bash
cd anyrent-new
yarn install
```

### 2. Environment Variables

Create `.env.local` in the root:

```bash
# Main Database (PostgreSQL)
MAIN_DATABASE_URL=postgresql://user:password@localhost:5432/main_db

# Tenant Database Template (will be overridden per tenant)
DATABASE_URL=postgresql://user:password@localhost:5432/template_db

# Domain Configuration
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000
NODE_ENV=development
```

### 3. Setup Main Database

Create the Main database and tables:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create Main database
CREATE DATABASE main_db;

# Exit psql and run schema creation
# Note: Since Main DB uses Raw SQL, we'll create tables manually or via migration script
```

Create Main DB tables manually or use a migration script:

```sql
-- Run this in your Main DB
CREATE TABLE "Merchant" (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  phone VARCHAR,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "Tenant" (
  id VARCHAR PRIMARY KEY,
  subdomain VARCHAR UNIQUE NOT NULL,
  name VARCHAR NOT NULL,
  "merchantId" INTEGER UNIQUE NOT NULL REFERENCES "Merchant"(id),
  "databaseUrl" VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'active',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tenant_subdomain ON "Tenant"(subdomain);
CREATE INDEX idx_tenant_status ON "Tenant"(status);
```

### 4. Generate Prisma Client (Tenant DB only)

```bash
cd anyrent-new
yarn db:generate
```

This generates Prisma client ONLY for Tenant DB schema (no conflicts!).

### 5. Start Development Servers

```bash
# Terminal 1: API Server
cd apps/api
yarn dev

# Terminal 2: Admin App
cd apps/admin
yarn dev

# Terminal 3: Client App  
cd apps/client
yarn dev
```

## Usage

### 1. Create a Tenant

1. Open http://localhost:3000 (Admin app)
2. Fill in the registration form:
   - Business Name: "My Shop"
   - Email: "shop@example.com"
   - Phone: (optional)
   - Subdomain: (optional, auto-generated if empty)
3. Click "Create Shop"
4. Wait for database creation (may take 10-20 seconds)
5. You'll be redirected to your tenant subdomain

### 2. Access Tenant Dashboard

After registration, you'll be redirected to:
- `http://myshop.localhost:3000` (if subdomain was "myshop")

**Note**: For localhost subdomains to work, you need to:
- Add entries to `/etc/hosts` (Mac/Linux) or `C:\Windows\System32\drivers\etc\hosts` (Windows):

```
127.0.0.1 myshop.localhost
127.0.0.1 shop2.localhost
```

Or use a tool like `local-ssl-proxy` for easier subdomain routing.

### 3. View All Tenants

Visit http://localhost:3000/tenants to see all created tenants.

## Testing the Pattern

### Test 1: Create Two Tenants

1. Create tenant "shop1" → Database: `shop1_db`
2. Create tenant "shop2" → Database: `shop2_db`
3. Verify they are isolated

### Test 2: Data Isolation

1. Access `shop1.localhost:3000`
2. Products shown are from `shop1_db` only
3. Access `shop2.localhost:3000`
4. Products shown are from `shop2_db` only
5. Data is completely isolated

### Test 3: Subdomain Validation

- ✅ Valid: `shop1`, `my-shop`, `shop123`
- ❌ Invalid: `www`, `api`, `admin` (reserved)
- ❌ Invalid: Special characters, too long

## API Endpoints

### Registration
```
POST /api/auth/register
Body: { businessName, email, phone?, subdomain? }
Response: { success, tenant, url }
```

### Get Tenant Info
```
GET /api/tenant/info
Headers: x-tenant-subdomain: {subdomain}
Response: { tenant }
```

### Products (Tenant-scoped)
```
GET /api/products
Headers: x-tenant-subdomain: {subdomain}
Response: { products }

POST /api/products
Headers: x-tenant-subdomain: {subdomain}
Body: { name, description?, price, stock? }
Response: { product }
```

## Railway Deployment

### Environment Variables

```bash
MAIN_DATABASE_URL=postgresql://... (Railway PostgreSQL service)
DATABASE_URL=postgresql://... (Template, will be overridden)
NEXT_PUBLIC_ROOT_DOMAIN=anyrent.shop
NODE_ENV=production
```

### Setup Steps

1. Create PostgreSQL service on Railway
2. Set `MAIN_DATABASE_URL` environment variable
3. Create Main DB tables (run SQL above)
4. Deploy API, Admin, and Client apps
5. Configure DNS:
   - Root domain: `anyrent.shop` → Admin app
   - Wildcard: `*.anyrent.shop` → Client app

## Key Technical Decisions

### Why Raw SQL for Main DB?

- ✅ Avoids Prisma client generation conflicts
- ✅ Simple queries (just tenant lookup)
- ✅ No migration complexity
- ✅ 100% avoids Prisma initialization errors

### Why Prisma for Tenant DB?

- ✅ Full type safety
- ✅ Migrations support
- ✅ Relations, aggregations, transactions
- ✅ Better developer experience
- ✅ Production-ready ORM

### Why Separate Database per Tenant?

- ✅ True isolation (security + performance)
- ✅ Can scale individual tenants
- ✅ Easy backup/restore per tenant
- ✅ Railway compatible

## Troubleshooting

### Prisma Generation Errors

**Problem**: Multiple Prisma clients conflict

**Solution**: 
- Ensure `prisma/main/schema.prisma` has NO generator block
- Only `prisma/schema.prisma` should have generator
- Run `yarn db:generate` from root

### Database Connection Errors

**Problem**: Cannot connect to Main DB

**Solution**:
- Check `MAIN_DATABASE_URL` is correct
- Ensure PostgreSQL is running
- Verify Main DB tables are created

### Subdomain Not Working

**Problem**: `myshop.localhost:3000` doesn't work

**Solution**:
- Add to `/etc/hosts`: `127.0.0.1 myshop.localhost`
- Or use proxy tool like `local-ssl-proxy`
- Check middleware is detecting subdomain correctly

### Tenant Database Creation Fails

**Problem**: `createTenantDatabase` errors

**Solution**:
- Check PostgreSQL user has CREATE DATABASE permission
- Verify `MAIN_DATABASE_URL` is correct
- Check disk space on database server

## Next Steps

After POC proves the pattern works:

1. Add authentication (JWT tokens)
2. Add more features (orders, customers, payments)
3. Add subscription/billing management
4. Add monitoring and logging
5. Scale to production on Railway

## License

MIT

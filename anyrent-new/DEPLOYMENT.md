# Railway Deployment Guide

## Overview

This guide covers deploying the Multi-Tenant Demo to Railway, a platform that simplifies PostgreSQL database management and app deployment.

## Prerequisites

- Railway account (free tier works)
- GitHub repository with code
- Domain name (optional, can use Railway subdomain)

## Architecture on Railway

```
Railway Services:
├── Main DB (PostgreSQL)     → Stores tenant metadata
├── API Service              → Backend API (port 3002)
├── Admin Service            → Admin dashboard (port 3000)
└── Client Service           → Tenant client app (port 3001)
```

## Step 1: Setup Main Database

### Create PostgreSQL Service

1. **Create New Project** in Railway
2. **Add PostgreSQL Service**:
   - Click "+ New"
   - Select "PostgreSQL"
   - Railway will create a PostgreSQL instance
3. **Copy Connection String**:
   - Click on PostgreSQL service
   - Go to "Variables" tab
   - Copy `DATABASE_URL` (this is your `MAIN_DATABASE_URL`)

### Initialize Main Database Tables

1. **Connect to Railway PostgreSQL**:
   ```bash
   # Use Railway CLI or connection string
   psql $DATABASE_URL
   ```

2. **Create Tables** (or use setup script):
   ```sql
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
   CREATE INDEX idx_merchant_email ON "Merchant"(email);
   ```

## Step 2: Deploy API Service

### Create API Service

1. **Add Service** → "GitHub Repo"
2. **Select Repository**: Connect your `anyrent-new` repo
3. **Root Directory**: Set to `apps/api`
4. **Build Command**: `cd ../.. && yarn install && yarn db:generate && cd apps/api && yarn build`
5. **Start Command**: `yarn start`

### Environment Variables

Add these variables in Railway dashboard:

```bash
# Main Database (from PostgreSQL service)
MAIN_DATABASE_URL=${{PostgreSQL.DATABASE_URL}}

# Tenant Database Template (for migrations)
DATABASE_URL=${{PostgreSQL.DATABASE_URL}}

# Domain Configuration
NEXT_PUBLIC_ROOT_DOMAIN=yourdomain.com
NODE_ENV=production

# Railway automatically provides:
# - PORT (automatically set)
# - RAILWAY_ENVIRONMENT
```

### Configure Port

Railway automatically sets `PORT` environment variable. Update your API to use it:

```typescript
// apps/api/next.config.js
module.exports = {
  // Railway sets PORT automatically
  // Next.js API routes work on any port
};
```

## Step 3: Deploy Admin Service

1. **Add Service** → "GitHub Repo" (same repo)
2. **Root Directory**: `apps/admin`
3. **Build Command**: `cd ../.. && yarn install && cd apps/admin && yarn build`
4. **Start Command**: `yarn start`

### Environment Variables

```bash
NEXT_PUBLIC_ROOT_DOMAIN=yourdomain.com
NODE_ENV=production
```

### Custom Domain (Optional)

1. Click on Admin service
2. Go to "Settings" → "Domains"
3. Add custom domain: `yourdomain.com` (root domain)

## Step 4: Deploy Client Service

1. **Add Service** → "GitHub Repo" (same repo)
2. **Root Directory**: `apps/client`
3. **Build Command**: `cd ../.. && yarn install && cd apps/client && yarn build`
4. **Start Command**: `yarn start`

### Environment Variables

```bash
NEXT_PUBLIC_ROOT_DOMAIN=yourdomain.com
NODE_ENV=production
```

### Wildcard Domain Configuration

1. **Get Railway Domain**: Railway provides `*.up.railway.app`
2. **Or Configure Custom Domain**:
   - In DNS provider, add wildcard CNAME:
   - `*.yourdomain.com` → Railway service domain
   - This routes all subdomains to client service

## Step 5: DNS Configuration

### Option A: Railway Subdomain (Easy)

- Railway provides: `yourproject.up.railway.app`
- No DNS configuration needed
- Test with: `shop1.yourproject.up.railway.app`

### Option B: Custom Domain (Production)

**For Root Domain (Admin App)**:
```
Type: A or CNAME
Name: @
Value: Railway IP or domain
```

**For Wildcard Subdomain (Client App)**:
```
Type: CNAME
Name: *
Value: yourproject.up.railway.app
```

**DNS Example (Cloudflare/Route53)**:
- `yourdomain.com` → Admin service
- `*.yourdomain.com` → Client service
- `api.yourdomain.com` → API service (optional)

## Step 6: Update Code for Railway

### Update Middleware for Production

```typescript
// apps/client/middleware.ts
export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'yourdomain.com';
  
  // Extract subdomain (works for Railway and custom domains)
  const subdomain = hostname.split('.')[0];
  
  // ... rest of middleware
}
```

### Update Database Creation for Railway

Railway PostgreSQL allows creating databases, but check permissions:

```typescript
// packages/demo-shared/src/tenant-db.ts
export async function createTenantDatabase(subdomain: string) {
  // For Railway, you might need to create databases via API
  // Or use separate PostgreSQL services per tenant
  // Or use schema-based isolation (less ideal)
  
  // Option 1: Create separate Railway PostgreSQL per tenant (recommended)
  // Option 2: Use schema isolation in single database
  // Option 3: Use Railway API to create databases
}
```

**Recommended**: For Railway, consider:
- Creating new PostgreSQL services per tenant via Railway API
- Or using schema-based isolation (simpler but less isolated)

## Step 7: Environment Variables Summary

### Main Database Service
```
DATABASE_URL (auto-provided by Railway)
```

### API Service
```
MAIN_DATABASE_URL=${{PostgreSQL.DATABASE_URL}}
DATABASE_URL=${{PostgreSQL.DATABASE_URL}}
NEXT_PUBLIC_ROOT_DOMAIN=yourdomain.com
NODE_ENV=production
```

### Admin Service
```
NEXT_PUBLIC_ROOT_DOMAIN=yourdomain.com
NODE_ENV=production
```

### Client Service
```
NEXT_PUBLIC_ROOT_DOMAIN=yourdomain.com
NODE_ENV=production
```

## Step 8: Build Configuration

### Railway Build Commands

Railway automatically detects and builds, but you can customize:

**For each service**, Railway will:
1. Install dependencies: `yarn install` (from monorepo root)
2. Generate Prisma: `yarn db:generate`
3. Build service: `yarn build` (in service directory)
4. Start service: `yarn start`

### Optimize Build

Create `railway.json` in root:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "yarn install && yarn db:generate"
  }
}
```

## Step 9: Testing Deployment

### 1. Verify Main Database

```bash
# Connect to Railway PostgreSQL
psql $MAIN_DATABASE_URL

# Check tables
\dt

# Should see: Merchant, Tenant
```

### 2. Test Registration

1. Visit admin URL: `https://yourdomain.com`
2. Create a tenant
3. Check Railway logs for database creation
4. Verify tenant database created

### 3. Test Subdomain Access

1. Visit tenant subdomain: `https://shop1.yourdomain.com`
2. Should load tenant dashboard
3. Verify data isolation

### 4. Test API Endpoints

```bash
# Get tenant info
curl -H "x-tenant-subdomain: shop1" \
  https://api.yourdomain.com/api/tenant/info

# Create product
curl -X POST https://api.yourdomain.com/api/products \
  -H "Content-Type: application/json" \
  -H "x-tenant-subdomain: shop1" \
  -d '{"name":"Test","price":99.99,"stock":10}'
```

## Step 10: Monitoring & Logs

### View Logs

1. Click on any service in Railway
2. Go to "Deployments" tab
3. Click on latest deployment
4. View logs in real-time

### Monitor Performance

- Railway dashboard shows:
  - CPU usage
  - Memory usage
  - Network traffic
  - Request logs

### Set Up Alerts

1. Go to service settings
2. Configure alerts for:
   - High error rate
   - High memory usage
   - Service crashes

## Troubleshooting

### Issue: Build Fails

**Check**:
- Build logs in Railway
- Ensure `yarn install` completes
- Verify Prisma generation succeeds
- Check for TypeScript errors

**Fix**:
```bash
# Test build locally first
cd apps/api
yarn build
```

### Issue: Database Connection Fails

**Check**:
- Environment variables set correctly
- `MAIN_DATABASE_URL` uses `${{PostgreSQL.DATABASE_URL}}`
- Database service is running

**Fix**:
- Verify connection string format
- Check Railway PostgreSQL service status

### Issue: Subdomain Not Working

**Check**:
- DNS configuration
- Wildcard CNAME record
- Middleware logs

**Fix**:
- Verify DNS propagation: `dig *.yourdomain.com`
- Check Railway domain settings
- Test with Railway subdomain first

### Issue: Tenant Database Creation Fails

**Check**:
- PostgreSQL user permissions
- Railway database limits
- Logs for error messages

**Fix**:
- Consider schema-based isolation
- Or create databases via Railway API
- Or use separate PostgreSQL services

## Production Checklist

Before going live:

- [ ] All services deployed and running
- [ ] Main database tables created
- [ ] Environment variables configured
- [ ] Custom domains configured (if using)
- [ ] DNS records propagated
- [ ] SSL certificates active (automatic on Railway)
- [ ] Registration flow tested
- [ ] Data isolation verified
- [ ] API endpoints working
- [ ] Monitoring set up
- [ ] Backup strategy in place

## Cost Estimation (Railway)

**Free Tier**:
- $5 credit/month
- Enough for small demo

**Paid Tier**:
- PostgreSQL: ~$5-10/month
- API service: ~$5-10/month
- Admin service: ~$5-10/month
- Client service: ~$5-10/month

**Total**: ~$20-40/month for full setup

## Alternative: Single Service Deployment

For cost savings, deploy all apps as one service:

1. Create single Railway service
2. Use routes/paths instead of separate services
3. Update middleware to route based on path
4. All apps in one deployment

**Trade-off**: Less isolation, but simpler and cheaper

## Next Steps

After successful deployment:

1. ✅ Monitor performance
2. ✅ Set up backups
3. ✅ Configure CI/CD
4. ✅ Add monitoring/alerting
5. ✅ Scale as needed

---

**Happy Deploying!** 🚂

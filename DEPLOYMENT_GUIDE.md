# 🚀 Deployment Guide - Vercel & Multi-Environment Setup

## 📋 **Table of Contents**

1. [Environment Strategy](#environment-strategy)
2. [Vercel Setup](#vercel-setup)
3. [Database Migration](#database-migration)
4. [Environment Variables](#environment-variables)
5. [Deployment Workflow](#deployment-workflow)
6. [Troubleshooting](#troubleshooting)

---

## 🌍 **Environment Strategy**

### **Three-Tier Environment Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│                    ENVIRONMENT TIERS                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1️⃣  DEVELOPMENT (Local)                                    │
│      ├─ Database: SQLite (./prisma/dev.db)                  │
│      ├─ Apps: localhost:3000-3002                           │
│      ├─ Secrets: Weak (for development only)                │
│      └─ Purpose: Local development & testing                │
│                                                              │
│  2️⃣  PREVIEW/STAGING (Vercel Preview)                       │
│      ├─ Database: PostgreSQL (Neon/Supabase)                │
│      ├─ Apps: preview-*.vercel.app                          │
│      ├─ Secrets: Medium strength                            │
│      └─ Purpose: Testing before production                  │
│                                                              │
│  3️⃣  PRODUCTION (Vercel Production)                         │
│      ├─ Database: PostgreSQL (Production tier)              │
│      ├─ Apps: rentalshop.com                                │
│      ├─ Secrets: Strong (auto-generated)                    │
│      └─ Purpose: Live customer-facing app                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 **Vercel Setup**

### **Step 1: Prepare Repository**

Ensure your `.env` files are properly configured:

```bash
# Check current environment setup
ls -la | grep .env

# Should see:
# .env                 ✅ (Committed - development defaults)
# .env.production      ✅ (Committed - production template)
# .env.local           ❌ (Git ignored - personal overrides)
```

### **Step 2: Connect to Vercel**

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link
```

### **Step 3: Configure Projects in Vercel Dashboard**

You'll need to create **3 separate projects** in Vercel:

#### **Project 1: API Server**
```
Project Name: rentalshop-api
Root Directory: apps/api
Framework Preset: Next.js
Build Command: npm run build
Output Directory: .next
Install Command: yarn install
```

#### **Project 2: Client App**
```
Project Name: rentalshop-client
Root Directory: apps/client
Framework Preset: Next.js
Build Command: npm run build
Output Directory: .next
Install Command: yarn install
```

#### **Project 3: Admin Dashboard**
```
Project Name: rentalshop-admin
Root Directory: apps/admin
Framework Preset: Next.js
Build Command: npm run build
Output Directory: .next
Install Command: yarn install
```

---

## 🗄️ **Database Migration**

### **Development → Production Migration Path**

#### **Option A: Neon PostgreSQL (Recommended)**

**Why Neon?**
- ✅ Serverless PostgreSQL (perfect for Vercel)
- ✅ Auto-scaling
- ✅ Free tier available
- ✅ Built-in connection pooling
- ✅ Instant branching for preview environments

**Setup:**

1. **Create Neon Account**
   ```
   https://neon.tech/
   ```

2. **Create Databases**
   ```
   Production:  rentalshop-prod
   Staging:     rentalshop-staging
   ```

3. **Get Connection Strings**
   ```
   Format: postgresql://user:password@host/database?sslmode=require
   ```

#### **Option B: Supabase PostgreSQL**

**Why Supabase?**
- ✅ PostgreSQL + Auth + Storage all-in-one
- ✅ Generous free tier
- ✅ Real-time subscriptions
- ✅ Built-in REST API

**Setup:**

1. **Create Supabase Project**
   ```
   https://supabase.com/
   ```

2. **Get Connection String**
   ```
   Project Settings → Database → Connection String
   ```

#### **Option C: Vercel Postgres**

**Why Vercel Postgres?**
- ✅ Native Vercel integration
- ✅ Zero configuration
- ✅ Built-in connection pooling

**Setup:**

1. **Enable in Vercel Dashboard**
   ```
   Project → Storage → Postgres → Create
   ```

2. **Auto-populated Environment Variables**
   ```
   POSTGRES_URL
   POSTGRES_PRISMA_URL
   ```

### **Database Schema Migration**

```bash
# 1. Update DATABASE_URL to production database
export DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"

# 2. Push schema to production database
npx prisma migrate deploy

# 3. Verify migration
npx prisma migrate status

# 4. Seed production data (optional)
npx prisma db seed
```

---

## 🔐 **Environment Variables Configuration**

### **Environment Variables per Vercel Environment**

Vercel has 3 environments: **Production**, **Preview**, **Development**

#### **1. Production Environment Variables** (rentalshop.com)

Set in Vercel Dashboard → Project Settings → Environment Variables → Production

```bash
# Database (CRITICAL)
DATABASE_URL="postgresql://user:password@prod-host.neon.tech/rentalshop_prod?sslmode=require"

# JWT (CRITICAL - Generate with: openssl rand -hex 32)
JWT_SECRET="<generate-strong-secret-here>"
JWT_EXPIRES_IN="1d"

# NextAuth (CRITICAL - Generate with: openssl rand -hex 32)
NEXTAUTH_SECRET="<generate-strong-secret-here>"
NEXTAUTH_URL="https://rentalshop.com"

# API URLs (Production Domains)
CLIENT_URL="https://rentalshop.com"
ADMIN_URL="https://admin.rentalshop.com"
API_URL="https://api.rentalshop.com"

# CORS
CORS_ORIGINS="https://rentalshop.com,https://admin.rentalshop.com"

# File Upload (Cloudinary)
UPLOAD_PROVIDER="cloudinary"
CLOUDINARY_CLOUD_NAME="<your-cloudinary-name>"
CLOUDINARY_API_KEY="<your-api-key>"
CLOUDINARY_API_SECRET="<your-api-secret>"
MAX_FILE_SIZE="10485760"

# Email (Resend)
EMAIL_PROVIDER="resend"
RESEND_API_KEY="<your-resend-api-key>"
EMAIL_FROM="noreply@rentalshop.com"

# Redis (Upstash)
REDIS_URL="redis://:password@redis.upstash.io:6379"

# Logging
LOG_LEVEL="warn"
LOG_FORMAT="json"

# Feature Flags
ENABLE_EMAIL_VERIFICATION="true"
ENABLE_ANALYTICS="true"
ENABLE_DEBUG_LOGS="false"

# Rate Limiting
RATE_LIMIT_WINDOW="15m"
RATE_LIMIT_MAX="100"

# Stripe
STRIPE_PUBLISHABLE_KEY="<your-publishable-key>"
STRIPE_SECRET_KEY="<your-secret-key>"
STRIPE_WEBHOOK_SECRET="<your-webhook-secret>"

# Monitoring (Sentry)
SENTRY_DSN="<your-sentry-dsn>"
SENTRY_ENVIRONMENT="production"
```

#### **2. Preview Environment Variables** (preview-*.vercel.app)

Set in Vercel Dashboard → Environment Variables → Preview

```bash
# Database (Separate preview/staging database)
DATABASE_URL="postgresql://user:password@staging-host.neon.tech/rentalshop_staging?sslmode=require"

# JWT (Can reuse dev secrets for preview)
JWT_SECRET="preview-jwt-secret-$(openssl rand -hex 16)"
JWT_EXPIRES_IN="7d"

# NextAuth
NEXTAUTH_SECRET="preview-nextauth-secret-$(openssl rand -hex 16)"
NEXTAUTH_URL="https://preview.rentalshop.vercel.app"

# API URLs (Preview domains - auto-generated by Vercel)
CLIENT_URL="https://rentalshop-client-preview.vercel.app"
ADMIN_URL="https://rentalshop-admin-preview.vercel.app"
API_URL="https://rentalshop-api-preview.vercel.app"

# CORS (Allow all preview domains)
CORS_ORIGINS="https://*.vercel.app"

# File Upload (Use Cloudinary test account)
UPLOAD_PROVIDER="cloudinary"
CLOUDINARY_CLOUD_NAME="<test-cloudinary-name>"
CLOUDINARY_API_KEY="<test-api-key>"
CLOUDINARY_API_SECRET="<test-api-secret>"

# Email (Console or test Resend)
EMAIL_PROVIDER="console"
EMAIL_FROM="noreply@preview.rentalshop.com"

# Logging (More verbose for debugging)
LOG_LEVEL="info"
LOG_FORMAT="json"

# Feature Flags (Test features before production)
ENABLE_EMAIL_VERIFICATION="true"
ENABLE_ANALYTICS="false"
ENABLE_DEBUG_LOGS="true"

# Rate Limiting (Relaxed for testing)
RATE_LIMIT_WINDOW="15m"
RATE_LIMIT_MAX="500"
```

#### **3. Development Environment Variables** (Local + Vercel Dev)

These are inherited from `.env` file (already configured)

---

## 📦 **Vercel Project Configuration**

### **vercel.json for Each App**

#### **apps/api/vercel.json**

```json
{
  "version": 2,
  "name": "rentalshop-api",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/"
    }
  ],
  "env": {
    "DATABASE_URL": "@database-url",
    "JWT_SECRET": "@jwt-secret",
    "NEXTAUTH_SECRET": "@nextauth-secret"
  },
  "build": {
    "env": {
      "PRISMA_GENERATE_DATAPROXY": "true"
    }
  },
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 30,
      "memory": 1024
    }
  }
}
```

#### **apps/client/vercel.json**

```json
{
  "version": 2,
  "name": "rentalshop-client",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "NEXT_PUBLIC_API_URL": "@api-url",
    "NEXTAUTH_URL": "@nextauth-url"
  }
}
```

#### **apps/admin/vercel.json**

```json
{
  "version": 2,
  "name": "rentalshop-admin",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "NEXT_PUBLIC_API_URL": "@api-url",
    "NEXTAUTH_URL": "@nextauth-url"
  }
}
```

---

## 🔄 **Deployment Workflow**

### **Manual Deployment**

```bash
# Deploy API server to production
cd apps/api
vercel --prod

# Deploy Client app to production
cd apps/client
vercel --prod

# Deploy Admin dashboard to production
cd apps/admin
vercel --prod
```

### **Automatic Deployment via Git**

#### **Production Deployment (main branch)**

```bash
# 1. Make sure all changes are tested locally
yarn build

# 2. Commit changes
git add .
git commit -m "feat: ready for production deployment"

# 3. Push to main branch
git push origin main

# Vercel will automatically:
# ✅ Build all apps
# ✅ Run migrations
# ✅ Deploy to production domains
```

#### **Preview Deployment (feature branches)**

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes and commit
git add .
git commit -m "feat: add new feature"

# 3. Push to feature branch
git push origin feature/new-feature

# Vercel will automatically:
# ✅ Create preview deployment
# ✅ Generate unique preview URL
# ✅ Use preview environment variables
```

---

## 🗂️ **Multi-Project Monorepo Deployment**

### **Option A: Separate Vercel Projects (Recommended)**

**Benefits:**
- ✅ Independent deployments
- ✅ Separate domains for each app
- ✅ Better scalability
- ✅ Isolated failures

**Setup:**

1. **Create 3 Vercel Projects**:
   - `rentalshop-api` → https://api.rentalshop.com
   - `rentalshop-client` → https://rentalshop.com
   - `rentalshop-admin` → https://admin.rentalshop.com

2. **Configure Each Project**:
   ```bash
   # In each app directory
   cd apps/api && vercel
   cd apps/client && vercel
   cd apps/admin && vercel
   ```

3. **Link Projects**:
   ```bash
   # apps/api/vercel.json
   {
     "github": {
       "silent": true,
       "autoJobCancelation": true
     }
   }
   ```

### **Option B: Monorepo with Shared Variables**

**Use Vercel's Monorepo support:**

```bash
# Root vercel.json
{
  "version": 2,
  "builds": [
    { "src": "apps/api/package.json", "use": "@vercel/next" },
    { "src": "apps/client/package.json", "use": "@vercel/next" },
    { "src": "apps/admin/package.json", "use": "@vercel/next" }
  ]
}
```

---

## 🔐 **Environment Variables Setup Guide**

### **Using Vercel Dashboard**

1. **Navigate to Project Settings**
   ```
   Vercel Dashboard → Your Project → Settings → Environment Variables
   ```

2. **Add Variables by Environment**

   For each variable:
   - ✅ **Name**: `DATABASE_URL`
   - ✅ **Value**: `postgresql://...`
   - ✅ **Environments**: Select `Production`, `Preview`, or `Development`

3. **Bulk Import** (Faster method)

   Create `env.production.txt`:
   ```
   DATABASE_URL=postgresql://...
   JWT_SECRET=abc123...
   NEXTAUTH_SECRET=def456...
   ```

   Then import:
   ```bash
   vercel env add < env.production.txt
   ```

### **Using Vercel CLI**

```bash
# Add single variable
vercel env add DATABASE_URL production

# Add from file
vercel env pull .env.production.local

# List all variables
vercel env ls

# Remove variable
vercel env rm DATABASE_URL production
```

### **Using Environment Variable References**

Vercel supports referencing variables across projects:

```bash
# In API project, create shared secret
vercel env add JWT_SECRET production

# In Client project, reference it
vercel env link JWT_SECRET rentalshop-api production
```

---

## 📝 **Complete Environment Variables Checklist**

### **✅ Required for All Environments**

- [ ] `NODE_ENV` (auto-set by Vercel)
- [ ] `DATABASE_URL`
- [ ] `JWT_SECRET`
- [ ] `NEXTAUTH_SECRET`
- [ ] `NEXTAUTH_URL`
- [ ] `CLIENT_URL`
- [ ] `ADMIN_URL`
- [ ] `API_URL`

### **✅ Required for Production**

- [ ] `CORS_ORIGINS`
- [ ] `CLOUDINARY_CLOUD_NAME`
- [ ] `CLOUDINARY_API_KEY`
- [ ] `CLOUDINARY_API_SECRET`
- [ ] `RESEND_API_KEY`
- [ ] `EMAIL_FROM`

### **✅ Optional but Recommended**

- [ ] `REDIS_URL` (for caching)
- [ ] `SENTRY_DSN` (for error monitoring)
- [ ] `STRIPE_PUBLISHABLE_KEY`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`

---

## 🎯 **Step-by-Step Production Deployment**

### **Pre-Deployment Checklist**

```bash
# 1. Test build locally
yarn build

# 2. Run tests
yarn test

# 3. Check environment configuration
node -e "require('./config/env.config').printEnvironmentInfo()"

# 4. Verify database migrations
npx prisma migrate status

# 5. Commit all changes
git add .
git commit -m "feat: ready for deployment"
git push origin main
```

### **Deployment Steps**

#### **Step 1: Setup Database (One-time)**

```bash
# Option A: Neon
1. Create Neon project: https://console.neon.tech/
2. Copy connection string
3. Add to Vercel: DATABASE_URL

# Option B: Vercel Postgres
1. Vercel Dashboard → Storage → Create Postgres
2. Auto-populated to project
```

#### **Step 2: Run Migrations**

```bash
# Deploy migrations to production database
DATABASE_URL="postgresql://..." npx prisma migrate deploy

# Verify
DATABASE_URL="postgresql://..." npx prisma migrate status
```

#### **Step 3: Deploy Apps**

```bash
# Method A: Automatic (Git push)
git push origin main
# Vercel auto-deploys all linked projects

# Method B: Manual (Vercel CLI)
cd apps/api && vercel --prod
cd apps/client && vercel --prod
cd apps/admin && vercel --prod
```

#### **Step 4: Configure Custom Domains**

```
Vercel Dashboard → Project → Settings → Domains

API Project:
  ├─ api.rentalshop.com (production)
  └─ api-staging.rentalshop.com (preview)

Client Project:
  ├─ rentalshop.com (production)
  ├─ www.rentalshop.com (alias)
  └─ staging.rentalshop.com (preview)

Admin Project:
  ├─ admin.rentalshop.com (production)
  └─ admin-staging.rentalshop.com (preview)
```

#### **Step 5: Update Environment URLs**

After domains are configured, update in Vercel:

```bash
# Update API_URL, CLIENT_URL, ADMIN_URL to use custom domains
# Vercel Dashboard → Settings → Environment Variables
```

---

## 🧪 **Preview/Staging Deployments**

### **Automatic Preview Deployments**

Every PR automatically creates a preview deployment:

```bash
# 1. Create PR
git checkout -b feature/new-feature
git push origin feature/new-feature

# 2. Vercel creates preview
https://rentalshop-client-git-feature-new-feature.vercel.app

# 3. Test on preview URL
# 4. Merge PR → Auto-deploy to production
```

### **Preview Environment Setup**

```bash
# Create staging database (Neon branching)
neon branches create staging --database rentalshop-prod

# Or separate database
DATABASE_URL_STAGING="postgresql://...rentalshop_staging"

# Set in Vercel Preview environment
vercel env add DATABASE_URL preview
```

---

## 🔍 **Post-Deployment Verification**

### **Health Check Endpoints**

```bash
# API Health
curl https://api.rentalshop.com/api/health

# Client Health
curl https://rentalshop.com/api/health

# Admin Health
curl https://admin.rentalshop.com/api/health
```

### **Database Connection Test**

```bash
# Verify database connectivity
curl https://api.rentalshop.com/api/system/health

# Expected response:
{
  "status": "healthy",
  "database": "connected",
  "uptime": 1234
}
```

### **Smoke Tests**

```bash
# 1. Test user login
curl -X POST https://api.rentalshop.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rentalshop.com","password":"***"}'

# 2. Test protected endpoint
curl https://api.rentalshop.com/api/users/profile \
  -H "Authorization: Bearer <token>"

# 3. Test client rendering
curl https://rentalshop.com

# 4. Test admin access
curl https://admin.rentalshop.com
```

---

## 🚨 **Troubleshooting**

### **Common Issues & Solutions**

#### **Issue 1: Database Connection Fails**

```
Error: P1001 - Can't reach database server
```

**Solutions:**
```bash
# 1. Check DATABASE_URL format
echo $DATABASE_URL

# Should be:
postgresql://user:password@host:5432/database?sslmode=require

# 2. Verify database is accessible
npx prisma db execute --url="postgresql://..."

# 3. Check Vercel function region matches database region
# Vercel Dashboard → Settings → Functions → Region
```

#### **Issue 2: Prisma Client Not Found**

```
Error: @prisma/client did not initialize
```

**Solutions:**
```bash
# 1. Add postinstall script to package.json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}

# 2. Enable Prisma in vercel.json
{
  "build": {
    "env": {
      "PRISMA_GENERATE_SKIP_AUTOINSTALL": "false"
    }
  }
}

# 3. Use Prisma Data Proxy (for serverless)
# https://www.prisma.io/docs/data-platform/data-proxy
```

#### **Issue 3: Environment Variables Not Loaded**

```
Error: JWT_SECRET is undefined
```

**Solutions:**
```bash
# 1. Verify variables are set in correct environment
vercel env ls

# 2. Pull latest environment variables
vercel env pull .env.vercel.local

# 3. Check variable names (case-sensitive!)
# JWT_SECRET ✅
# jwt_secret ❌

# 4. Redeploy after adding variables
vercel --force
```

#### **Issue 4: CORS Errors**

```
Error: CORS policy blocked
```

**Solutions:**
```bash
# 1. Update CORS_ORIGINS in production
CORS_ORIGINS="https://rentalshop.com,https://admin.rentalshop.com"

# 2. Check middleware CORS configuration
# apps/api/middleware.ts should handle OPTIONS requests

# 3. Verify next.config.js headers
# Should include Access-Control-Allow-Origin

# 4. Redeploy API
vercel --prod --force
```

#### **Issue 5: Migration Fails on Deploy**

```
Error: Migration failed
```

**Solutions:**
```bash
# 1. Run migrations manually BEFORE deploy
DATABASE_URL="postgresql://..." npx prisma migrate deploy

# 2. Check migration history
DATABASE_URL="postgresql://..." npx prisma migrate status

# 3. Reset if needed (DANGER - only for staging!)
DATABASE_URL="postgresql://..." npx prisma migrate reset

# 4. For production, use migration scripts
npm run db:migrate:prod
```

---

## 📚 **Useful Commands**

### **Environment Management**

```bash
# View all environment variables
vercel env ls

# Add new variable
vercel env add VARIABLE_NAME production

# Pull current environment to local
vercel env pull .env.production.local

# Remove variable
vercel env rm VARIABLE_NAME production
```

### **Deployment Commands**

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Deploy with logs
vercel --prod --debug

# Force redeploy
vercel --prod --force

# Deploy specific app
cd apps/api && vercel --prod
```

### **Database Commands**

```bash
# Push schema without migration
DATABASE_URL="postgresql://..." npx prisma db push

# Deploy pending migrations
DATABASE_URL="postgresql://..." npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Open Prisma Studio (production - use with caution!)
DATABASE_URL="postgresql://..." npx prisma studio
```

---

## 🎓 **Best Practices**

### **1. Environment Variable Security**

✅ **DO:**
- Use strong, randomly generated secrets in production
- Rotate secrets regularly (every 90 days)
- Use different secrets for each environment
- Store secrets in Vercel dashboard, never in code
- Use `@` prefix for shared secrets across projects

❌ **DON'T:**
- Commit real secrets to git
- Use same secrets for dev and production
- Share production secrets via Slack/email
- Use predictable secrets like "password123"

### **2. Database Management**

✅ **DO:**
- Use separate databases for production, staging, development
- Run migrations in CI/CD before deployment
- Backup production database regularly
- Use connection pooling (Prisma Data Proxy or PgBouncer)
- Monitor database performance

❌ **DON'T:**
- Share database between environments
- Run migrations directly in production without testing
- Use SQLite in production
- Skip backups
- Ignore slow queries

### **3. Deployment Strategy**

✅ **DO:**
- Deploy to preview first, test, then production
- Use feature flags for gradual rollouts
- Monitor deployments with Sentry/Datadog
- Set up health check endpoints
- Use rollback if issues occur

❌ **DON'T:**
- Deploy directly to production without testing
- Deploy on Friday afternoon
- Skip monitoring setup
- Ignore preview deployment errors
- Deploy without team notification

### **4. Monorepo Deployment**

✅ **DO:**
- Deploy API first, then client/admin
- Use Vercel's monorepo detection
- Keep shared packages up to date
- Use turbo for faster builds
- Version packages properly

❌ **DON'T:**
- Deploy all apps simultaneously without coordination
- Use different package versions across apps
- Skip dependency installation
- Ignore build errors in one app
- Deploy without syncing package versions

---

## 📊 **Deployment Checklist**

### **Before First Production Deployment**

- [ ] Create Neon/Supabase production database
- [ ] Generate strong JWT_SECRET (`openssl rand -hex 32`)
- [ ] Generate strong NEXTAUTH_SECRET (`openssl rand -hex 32`)
- [ ] Set up Cloudinary account for file uploads
- [ ] Set up Resend account for emails
- [ ] Set up Sentry account for error monitoring
- [ ] Configure custom domains in Vercel
- [ ] Set all environment variables in Vercel
- [ ] Run database migrations to production
- [ ] Test all API endpoints
- [ ] Test authentication flow
- [ ] Verify CORS configuration
- [ ] Set up monitoring and alerts
- [ ] Configure backup strategy
- [ ] Document deployment process

### **Before Each Deployment**

- [ ] Test all changes locally
- [ ] Run `yarn build` successfully
- [ ] Run `yarn test` all pass
- [ ] Update version number
- [ ] Review changed files
- [ ] Update CHANGELOG.md
- [ ] Create PR for review
- [ ] Deploy to preview environment
- [ ] Test on preview URL
- [ ] Get team approval
- [ ] Merge to main for production
- [ ] Monitor deployment logs
- [ ] Verify deployment health
- [ ] Test critical user flows
- [ ] Monitor error rates
- [ ] Prepare rollback plan

---

## 🔧 **Advanced Configuration**

### **Environment-Specific Prisma Client**

For serverless deployments, use Prisma Data Proxy:

```bash
# 1. Enable in Prisma Cloud
https://cloud.prisma.io/

# 2. Get Data Proxy connection string
prisma://aws-us-east-1.prisma-data.com/?api_key=...

# 3. Set in Vercel
DATABASE_URL="prisma://..."

# 4. Generate Data Proxy client
npx prisma generate --data-proxy
```

### **Multi-Region Deployment**

```json
// vercel.json
{
  "regions": ["iad1", "sfo1"],
  "functions": {
    "api/**/*.ts": {
      "maxDuration": 30,
      "memory": 1024,
      "runtime": "nodejs20.x"
    }
  }
}
```

### **Caching Strategy**

```typescript
// apps/api/next.config.js
module.exports = {
  experimental: {
    isrMemoryCacheSize: 0, // Disable ISR in-memory cache for serverless
  },
  headers: async () => [
    {
      source: '/api/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, s-maxage=60, stale-while-revalidate=300',
        },
      ],
    },
  ],
};
```

---

## 📈 **Monitoring & Analytics**

### **Vercel Analytics**

```bash
# Enable in Vercel Dashboard
Project → Analytics → Enable

# Or via package
npm install @vercel/analytics
```

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### **Sentry Error Monitoring**

```bash
# Install Sentry
npm install @sentry/nextjs

# Initialize
npx @sentry/wizard -i nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

---

## 🔄 **Rollback Strategy**

### **Quick Rollback**

```bash
# Method 1: Vercel Dashboard
# Deployments → Previous Deployment → Promote to Production

# Method 2: Vercel CLI
vercel rollback <deployment-url>

# Method 3: Git Revert
git revert HEAD
git push origin main
```

### **Database Rollback**

```bash
# 1. Find migration to rollback to
npx prisma migrate status

# 2. Rollback migration (DANGER!)
DATABASE_URL="postgresql://..." npx prisma migrate resolve --rolled-back <migration-name>

# 3. Restore from backup (SAFER)
# Use your database provider's backup restore feature
```

---

## 📞 **Support & Resources**

### **Documentation**

- Vercel Monorepo: https://vercel.com/docs/monorepos
- Prisma Production: https://www.prisma.io/docs/guides/deployment
- Next.js Environment: https://nextjs.org/docs/basic-features/environment-variables
- Neon Postgres: https://neon.tech/docs/introduction

### **Team Communication**

```
Deployment Notification Template:

🚀 Deployment: <feature-name>
📅 Date: YYYY-MM-DD HH:MM
🌍 Environment: Production
📦 Apps: API, Client, Admin
🗄️ Database: No migrations / New migrations applied
⚠️ Breaking Changes: Yes/No
📝 Release Notes: <link-to-changelog>
🔗 Deployment URL: https://rentalshop.com
✅ Status: Success/Failed
```

---

## 🎉 **Quick Start Guide**

### **For First-Time Deployment:**

```bash
# 1. Clone repository
git clone <repo-url>
cd rentalshop-nextjs

# 2. Install dependencies
yarn install

# 3. Setup local environment
cp env.example .env
# Edit .env with your local settings

# 4. Setup database
yarn db:regenerate-system

# 5. Test locally
yarn dev:all

# 6. Connect to Vercel
vercel link

# 7. Set production environment variables
vercel env add DATABASE_URL production
vercel env add JWT_SECRET production
vercel env add NEXTAUTH_SECRET production
# ... (see checklist above)

# 8. Deploy
vercel --prod
```

---

## 🏆 **Production-Ready Checklist**

### **Before Going Live:**

- [ ] All environment variables set in Vercel
- [ ] Production database created and migrated
- [ ] Custom domains configured and SSL enabled
- [ ] Health check endpoints responding
- [ ] Error monitoring (Sentry) configured
- [ ] Analytics enabled
- [ ] Backup strategy in place
- [ ] Rollback procedure documented
- [ ] Team trained on deployment process
- [ ] Load testing completed
- [ ] Security audit performed
- [ ] GDPR compliance reviewed
- [ ] Terms of Service updated
- [ ] Privacy Policy updated
- [ ] Support email configured

---

## 💡 **Tips & Tricks**

### **Faster Deployments**

```json
// turbo.json - optimize build cache
{
  "pipeline": {
    "build": {
      "outputs": [".next/**", "dist/**"],
      "dependsOn": ["^build"]
    }
  }
}
```

### **Environment Variable Sync Script**

```bash
#!/bin/bash
# scripts/sync-env-to-vercel.sh

# Sync environment variables from .env.production to Vercel
while IFS='=' read -r key value; do
  if [[ ! $key =~ ^# ]] && [[ -n $key ]]; then
    vercel env add $key production <<< "$value"
  fi
done < .env.production
```

### **Database Backup Script**

```bash
#!/bin/bash
# scripts/backup-production-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
pg_dump $DATABASE_URL > backups/prod_$DATE.sql
echo "✅ Backup saved to backups/prod_$DATE.sql"
```

---

**🎯 Summary:**

Your monorepo is now configured for:
- ✅ **Clean environment management** (single source of truth)
- ✅ **Multi-environment deployment** (dev/preview/prod)
- ✅ **Type-safe configuration** (@rentalshop/env package)
- ✅ **Production-ready** (PostgreSQL, Cloudinary, Resend)
- ✅ **Scalable architecture** (separate Vercel projects)

**Next Steps:** Follow the deployment steps above to go live! 🚀


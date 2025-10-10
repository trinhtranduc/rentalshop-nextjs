# 🚂 Railway Deployment Guide - Complete

Complete guide for deploying the Rental Shop Next.js monorepo to Railway.

---

## 📋 **Table of Contents**

1. [Quick Start](#-quick-start-15-minutes)
2. [Prerequisites](#-prerequisites)
3. [What Changed](#-what-changed-refactor-summary)
4. [Architecture Overview](#-architecture-overview)
5. [Environment Setup](#-environment-setup)
6. [Deployment Steps](#-deployment-steps)
7. [Prisma Monorepo Setup](#-prisma-monorepo-setup)
8. [Configuration Files](#-configuration-files)
9. [Troubleshooting](#-troubleshooting)
10. [Cost & Monitoring](#-cost--monitoring)

---

## ⚡ **Quick Start (15 minutes)**

### **✅ Database Setup Complete!**

Your PostgreSQL database is now ready with:
- ✅ **Database Schema**: Prisma schema pushed successfully
- ✅ **Test Data**: 120 orders, 60 products, 60 customers, 8 users
- ✅ **Login Credentials**: Ready for testing

### **Next Steps:**

```bash
# 1. Deploy API service
git push

# 2. Deploy Admin & Client services
# (Automatic via Railway when you push to GitHub)

# 3. Test your deployment
curl https://your-api.railway.app/api/health
```

**Database is live and ready!** 🎉

---

## 📋 **Prerequisites**

Before deploying, ensure you have:

- ✅ Railway account (https://railway.app)
- ✅ Railway CLI installed (`npm i -g @railway/cli`)
- ✅ GitHub repository pushed
- ✅ Cloudinary account (optional - for image uploads)
- ✅ Local build successful (`yarn build`)

---

## 🎉 **What Changed (Refactor Summary)**

### **✅ Database Migration**
- Changed from **SQLite** (local) to **PostgreSQL** (Railway)
- Updated `prisma/schema.prisma` provider
- Ready for production deployment

### **✅ Removed Vercel & Supabase**
- Deleted `scripts/deploy-vercel.sh`
- Deleted `tests/performance/vercel-compatibility.test.js`
- Deleted `deploy-all.sh` (hardcoded Supabase credentials)
- Deleted `README_DEPLOY.txt` (outdated)
- Deleted `CONSISTENT_DEPLOY.txt` (outdated)
- Removed all Supabase/Vercel references from docs

### **✅ Created Railway Scripts**
- **`scripts/setup-railway-env.sh`** - Automated environment setup
  - Generates secure JWT_SECRET and NEXTAUTH_SECRET
  - Sets environment variables for all services
  - Pushes Prisma schema to Railway
  - Seeds database with initial data

### **✅ Updated Documentation**
- Railway-only deployment guide (this file)
- Simplified environment variables
- Clear setup instructions

### **💰 Cost Comparison**

| Platform | Before (Vercel + Supabase) | After (Railway) |
|----------|---------------------------|-----------------|
| **Cost** | $85/month | $5-20/month |
| **Setup** | Complex (multiple services) | Simple (all-in-one) |
| **Database** | External ($25/mo) | Built-in (included) |
| **Maintenance** | High | Low |

**Savings: $65-80/month** 🎉

---

## 🏗️ **Architecture Overview**

### **Why Railway?**

| Feature | Railway | Other Platforms |
|---------|---------|----------------|
| **Database** | ✅ Built-in PostgreSQL | ❌ Need external ($25/mo) |
| **Backend** | ✅ Full Node.js support | ⚠️ Limited/Serverless |
| **Storage** | ✅ Persistent volumes | ❌ Need external |
| **Monorepo** | ✅ Native support | ⚠️ Complex setup |
| **Cost** | **$5-20/month** | $45+/month |
| **Setup Time** | 15 minutes | 1+ hours |

### **Deployment Architecture**

```
┌─────────────────────────────────────────────────────┐
│                   RAILWAY PROJECT                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │   DATABASE   │  │   API SERVER │  │  CLIENT   │ │
│  │  PostgreSQL  │◄─│  (Port 3002) │◄─│(Port 3000)│ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
│                            ▲                         │
│                            │                         │
│                    ┌───────────────┐                 │
│                    │  ADMIN PANEL  │                 │
│                    │  (Port 3001)  │                 │
│                    └───────────────┘                 │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### **Monorepo Structure**

```
rentalshop-nextjs/
├── apps/
│   ├── api/              # Next.js API Routes + Backend
│   │   ├── railway.json  # Railway configuration
│   │   └── Dockerfile    # Docker build config
│   │
│   ├── admin/            # Next.js Admin Dashboard
│   │   ├── railway.json
│   │   └── Dockerfile
│   │
│   └── client/           # Next.js Customer App
│       ├── railway.json
│       └── Dockerfile
│
├── packages/             # Shared packages
│   ├── ui/              # UI components
│   ├── auth/            # Authentication
│   ├── database/        # Prisma client
│   └── types/           # TypeScript types
│
├── prisma/              # Database schema (ROOT)
│   └── schema.prisma    # PostgreSQL schema
│
└── scripts/
    └── setup-railway-env.sh  # Automated setup
```

---

## 🔧 **Environment Setup**

### **Option A: Automated Setup (Recommended)**

```bash
./scripts/setup-railway-env.sh
```

This script will:
1. ✅ Check Railway CLI installation
2. ✅ Generate secure secrets (JWT_SECRET, NEXTAUTH_SECRET)
3. ✅ Set all environment variables for all services
4. ✅ Push Prisma schema to Railway database
5. ✅ Seed database with initial data

### **Option B: Manual Setup**

#### **1. Install Railway CLI**

```bash
npm install -g @railway/cli
```

#### **2. Login to Railway**

```bash
railway login
```

#### **3. Link to Your Project**

```bash
railway link
# Select your project from the list
```

#### **4. Add PostgreSQL Database**

**Via Railway Dashboard:**
1. Go to your Railway project dashboard
2. Click **"New"** → **"Database"** → **"Add PostgreSQL"**
3. Wait for database to provision

**Via CLI:**
```bash
railway add postgresql
```

#### **5. Set Environment Variables**

##### **API Service:**

```bash
# Database (from PostgreSQL service)
railway variables --set DATABASE_URL='${{Postgres.DATABASE_URL}}' --service apis

# Node Environment
railway variables --set NODE_ENV=production --service apis

# JWT Configuration (Generate with: openssl rand -hex 32)
railway variables --set JWT_SECRET='your-secret-32-chars-min' --service apis
railway variables --set JWT_EXPIRES_IN=1d --service apis

# NextAuth Configuration (Generate with: openssl rand -hex 32)
railway variables --set NEXTAUTH_SECRET='your-secret-32-chars-min' --service apis
railway variables --set NEXTAUTH_URL='https://apis-development.up.railway.app' --service apis

# Service URLs (Replace with your actual Railway URLs)
railway variables --set API_URL='https://apis-development.up.railway.app' --service apis
railway variables --set CLIENT_URL='https://client-development.up.railway.app' --service apis
railway variables --set ADMIN_URL='https://admin-development.up.railway.app' --service apis

# CORS Configuration
railway variables --set CORS_ORIGINS='https://client-development.up.railway.app,https://admin-development.up.railway.app' --service apis
```

##### **Admin Service:**

```bash
railway variables --set NODE_ENV=production --service admin
railway variables --set NEXT_PUBLIC_API_URL='https://apis-development.up.railway.app' --service admin
railway variables --set NEXTAUTH_SECRET='same-as-api-service' --service admin
railway variables --set NEXTAUTH_URL='https://admin-development.up.railway.app' --service admin
```

##### **Client Service:**

```bash
railway variables --set NODE_ENV=production --service client
railway variables --set NEXT_PUBLIC_API_URL='https://apis-development.up.railway.app' --service client
railway variables --set NEXTAUTH_SECRET='same-as-api-service' --service client
railway variables --set NEXTAUTH_URL='https://client-development.up.railway.app' --service client
```

#### **6. Generate Secure Secrets**

```bash
# Generate JWT_SECRET
openssl rand -hex 32

# Generate NEXTAUTH_SECRET
openssl rand -hex 32
```

**⚠️ IMPORTANT:** Save these secrets in a secure location!

---

## 🚀 **Deployment Steps**

### **Step 1: Push Prisma Schema** ✅ **COMPLETED**

```bash
# ✅ Schema already pushed to Railway database
railway run --service apis npx prisma db push --accept-data-loss

# ✅ Prisma client already generated
railway run --service apis npx prisma generate
```

### **Step 2: Seed Database** ✅ **COMPLETED**

```bash
# ✅ Database already seeded with initial data
railway run --service apis yarn db:regenerate-system
```

**✅ Database contains:**
- ✅ 2 merchants
- ✅ 4 outlets (2 per merchant)
- ✅ 8 users (1 admin + 1 staff per outlet)
- ✅ 60 customers (30 per merchant)
- ✅ 60 products (30 per merchant)
- ✅ 120 orders (30 per outlet)

### **Step 3: Deploy Services** 🚀 **READY TO DEPLOY**

```bash
# Push to GitHub to trigger automatic deployment
git push

# Or deploy directly via CLI
railway up
```

**🎯 Current Status:**
- ✅ Database: Ready with test data
- ✅ Environment Variables: Set
- ✅ Prisma Schema: Pushed
- 🚀 **Next**: Deploy services to Railway

### **Step 4: Monitor Deployment**

```bash
# View logs (follow mode)
railway logs --service apis -f

# Check status
railway status
```

### **Step 5: Verify Deployment**

**Check Service Health:**
- API: `https://apis-development.up.railway.app/api/health`
- Admin: `https://admin-development.up.railway.app`
- Client: `https://client-development.up.railway.app`

**Test Login:**
```bash
curl -X POST https://apis-development.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rentalshop.com","password":"admin123"}'
```

---

## 🔑 **Default Login Credentials**

After database seeding:

### **👑 Super Admin (System-wide Access)**
- Email: `admin@rentalshop.com`
- Password: `admin123`
- **Access**: Full system access

### **🏢 Merchant Accounts (Business Owners)**
- Merchant 1: `merchant1@example.com` / `merchant123`
- Merchant 2: `merchant2@example.com` / `merchant123`
- **Access**: Organization-wide access

### **🏪 Outlet Admins (Outlet Managers)**
- Outlet 1: `admin.outlet1@example.com` / `admin123`
- Outlet 2: `admin.outlet2@example.com` / `admin123`
- Outlet 3: `admin.outlet3@example.com` / `admin123`
- Outlet 4: `admin.outlet4@example.com` / `admin123`
- **Access**: Full access to their outlet

### **👥 Outlet Staff (Outlet Employees)**
- Outlet 1: `staff.outlet1@example.com` / `staff123`
- Outlet 2: `staff.outlet2@example.com` / `staff123`
- Outlet 3: `staff.outlet3@example.com` / `staff123`
- Outlet 4: `staff.outlet4@example.com` / `staff123`
- **Access**: Limited access to their outlet

---

## 🗄️ **Prisma Monorepo Setup**

### **Why Schema at Root?**

```
rentalshop-nextjs/
└── prisma/
    └── schema.prisma  # ✅ Root level, shared by all apps
```

**Benefits:**
- All apps (api, admin, client) share the same schema
- Single source of truth for database structure
- Easier migration management
- Prisma Client generated once, used everywhere

### **Database Provider**

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"  // ✅ PostgreSQL for Railway
  url      = env("DATABASE_URL")
}

generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "debian-openssl-3.0.x", "linux-musl-openssl-3.0.x"]
}
```

### **Prisma Client Package**

```
packages/database/
├── src/
│   ├── client.ts      # Singleton Prisma client
│   └── index.ts       # Export all database utilities
└── package.json
```

**client.ts:**
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

**Why Singleton Pattern?**
- Avoids too many database connections
- Safe hot reload in development
- Better performance

### **Build Flow on Railway**

```
1. Setup Phase
   ↓
2. Install Dependencies (yarn install)
   ↓
3. Generate Prisma Client (npx prisma generate)
   ↓
4. Build App (yarn build)
   ↓
5. Deploy (yarn start)
```

---

## 📄 **Configuration Files**

### **railway.json**

Each app has a `railway.json` file:

#### **apps/api/railway.json**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "deploy": {
    "startCommand": "cd apps/api && yarn start",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### **apps/admin/railway.json**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "deploy": {
    "startCommand": "cd apps/admin && yarn start",
    "healthcheckPath": "/",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

#### **apps/client/railway.json**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "deploy": {
    "startCommand": "cd apps/client && yarn start",
    "healthcheckPath": "/",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### **Dockerfile**

Each app uses Docker for deployment:

#### **apps/api/Dockerfile**

```dockerfile
# Base stage
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json yarn.lock ./
COPY packages/database/package.json ./packages/database/
COPY apps/api/package.json ./apps/api/
RUN yarn install --frozen-lockfile

# Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema=./prisma/schema.prisma
RUN yarn build --filter=@rentalshop/api

# Runner stage
FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/.next/standalone ./
COPY --from=builder /app/apps/api/.next/static ./apps/api/.next/static
COPY --from=builder /app/apps/api/public ./apps/api/public
EXPOSE 3002
CMD ["node", "apps/api/server.js"]
```

### **next.config.js**

Important Next.js configuration for monorepo:

```javascript
module.exports = {
  output: 'standalone',  // ✅ Required for Docker deployment
  
  experimental: {
    outputFileTracingRoot: require('path').join(__dirname, '../../'),
    serverComponentsExternalPackages: [
      '@prisma/client', 
      'prisma', 
      '@rentalshop/database'
    ],
  },
  
  transpilePackages: [
    '@rentalshop/database',  // ✅ Required for Prisma
    '@rentalshop/auth',
    '@rentalshop/middleware',
    '@rentalshop/utils',
    '@rentalshop/constants',
    '@rentalshop/types'
  ],
  
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '.prisma/client': require('path').join(__dirname, '../../node_modules/.prisma/client'),
      };
    }
    return config;
  },
};
```

---

## 🔍 **Troubleshooting**

### **Issue: DATABASE_URL not found**

**Error:**
```
Error: DATABASE_URL is required
```

**Solution:**
1. Make sure PostgreSQL database is added to Railway project
2. Use variable reference: `${{Postgres.DATABASE_URL}}`
3. Restart API service

### **Issue: Prisma Client Not Found**

**Error:**
```
Error: Cannot find module '@prisma/client'
```

**Solution:**
```bash
# Ensure Prisma generate runs before build
railway run --service apis npx prisma generate
```

### **Issue: Module Resolution Errors**

**Error:**
```
Module not found: Can't resolve '@rentalshop/database'
```

**Solution:**
Add to `transpilePackages` in `next.config.js`:
```javascript
transpilePackages: ['@rentalshop/database']
```

### **Issue: Build Timeout**

**Error:**
```
Build exceeded maximum time limit
```

**Solution:**
Use standalone output and optimize build:
```javascript
// next.config.js
output: 'standalone',
experimental: {
  outputFileTracingRoot: require('path').join(__dirname, '../../'),
}
```

### **Issue: CORS Errors**

**Error:**
```
CORS policy: No 'Access-Control-Allow-Origin' header
```

**Solution:**
1. Check `CORS_ORIGINS` includes all frontend URLs
2. Make sure URLs use `https://` (not `http://`)
3. No trailing slashes in URLs
4. Restart API service

### **Issue: Database Connection Timeout**

**Error:**
```
Can't reach database server
```

**Solution:**
1. Check DATABASE_URL is correct
2. Verify PostgreSQL service is running
3. Check Railway service logs for errors

### **Issue: 404 on API Calls**

**Error:**
```
404 Not Found
```

**Solution:**
1. Verify `NEXT_PUBLIC_API_URL` in frontend services
2. Check API service is deployed and running
3. Test API health: `https://your-api.railway.app/api/health`

---

## 💰 **Cost & Monitoring**

### **Cost Estimation**

#### **Hobby Plan ($5/month)**

**Included:**
- $5 credit/month
- Unlimited projects
- PostgreSQL database
- 3 web services

**Usage:**
- API service: ~$2/month
- Client service: ~$1/month
- Admin service: ~$1/month
- PostgreSQL: ~$1/month
- **Total: ~$5/month** ✅

#### **Pro Plan ($20/month)**

**Included:**
- $20 credit/month
- Priority support
- Custom domains
- Higher resource limits

### **Monitoring**

#### **Railway Dashboard**

- **Metrics**: CPU, Memory, Network usage
- **Logs**: Real-time application logs
- **Deployments**: History and status
- **Database**: Connection stats, size

#### **View Logs**

**Railway Dashboard:**
1. Click service (API/Admin/Client)
2. Click "Logs" tab
3. Real-time logs displayed

**Railway CLI:**
```bash
# View logs
railway logs --service apis

# Follow logs (live)
railway logs --service apis -f
```

#### **Monitor Usage**

```bash
# Check environment variables
railway variables --service apis

# Check service status
railway status

# Open dashboard
railway open
```

### **Backup Database**

```bash
# Export database
railway run --service apis pg_dump $DATABASE_URL > backup.sql

# Import database
railway run --service apis psql $DATABASE_URL < backup.sql
```

---

## 📚 **Useful Railway CLI Commands**

```bash
# Install CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# List services
railway service list

# Select service
railway service

# View logs
railway logs
railway logs -f  # Follow mode

# View environment variables
railway variables
railway variables --service apis

# Set environment variable
railway variables --set KEY=value --service apis

# Run command in Railway environment
railway run --service apis <command>

# Open dashboard
railway open

# Deploy
railway up

# Restart service
railway restart --service apis
```

---

## ✅ **Deployment Checklist**

### **✅ Database Setup (COMPLETED):**

- [x] Railway CLI installed
- [x] Logged into Railway (`railway login`)
- [x] PostgreSQL database added
- [x] Environment variables set
- [x] Prisma schema pushed
- [x] Database seeded with test data
- [x] Local build successful (`yarn build`)

### **🚀 Ready for Deployment:**

- [ ] Push to GitHub (`git push`)
- [ ] Monitor Railway deployment
- [ ] Verify all services are running
- [ ] Test API endpoints
- [ ] Test login functionality
- [ ] Verify database connectivity

### **Testing:**

- [ ] Test API health: `curl https://your-api.railway.app/api/health`
- [ ] Test login with default credentials
- [ ] Create test product
- [ ] Create test customer
- [ ] Create test order
- [ ] Upload test image

---

## 🎯 **Environment Variables Reference**

### **API Service (Required)**

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection | `${{Postgres.DATABASE_URL}}` |
| `NODE_ENV` | Node environment | `production` |
| `JWT_SECRET` | JWT signing secret | `your-secret-32-chars-min` |
| `JWT_EXPIRES_IN` | JWT expiration | `1d` |
| `NEXTAUTH_SECRET` | NextAuth secret | `your-secret-32-chars-min` |
| `NEXTAUTH_URL` | NextAuth callback URL | `https://apis-development.up.railway.app` |
| `API_URL` | API service URL | `https://apis-development.up.railway.app` |
| `CLIENT_URL` | Client app URL | `https://client-development.up.railway.app` |
| `ADMIN_URL` | Admin app URL | `https://admin-development.up.railway.app` |
| `CORS_ORIGINS` | Allowed CORS origins | `https://client...,https://admin...` |

### **Admin/Client Services (Required)**

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Node environment | `production` |
| `NEXT_PUBLIC_API_URL` | Public API URL | `https://apis-development.up.railway.app` |
| `NEXTAUTH_SECRET` | NextAuth secret (same as API) | `your-secret-32-chars-min` |
| `NEXTAUTH_URL` | Service callback URL | `https://admin-development.up.railway.app` |

### **Optional Variables**

| Variable | Description | Default |
|----------|-------------|---------|
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | - |
| `CLOUDINARY_API_KEY` | Cloudinary API key | - |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | - |
| `LOG_LEVEL` | Logging level | `info` |
| `RATE_LIMIT_MAX` | Max requests per window | `100` |
| `RATE_LIMIT_WINDOW` | Rate limit window | `15m` |

---

## 🎉 **Current Status: Database Ready!**

Your Rental Shop database is now live on Railway! 🚀

**✅ What's Complete:**
- 🗄️ **PostgreSQL Database**: Connected and running
- 📊 **Schema**: Prisma schema pushed successfully  
- 🌱 **Test Data**: 120 orders, 60 products, 60 customers, 8 users
- 🔑 **Login Credentials**: Ready for testing
- ⚙️ **Environment**: All variables configured

**🚀 Next Step:**
Deploy your services to Railway by pushing to GitHub!

**Service URLs (after deployment):**
- 🌐 API: `https://apis-development.up.railway.app`
- 👨‍💼 Admin: `https://admin-development.up.railway.app`
- 👥 Client: `https://client-development.up.railway.app`

**Total Cost:** ~$5-20/month 💰

**Default Login:**
- Email: `admin@rentalshop.com`
- Password: `admin123`

---

## 📞 **Support & Resources**

- **Railway Discord**: https://discord.gg/railway
- **Railway Documentation**: https://docs.railway.app
- **Railway Status**: https://status.railway.app
- **Prisma Railway Guide**: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-railway
- **Next.js Railway Template**: https://railway.app/template/next

---

**Database is ready! Deploy your services now! 🚀**


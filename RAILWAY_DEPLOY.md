# 🚂 Railway Deployment Guide

Complete guide for deploying the Rental Shop Next.js monorepo to Railway with PostgreSQL.

---

## 📋 Table of Contents

1. [Quick Start](#-quick-start-15-minutes)
2. [Why Railway](#-why-railway)
3. [Architecture](#-architecture-overview)
4. [Environment Setup](#-environment-setup)
5. [Deployment Steps](#-deployment-steps)
6. [Configuration](#-configuration-files)
7. [Troubleshooting](#-troubleshooting)
8. [Monitoring](#-monitoring--costs)

---

## ⚡ Quick Start (15 minutes)

### 1. Install Railway CLI
```bash
npm install -g @railway/cli
railway login
```

### 2. Create Project & Database
```bash
# Create project
railway init

# Add PostgreSQL
railway add postgresql
```

### 3. Automated Setup (Recommended)
```bash
# Run setup script (generates secrets, sets env vars, pushes schema, seeds data)
./scripts/setup-railway-env.sh
```

### 4. Deploy
```bash
# Push to GitHub to trigger automatic deployment
git push

# Or deploy directly
railway up
```

### 5. Verify
```bash
# Check API health
curl https://your-api.railway.app/api/health

# View logs
railway logs --service apis -f
```

**Done!** Your app is now live on Railway! 🎉

---

## 🎯 Why Railway?

| Feature | Railway | Other Platforms |
|---------|---------|----------------|
| **Database** | ✅ Built-in PostgreSQL | ❌ Need external ($25/mo) |
| **Backend** | ✅ Full Node.js support | ⚠️ Limited/Serverless |
| **Storage** | ✅ Persistent volumes | ❌ Need external |
| **Monorepo** | ✅ Native support | ⚠️ Complex setup |
| **Cost** | **$5-20/month** | $45+/month |
| **Setup** | ⚡ 15 minutes | 1+ hours |

**Savings: $25-30/month** compared to Vercel + Supabase 💰

---

## 🏗️ Architecture Overview

### Railway Project Structure
```
┌─────────────────────────────────────────────────────┐
│                   RAILWAY PROJECT                    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │   DATABASE   │  │   API SERVER │  │   ADMIN   │ │
│  │  PostgreSQL  │◄─│  (Port 3002) │◄─│(Port 3001)│ │
│  └──────────────┘  └──────────────┘  └───────────┘ │
│                            ▲                         │
│                            │                         │
│                    ┌───────────────┐                 │
│                    │    CLIENT     │                 │
│                    │  (Port 3000)  │                 │
│                    └───────────────┘                 │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Services
- **PostgreSQL**: Managed database (Railway)
- **API**: Backend + API routes (Next.js)
- **Admin**: Admin dashboard (Next.js)
- **Client**: Customer-facing app (Next.js)

---

## 🔧 Environment Setup

### Option A: Automated Setup (Recommended)

```bash
./scripts/setup-railway-env.sh
```

This script will:
1. ✅ Generate secure JWT_SECRET and NEXTAUTH_SECRET (32+ chars)
2. ✅ Set all environment variables for all services
3. ✅ Push Prisma schema to Railway database
4. ✅ Seed database with initial data

### Option B: Manual Setup

#### 1. Generate Secrets
```bash
# Generate JWT secret
openssl rand -hex 32

# Generate NextAuth secret
openssl rand -hex 32
```

#### 2. Set Environment Variables

**API Service:**
```bash
railway variables --set DATABASE_URL='${{Postgres.DATABASE_URL}}' --service apis
railway variables --set NODE_ENV=production --service apis
railway variables --set JWT_SECRET='your-secret-32-chars-min' --service apis
railway variables --set JWT_EXPIRES_IN=1d --service apis
railway variables --set NEXTAUTH_SECRET='your-secret-32-chars-min' --service apis
railway variables --set NEXTAUTH_URL='https://apis-production.up.railway.app' --service apis
railway variables --set API_URL='https://apis-production.up.railway.app' --service apis
railway variables --set CLIENT_URL='https://client-production.up.railway.app' --service apis
railway variables --set ADMIN_URL='https://admin-production.up.railway.app' --service apis
railway variables --set CORS_ORIGINS='https://client-production.up.railway.app,https://admin-production.up.railway.app' --service apis
```

**Admin Service:**
```bash
railway variables --set NODE_ENV=production --service admin
railway variables --set NEXT_PUBLIC_API_URL='https://apis-production.up.railway.app' --service admin
railway variables --set NEXTAUTH_SECRET='same-as-api-service' --service admin
railway variables --set NEXTAUTH_URL='https://admin-production.up.railway.app' --service admin
```

**Client Service:**
```bash
railway variables --set NODE_ENV=production --service client
railway variables --set NEXT_PUBLIC_API_URL='https://apis-production.up.railway.app' --service client
railway variables --set NEXTAUTH_SECRET='same-as-api-service' --service client
railway variables --set NEXTAUTH_URL='https://client-production.up.railway.app' --service client
```

---

## 🚀 Deployment Steps

### Step 1: Push Prisma Schema
```bash
# Push schema to Railway database
railway run --service apis npx prisma db push --accept-data-loss

# Generate Prisma client
railway run --service apis npx prisma generate
```

### Step 2: Seed Database
```bash
railway run --service apis yarn db:regenerate-system
```

This creates:
- ✅ 2 merchants with subscription plans
- ✅ 4 outlets (2 per merchant)
- ✅ 8 users with different roles
- ✅ 60 customers (30 per merchant)
- ✅ 60 products with stock
- ✅ 120 orders (30 per outlet)

### Step 3: Deploy Services
```bash
# Push to GitHub (Railway auto-deploys)
git push

# Or deploy directly via CLI
railway up

# Monitor deployment
railway logs --service apis -f
```

### Step 4: Verify Deployment
```bash
# Check health endpoint
curl https://apis-production.up.railway.app/api/health

# Test login
curl -X POST https://apis-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rentalshop.com","password":"admin123"}'
```

---

## 🔑 Default Login Credentials

After database seeding:

### 👑 Super Admin (System-wide Access)
- Email: `admin@rentalshop.com`
- Password: `admin123`
- Access: Full system access

### 🏢 Merchant Accounts (Business Owners)
- Merchant 1: `merchant1@example.com` / `merchant123`
- Merchant 2: `merchant2@example.com` / `merchant123`
- Access: Organization-wide access

### 🏪 Outlet Admins (Outlet Managers)
- Outlet 1-4: `admin.outlet[1-4]@example.com` / `admin123`
- Access: Full access to their outlet

### 👥 Outlet Staff (Employees)
- Outlet 1-4: `staff.outlet[1-4]@example.com` / `staff123`
- Access: Limited outlet access

---

## 📄 Configuration Files

### railway.json

Each service has configuration:

**apps/api/railway.json:**
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

**apps/admin/railway.json & apps/client/railway.json:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "deploy": {
    "startCommand": "cd apps/[service] && yarn start",
    "healthcheckPath": "/",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Dockerfile

Each service uses a multi-stage Docker build:

```dockerfile
# Base stage
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# Dependencies
FROM base AS deps
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN yarn build --filter=@rentalshop/[service]

# Runner
FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/apps/[service]/.next/standalone ./
COPY --from=builder /app/apps/[service]/.next/static ./apps/[service]/.next/static
EXPOSE [PORT]
CMD ["node", "apps/[service]/server.js"]
```

### next.config.js

Important monorepo configuration:

```javascript
module.exports = {
  output: 'standalone',  // Required for Docker
  
  experimental: {
    outputFileTracingRoot: require('path').join(__dirname, '../../'),
    serverComponentsExternalPackages: [
      '@prisma/client', 
      'prisma', 
      '@rentalshop/database'
    ],
  },
  
  transpilePackages: [
    '@rentalshop/database',
    '@rentalshop/auth',
    '@rentalshop/middleware',
    '@rentalshop/utils',
    '@rentalshop/constants',
    '@rentalshop/types'
  ],
};
```

---

## 🔍 Troubleshooting

### Issue: DATABASE_URL not found
**Error:** `DATABASE_URL is required`

**Solution:**
1. Verify PostgreSQL is added: `railway service list`
2. Use variable reference: `${{Postgres.DATABASE_URL}}`
3. Restart API service: `railway restart --service apis`

### Issue: Prisma Client not found
**Error:** `Cannot find module '@prisma/client'`

**Solution:**
```bash
# Regenerate Prisma client
railway run --service apis npx prisma generate
```

### Issue: Module resolution errors
**Error:** `Can't resolve '@rentalshop/database'`

**Solution:**
Add to `transpilePackages` in `next.config.js`:
```javascript
transpilePackages: ['@rentalshop/database']
```

### Issue: CORS errors
**Error:** `No 'Access-Control-Allow-Origin' header`

**Solution:**
1. Check `CORS_ORIGINS` includes all frontend URLs
2. Use `https://` (not `http://`)
3. No trailing slashes
4. Restart: `railway restart --service apis`

### Issue: Build timeout
**Error:** `Build exceeded maximum time limit`

**Solution:**
1. Use `output: 'standalone'` in next.config.js
2. Optimize Docker layers
3. Contact Railway support for timeout increase

---

## 📊 Monitoring & Costs

### Cost Estimation

**Hobby Plan ($5/month):**
- API service: ~$2/mo
- Client service: ~$1/mo
- Admin service: ~$1/mo
- PostgreSQL: ~$1/mo
- **Total: ~$5/month** ✅

**Pro Plan ($20/month):**
- Higher resources (2GB RAM per service)
- Priority support
- Custom domains
- **Total: ~$20/month**

### Monitoring

**View Logs:**
```bash
# Real-time logs
railway logs --service apis -f

# Specific service
railway logs --service admin

# Historical logs
railway logs --service apis --limit 1000
```

**Check Status:**
```bash
# Service status
railway status

# Environment variables
railway variables --service apis

# Service metrics
railway metrics --service apis
```

**Database Backup:**
```bash
# Export database
railway run --service apis pg_dump $DATABASE_URL > backup.sql

# Import database
railway run --service apis psql $DATABASE_URL < backup.sql
```

---

## 📚 Useful Railway CLI Commands

```bash
# Install
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

# View/set environment variables
railway variables
railway variables --set KEY=value --service apis

# Run command in Railway environment
railway run --service apis <command>

# Open dashboard
railway open

# Deploy
railway up

# Restart service
railway restart --service apis

# Delete service
railway service delete
```

---

## ✅ Deployment Checklist

### Pre-deployment:
- [ ] Railway account created
- [ ] Railway CLI installed
- [ ] PostgreSQL database added
- [ ] Environment variables set (automated or manual)
- [ ] Local build successful (`yarn build`)

### Deployment:
- [ ] Prisma schema pushed
- [ ] Database seeded
- [ ] Services deployed
- [ ] All services running

### Post-deployment:
- [ ] Health checks passing
- [ ] Login functionality works
- [ ] CORS configured correctly
- [ ] SSL/HTTPS enabled
- [ ] Custom domains set up (optional)
- [ ] Monitoring configured

### Testing:
- [ ] API health endpoint responds
- [ ] Admin login works
- [ ] Client login works
- [ ] Create product works
- [ ] Create customer works
- [ ] Create order works
- [ ] Image upload works (if Cloudinary configured)

---

## 🎉 Done!

Your Rental Shop is now deployed on Railway! 🚀

**Your URLs:**
- API: `https://apis-production.up.railway.app`
- Admin: `https://admin-production.up.railway.app`
- Client: `https://client-production.up.railway.app`

**Default Login:**
- Email: `admin@rentalshop.com`
- Password: `admin123`

**Total Setup Time:** ~15-30 minutes  
**Monthly Cost:** ~$5-20

---

## 📞 Support & Resources

- **Railway Discord**: https://discord.gg/railway
- **Railway Docs**: https://docs.railway.app
- **Railway Status**: https://status.railway.app
- **Prisma Railway Guide**: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-railway

---

*Last Updated: December 2024*


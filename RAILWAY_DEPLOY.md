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

**API Service (Production):**
```bash
railway variables --set DATABASE_URL='${{Postgres.DATABASE_URL}}' --service apis
railway variables --set NODE_ENV=production --service apis
railway variables --set JWT_SECRET='your-secret-32-chars-min' --service apis
railway variables --set JWT_EXPIRES_IN=1d --service apis
railway variables --set NEXTAUTH_SECRET='your-secret-32-chars-min' --service apis
railway variables --set NEXTAUTH_URL='https://api.anyrent.shop' --service apis
railway variables --set API_URL='https://api.anyrent.shop' --service apis
railway variables --set CLIENT_URL='https://anyrent.shop' --service apis
railway variables --set ADMIN_URL='https://admin.anyrent.shop' --service apis
railway variables --set CORS_ORIGINS='https://anyrent.shop,https://admin.anyrent.shop' --service apis
```

**API Service (Development):**
```bash
railway variables --set DATABASE_URL='${{Postgres.DATABASE_URL}}' --service dev-apis
railway variables --set NODE_ENV=development --service dev-apis
railway variables --set JWT_SECRET='your-secret-32-chars-min' --service dev-apis
railway variables --set JWT_EXPIRES_IN=1d --service dev-apis
railway variables --set NEXTAUTH_SECRET='your-secret-32-chars-min' --service dev-apis
railway variables --set NEXTAUTH_URL='https://dev-api.anyrent.shop' --service dev-apis
railway variables --set API_URL='https://dev-api.anyrent.shop' --service dev-apis
railway variables --set CLIENT_URL='https://dev.anyrent.shop' --service dev-apis
railway variables --set ADMIN_URL='https://dev-admin.anyrent.shop' --service dev-apis
railway variables --set CORS_ORIGINS='https://dev.anyrent.shop,https://dev-admin.anyrent.shop' --service dev-apis
```

**Admin Service (Production):**
```bash
railway variables --set NODE_ENV=production --service admin
railway variables --set NEXT_PUBLIC_API_URL='https://api.anyrent.shop' --service admin
railway variables --set NEXTAUTH_SECRET='same-as-api-service' --service admin
railway variables --set NEXTAUTH_URL='https://admin.anyrent.shop' --service admin
```

**Admin Service (Development):**
```bash
railway variables --set NODE_ENV=development --service dev-admin
railway variables --set NEXT_PUBLIC_API_URL='https://dev-api.anyrent.shop' --service dev-admin
railway variables --set NEXTAUTH_SECRET='same-as-api-service' --service dev-admin
railway variables --set NEXTAUTH_URL='https://dev-admin.anyrent.shop' --service dev-admin
```

**Client Service (Production):**
```bash
railway variables --set NODE_ENV=production --service client
railway variables --set NEXT_PUBLIC_API_URL='https://api.anyrent.shop' --service client
railway variables --set NEXTAUTH_SECRET='same-as-api-service' --service client
railway variables --set NEXTAUTH_URL='https://anyrent.shop' --service client
```

**Client Service (Development):**
```bash
railway variables --set NODE_ENV=development --service dev-client
railway variables --set NEXT_PUBLIC_API_URL='https://dev-api.anyrent.shop' --service dev-client
railway variables --set NEXTAUTH_SECRET='same-as-api-service' --service dev-client
railway variables --set NEXTAUTH_URL='https://dev.anyrent.shop' --service dev-client
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

## 👑 Tạo Super Admin Account

### Cách 1: Tự động (Khuyến nghị) - Chạy Script Seed

Script seed sẽ tự động tạo super admin cùng với dữ liệu mẫu:

```bash
# Chạy script seed trên Railway
railway run --service apis yarn db:regenerate-system
```

**Kết quả:**
- ✅ Tự động tạo super admin: `admin@rentalshop.com` / `admin123`
- ✅ Tạo 2 merchants + 4 outlets + 8 users
- ✅ Tạo 60 customers + 60 products + 120 orders

**Thông tin đăng nhập:**
- Email: `admin@rentalshop.com`
- Password: `admin123`
- Role: `ADMIN` (Full system access)

### Cách 2: Thủ công - Chạy Prisma Studio

Nếu bạn muốn tạo admin account thủ công hoặc thay đổi thông tin:

#### Bước 1: Mở Prisma Studio trên Railway

```bash
# Mở Prisma Studio với Railway database
railway run --service apis npx prisma studio
```

#### Bước 2: Tạo User mới

1. Trong Prisma Studio, chọn model `User`
2. Click "Add record"
3. Điền thông tin:
   - `email`: Email của admin (ví dụ: `admin@rentalshop.com`)
   - `password`: Mã hóa password bằng bcrypt
   - `firstName`: Tên
   - `lastName`: Họ
   - `phone`: Số điện thoại
   - `role`: `ADMIN`
   - `isActive`: `true`
   - `merchantId`: `null` (để trống - super admin không thuộc merchant nào)
   - `outletId`: `null` (để trống - super admin không thuộc outlet nào)

**⚠️ Lưu ý:** Password phải được hash bằng bcrypt. Xem Cách 3 để tạo script tự động hash password.

### Cách 3: Tạo Script Tự Động

Tạo script Node.js để tạo super admin với password đã hash:

```bash
# Chạy script tạo super admin
railway run --service apis node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@rentalshop.com';
  const password = process.env.ADMIN_PASSWORD || 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const admin = await prisma.user.create({
    data: {
      email: email,
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Administrator',
      phone: '+1-555-0001',
      role: 'ADMIN',
      isActive: true,
      merchantId: null,
      outletId: null
    }
  });
  
  console.log('✅ Created super admin:', admin.email);
}

createAdmin().catch(console.error).finally(() => prisma.\$disconnect());
"
```

Hoặc với custom email/password:

```bash
# Tạo admin với email và password tùy chỉnh
ADMIN_EMAIL="your-admin@example.com" \
ADMIN_PASSWORD="your-secure-password" \
railway run --service apis node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.error('❌ ADMIN_EMAIL and ADMIN_PASSWORD required');
    process.exit(1);
  }
  
  // Check if admin already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('⚠️  Admin already exists:', email);
    process.exit(0);
  }
  
  const hashedPassword = await bcrypt.hash(password, 10);
  const admin = await prisma.user.create({
    data: {
      email: email,
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Administrator',
      phone: '+1-555-0001',
      role: 'ADMIN',
      isActive: true,
      merchantId: null,
      outletId: null
    }
  });
  
  console.log('✅ Created super admin:', admin.email);
}

createAdmin().catch(console.error).finally(() => prisma.\$disconnect());
"
```

### Cách 4: Sử dụng API Endpoint (Nếu có)

Nếu bạn đã có API endpoint để tạo user:

```bash
# Tạo admin qua API (cần authentication token nếu API yêu cầu)
curl -X POST https://your-api.railway.app/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "email": "admin@rentalshop.com",
    "password": "admin123",
    "firstName": "Super",
    "lastName": "Administrator",
    "phone": "+1-555-0001",
    "role": "ADMIN"
  }'
```

### ✅ Xác minh Super Admin đã được tạo

Sau khi tạo, kiểm tra bằng cách đăng nhập:

```bash
# Test login với curl
curl -X POST https://your-api.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rentalshop.com","password":"admin123"}'
```

Hoặc truy cập Admin Dashboard:
- URL: `https://admin-production.up.railway.app`
- Email: `admin@rentalshop.com`
- Password: `admin123`

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

### Issue: Can't reach database server (Internal Railway URL)
**Error:** `Can't reach database server at postgres-xxx.railway.internal:5432`

**Nguyên nhân:**
- Script đang cố kết nối đến Railway internal hostname từ local machine
- Internal URL chỉ hoạt động TRONG Railway network, không thể truy cập từ local

**Giải pháp:**

**Option 1: Đảm bảo script chạy TRÊN Railway (Khuyến nghị)**
```bash
# Kiểm tra service đang active
railway status

# Đảm bảo service được deploy
railway up --service dev-apis

# Chạy script trên Railway container
railway run --service dev-apis yarn db:regenerate-system
```

**Option 2: Kiểm tra DATABASE_URL variable**
```bash
# Xem DATABASE_URL trên Railway
railway variables --service dev-apis | grep DATABASE_URL

# Nếu chưa set, set từ PostgreSQL service reference
railway variables --set DATABASE_URL='${{Postgres.DATABASE_URL}}' --service dev-apis
```

**Option 3: Đợi service khởi động hoàn toàn**
```bash
# Kiểm tra service status
railway logs --service dev-apis --tail 50

# Đợi service ready (thường mất 1-2 phút sau khi deploy)
# Sau đó chạy lại script
railway run --service dev-apis yarn db:regenerate-system
```

**Option 4: Sử dụng Railway Shell (Interactive)**
```bash
# Mở Railway shell để chạy command trong môi trường Railway
railway shell --service dev-apis

# Trong Railway shell:
yarn db:regenerate-system
# hoặc
node scripts/regenerate-entire-system-2025.js
```

**Option 5: Sử dụng Public DATABASE_URL (Chạy từ Local)**
Nếu bạn có **Public DATABASE_URL** (từ Railway Dashboard → PostgreSQL → Connect → Public Network), bạn có thể chạy script từ local machine:

```bash
# Set DATABASE_URL environment variable với public URL
export DATABASE_URL="postgresql://postgres:password@host:port/railway"

# Sau đó chạy script local
yarn db:regenerate-system
# hoặc
node scripts/regenerate-entire-system-2025.js
```

**⚠️ Lưu ý bảo mật:**
- Public URL có thể truy cập từ internet, cần bảo vệ tốt
- Không commit public DATABASE_URL vào git
- Chỉ dùng khi cần thiết, tốt nhất vẫn nên dùng Railway Shell

**Để lấy Public DATABASE_URL:**
1. Vào Railway Dashboard
2. Chọn PostgreSQL service
3. Vào tab "Connect"
4. Copy "Public Network" URL

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


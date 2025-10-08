# 🚂 Railway CLI Deployment - Step by Step

## 📋 **Prerequisites Checklist**

Before starting, ensure you have:
- [ ] Railway account created (https://railway.app)
- [ ] Git repository pushed to GitHub
- [ ] Local development working (`yarn dev:all`)
- [ ] Packages built (`yarn build`)

---

## 🚀 **Step 1: Install Railway CLI**

```bash
# Install Railway CLI globally
npm install -g @railway/cli

# Verify installation
railway --version
```

---

## 🔐 **Step 2: Login to Railway**

```bash
# Login to your Railway account
railway login

# This will open browser for authentication
# After login, you'll be redirected back to terminal
```

---

## 🏗️ **Step 3: Create Railway Project**

```bash
# Navigate to your project root
cd /Users/mac/Source-Code/rentalshop-nextjs

# Initialize Railway project
railway init

# When prompted:
# ? Project name: rentalshop-nextjs
# ? Environment: production
# ? Git repository: (auto-detected)
```

---

## 🗄️ **Step 4: Add PostgreSQL Database**

```bash
# Add PostgreSQL database to your project
railway add --database postgres

# This creates a PostgreSQL service in your Railway project
# Railway will automatically set DATABASE_URL environment variable
```

**Alternative method (via Railway Dashboard):**
1. Go to Railway Dashboard: https://railway.app/dashboard
2. Select your project
3. Click "New" → "Database" → "PostgreSQL"
4. Railway will automatically provision the database

---

## 🔧 **Step 5: Deploy API Service**

### **Option 1: Automatic Import (Recommended)**
```bash
# Railway automatically detects Yarn monorepo
# Go to Railway Dashboard → New Project → Deploy from GitHub repo
# Select: trinhtranduc/rentalshop-nextjs
# Railway will auto-detect and create services for each app
```

### **Option 2: Manual CLI Setup**
```bash
# Create API service with proper monorepo config
railway add --service api

# When prompted:
# ? What do you need? → Empty Service
# ? Enter a service name → api
# ? Enter a variable → (skip for now)

# Set root directory for monorepo
# Railway Dashboard → api service → Settings → Root Directory → apps/api
```

**Expected Output:**
```
✅ Service created successfully!
🌐 https://rentalshop-api-xxxx.up.railway.app
```

---

## 🎨 **Step 6: Deploy Client Service**

### **Option 1: Automatic Import (Recommended)**
```bash
# Railway auto-detects all apps in monorepo
# Client service will be created automatically
# No additional steps needed
```

### **Option 2: Manual CLI Setup**
```bash
# Create Client service
railway add --service client

# Set root directory: apps/client
# Railway Dashboard → client service → Settings → Root Directory → apps/client
```

**Expected Output:**
```
✅ Service created successfully!
🌐 https://rentalshop-client-xxxx.up.railway.app
```

---

## 👑 **Step 7: Deploy Admin Service**

### **Option 1: Automatic Import (Recommended)**
```bash
# Railway auto-detects all apps in monorepo
# Admin service will be created automatically
# No additional steps needed
```

### **Option 2: Manual CLI Setup**
```bash
# Create Admin service
railway add --service admin

# Set root directory: apps/admin
# Railway Dashboard → admin service → Settings → Root Directory → apps/admin
```

**Expected Output:**
```
✅ Service created successfully!
🌐 https://rentalshop-admin-xxxx.up.railway.app
```

---

## ⚙️ **Step 8: Set Environment Variables**

### **8.1: Set API Service Environment Variables**

```bash
# Switch to API service
railway service

# Select: api

# Set environment variables
railway variables set JWT_SECRET="$(openssl rand -base64 32)"
railway variables set JWT_EXPIRES_IN="1d"
railway variables set NEXTAUTH_SECRET="$(openssl rand -base64 32)"
railway variables set NEXTAUTH_URL="https://your-api-url.up.railway.app"
railway variables set API_URL="https://your-api-url.up.railway.app"
railway variables set CLIENT_URL="https://your-client-url.up.railway.app"
railway variables set ADMIN_URL="https://your-admin-url.up.railway.app"
railway variables set CORS_ORIGINS="https://your-client-url.up.railway.app,https://your-admin-url.up.railway.app"
railway variables set NODE_ENV="production"
railway variables set LOG_LEVEL="warn"

# Note: DATABASE_URL is automatically set by Railway PostgreSQL service
```

### **8.2: Set Client Service Environment Variables**

```bash
# Switch to Client service
railway service

# Select: client

# Set environment variables
railway variables set NEXT_PUBLIC_API_URL="https://your-api-url.up.railway.app"
railway variables set NEXTAUTH_SECRET="same-jwt-secret-from-api"
railway variables set NEXTAUTH_URL="https://your-client-url.up.railway.app"
railway variables set NODE_ENV="production"
```

### **8.3: Set Admin Service Environment Variables**

```bash
# Switch to Admin service
railway service

# Select: admin

# Set environment variables
railway variables set NEXT_PUBLIC_API_URL="https://your-api-url.up.railway.app"
railway variables set NEXTAUTH_SECRET="same-jwt-secret-from-api"
railway variables set NEXTAUTH_URL="https://your-admin-url.up.railway.app"
railway variables set NODE_ENV="production"
```

---

## 🗃️ **Step 9: Run Database Migrations**

```bash
# Switch to API service (where Prisma is configured)
railway service

# Select: api

# Run database migrations
railway run npx prisma migrate deploy --schema=../../prisma/schema.prisma

# Generate Prisma client
railway run npx prisma generate --schema=../../prisma/schema.prisma
```

**Expected Output:**
```
✅ Database migrations applied successfully
✅ Prisma client generated
```

---

## 🌱 **Step 10: Seed Database (Optional)**

```bash
# Still in API service
railway service

# Select: api

# Run seed script to create test data
railway run node scripts/regenerate-entire-system-2025.js
```

**This creates:**
- 2 merchants with accounts
- 4 outlets (2 per merchant)
- 8 users (1 admin + 1 staff per outlet)
- 60 customers (30 per merchant)
- 60 products (30 per merchant)
- 120 orders (30 per outlet)

---

## ✅ **Step 11: Test Deployment**

### **11.1: Test API Health**

```bash
# Test API health endpoint
curl https://your-api-url.up.railway.app/api/health

# Expected response:
# {"status":"ok","timestamp":"2025-01-08T..."}
```

### **11.2: Test Login API**

```bash
# Test login endpoint
curl -X POST https://your-api-url.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rentalshop.com","password":"admin123"}'

# Expected response:
# {"success":true,"token":"...","user":{...}}
```

### **11.3: Test Client App**

1. Open browser: `https://your-client-url.up.railway.app`
2. Login with: `admin@rentalshop.com` / `admin123`
3. Verify dashboard loads with data

### **11.4: Test Admin App**

1. Open browser: `https://your-admin-url.up.railway.app`
2. Login with: `admin@rentalshop.com` / `admin123`
3. Test admin features

---

## 🔄 **Step 12: Enable Auto-Deploy (Recommended)**

### **12.1: Connect GitHub Repository**

```bash
# For each service, connect to GitHub
railway service

# Select: api (then client, then admin)

# Connect to GitHub
railway connect

# Select your GitHub repository
# Select branch: main (or dev)
```

### **12.2: Test Auto-Deploy**

```bash
# Make a small change
echo "# Test auto-deploy" >> README.md

# Commit and push
git add README.md
git commit -m "test: auto-deploy"
git push origin main

# Railway will automatically deploy all services
```

---

## 📊 **Step 13: Monitor Deployment**

### **13.1: View Logs**

```bash
# View logs for specific service
railway service

# Select: api (or client/admin)

# View logs
railway logs

# Follow logs in real-time
railway logs -f
```

### **13.2: Check Service Status**

```bash
# List all services
railway service list

# Check specific service
railway status
```

---

## 🎯 **Expected Final Result**

After successful deployment:

```
✅ PostgreSQL Database: Railway internal connection
✅ API Service:          https://rentalshop-api-xxxx.up.railway.app
✅ Client Service:       https://rentalshop-client-xxxx.up.railway.app
✅ Admin Service:        https://rentalshop-admin-xxxx.up.railway.app

Default Login Credentials:
- Email: admin@rentalshop.com
- Password: admin123

Total Cost: $5-20/month (Railway only)
```

---

## 🚨 **Troubleshooting**

### **Issue: Build Failed**

```bash
# Check if packages are built
yarn build

# Commit built packages
git add packages/*/dist
git commit -m "build: add built packages"
git push origin main

# Redeploy
railway up
```

### **Issue: Database Connection Failed**

```bash
# Check database URL
railway variables

# Verify DATABASE_URL is set
# Should be: postgresql://postgres:password@containers-us-west-1.railway.app:5432/railway
```

### **Issue: CORS Error**

```bash
# Update CORS origins in API service
railway service

# Select: api

# Update CORS_ORIGINS
railway variables set CORS_ORIGINS="https://your-client-url.up.railway.app,https://your-admin-url.up.railway.app"

# Redeploy API
railway up
```

---

## 📚 **Useful Railway CLI Commands**

```bash
# Login/logout
railway login
railway logout

# Project management
railway init
railway link
railway unlink

# Service management
railway service
railway service list
railway up
railway down

# Environment variables
railway variables
railway variables set KEY="value"
railway variables unset KEY

# Database
railway run <command>
railway shell

# Logs and monitoring
railway logs
railway logs -f
railway status

# Help
railway help
railway help <command>
```

---

## 🎉 **Success!**

Your RentalShop monorepo is now deployed on Railway! 🚀

**Next Steps:**
1. Test all features thoroughly
2. Setup custom domains (optional)
3. Configure monitoring alerts
4. Enable auto-backups
5. Scale resources as needed

**Need help?** Check [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md) for detailed troubleshooting guide.

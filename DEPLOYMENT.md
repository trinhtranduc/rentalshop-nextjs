# 🚀 Deployment Guide - Railway Only

## 📋 **Project Architecture**

This monorepo contains **3 Next.js applications** that need to be deployed separately:

```
rentalshop-nextjs/
├── apps/
│   ├── api/           → Backend API Server (Port 3002)
│   │   └── railway.json ✅
│   ├── client/        → Customer-facing App (Port 3000)
│   │   └── railway.json ✅
│   └── admin/         → Admin Dashboard (Port 3001)
│       └── railway.json ✅
└── packages/          → Shared packages (UI, Auth, Database, etc.)
```

### **Railway Deployment Strategy**

You will deploy **4 services** on Railway:
1. **PostgreSQL Database** (Railway built-in)
2. **API Service** (apps/api) → Backend server
3. **Client Service** (apps/client) → Customer app
4. **Admin Service** (apps/admin) → Admin dashboard

### **Why Railway?**

✅ **All-in-One Solution**
- Built-in PostgreSQL database (no external service needed)
- Full Node.js backend support (not just serverless)
- Persistent storage with volumes
- Websockets support
- Long-running tasks support

✅ **Cost-Effective**
- Hobby Plan: $5/month
- Pro Plan: $20/month
- All services included (database + hosting + storage)

✅ **Monorepo Support**
- Auto-detects each app in monorepo
- Each railway.json configures its own build
- Shared packages work seamlessly

## 🚂 **Quick Deploy (30 minutes)**

### **Step 1: Install Railway CLI**
```bash
npm i -g @railway/cli
```

### **Step 2: Login**
```bash
railway login
```

### **Step 3: Create Project & Add Database**
```bash
# Create new Railway project
railway init

# Add PostgreSQL database
railway add postgresql
```

### **Step 4: Deploy Each Service**

Railway will detect each app's `railway.json` and deploy separately:

**Deploy API Service:**
```bash
cd apps/api
railway up
# Save the URL: https://your-api.railway.app
```

**Deploy Client Service:**
```bash
cd apps/client
railway up
# Save the URL: https://your-client.railway.app
```

**Deploy Admin Service:**
```bash
cd apps/admin
railway up
# Save the URL: https://your-admin.railway.app
```

## 📦 **Railway Configuration Files**

Each app has its own `railway.json` that Railway uses for deployment:

### **apps/api/railway.json**
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd ../.. && yarn install && yarn build --filter=@rentalshop/api"
  },
  "deploy": {
    "startCommand": "cd apps/api && yarn start",
    "healthcheckPath": "/api/health"
  }
}
```

### **apps/client/railway.json**
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd ../.. && yarn install && yarn build --filter=@rentalshop/client"
  },
  "deploy": {
    "startCommand": "cd apps/client && yarn start",
    "healthcheckPath": "/"
  }
}
```

### **apps/admin/railway.json**
```json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd ../.. && yarn install && yarn build --filter=@rentalshop/admin"
  },
  "deploy": {
    "startCommand": "cd apps/admin && yarn start",
    "healthcheckPath": "/"
  }
}
```

**Key Points:**
- ✅ Each app builds from monorepo root (`cd ../..`)
- ✅ Turborepo filter builds only needed packages (`--filter`)
- ✅ Start command runs from app directory
- ✅ Healthcheck ensures service is running

## 🔧 **Environment Variables Setup**

After deploying, set environment variables for each service:

### **API Service Variables:**
```bash
# Database (use Railway PostgreSQL reference)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Authentication
JWT_SECRET=<generate-with-openssl>
JWT_EXPIRES_IN=1d
NEXTAUTH_SECRET=<generate-with-openssl>
NEXTAUTH_URL=https://your-api.railway.app

# File uploads (if needed)
# UPLOAD_PROVIDER=local

# URLs (update after all apps deployed)
API_URL=https://your-api.railway.app
CLIENT_URL=https://your-client.railway.app
ADMIN_URL=https://your-admin.railway.app
CORS_ORIGINS=https://your-client.railway.app,https://your-admin.railway.app

# Environment
NODE_ENV=production
LOG_LEVEL=warn
```

### **Client Service Variables:**
```bash
NEXT_PUBLIC_API_URL=https://your-api.railway.app
NEXTAUTH_SECRET=<same-as-api>
NEXTAUTH_URL=https://your-client.railway.app
NODE_ENV=production
```

### **Admin Service Variables:**
```bash
NEXT_PUBLIC_API_URL=https://your-api.railway.app
NEXTAUTH_SECRET=<same-as-api>
NEXTAUTH_URL=https://your-admin.railway.app
NODE_ENV=production
```

**Generate Secrets:**
```bash
# On your local terminal
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 32  # For NEXTAUTH_SECRET
```

## 📚 **Complete Documentation**

See **[RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md)** for:
- Detailed step-by-step deployment guide (30 minutes)
- Complete environment variables setup
- Database migration and seeding
- Troubleshooting common issues
- Monitoring and maintenance
- Custom domains setup

## 💰 **Cost Estimation**

### **For 10 shops, 10k products, 10k orders:**

**Hobby Plan ($5/mo):**
- Good for: Testing, MVP, demo
- Database: 100MB-1GB
- RAM: 512MB per service
- vCPU: Shared

**Pro Plan ($20/mo) - Recommended:**
- Good for: Production, 1000-10,000 users ✅
- Database: 10GB+
- RAM: 8GB per service
- vCPU: 2 dedicated cores

## ✅ **Deployment Checklist**

### **Pre-Deployment:**
- [ ] Railway account created
- [ ] Railway CLI installed (`npm i -g @railway/cli`)
- [ ] Secrets generated (`openssl rand -base64 32`)
- [ ] Git repository pushed to GitHub

### **Deployment:**
- [ ] PostgreSQL database added to Railway
- [ ] API service deployed (`cd apps/api && railway up`)
- [ ] Client service deployed (`cd apps/client && railway up`)
- [ ] Admin service deployed (`cd apps/admin && railway up`)
- [ ] Environment variables set for all 3 services
- [ ] Database migrations run (`railway run npx prisma migrate deploy`)
- [ ] Database seeded (optional: `railway run node scripts/regenerate-entire-system-2025.js`)

### **Testing:**
- [ ] API health check: `curl https://your-api.railway.app/api/health`
- [ ] Login working: Test with `admin@rentalshop.com` / `admin123`
- [ ] Client app accessible and functional
- [ ] Admin app accessible and functional
- [ ] File upload working (if enabled)
- [ ] Database connected and data loading
- [ ] No CORS errors in browser console

## 🎯 **Deployment Phases**

### **Phase 1: Testing (Now)**
- Use Railway Hobby Plan: $5/month
- Deploy all 3 services + database
- Test all features thoroughly
- Get familiar with Railway dashboard
- Setup monitoring

### **Phase 2: Production (When ready)**
- Upgrade to Pro Plan: $20/month
- Setup custom domains:
  - `api.yourdomain.com` → API service
  - `yourdomain.com` → Client service
  - `admin.yourdomain.com` → Admin service
- Enable auto-backups
- Configure alerts

### **Phase 3: Scale (Future)**
- Vertical scaling: Upgrade resources per service
- Horizontal scaling: Add replica services
- Optimize database queries and indexes
- CDN for static assets (Railway Edge)

## 🔗 **Useful Links**

- **Railway Dashboard**: https://railway.app/dashboard
- **Railway Docs**: https://docs.railway.app
- **Railway Discord**: https://discord.gg/railway
- **Railway Status**: https://status.railway.app

## 🔄 **Redeploy / Update**

### **Auto-Deploy (Recommended):**
Connect your GitHub repository to Railway:
```bash
# Railway Dashboard → Service → Settings → Deploy
# → Connect to GitHub repo
# → Select branch (main/dev)
```

Now, every push to GitHub will auto-deploy:
```bash
git add .
git commit -m "feat: new feature"
git push origin main
```

### **Manual Deploy:**
```bash
# Deploy specific service
cd apps/api
railway up

# Or redeploy all
cd apps/api && railway up
cd apps/client && railway up
cd apps/admin && railway up
```

## 🚨 **Common Issues**

### **Issue: Build Failed**
```
Error: Cannot find module '@rentalshop/ui'
```
**Solution:** Railway config is correct. Check that packages are built:
```bash
yarn build
git add packages/*/dist
git commit -m "build: rebuild packages"
git push
```

### **Issue: Database Connection Failed**
```
Error: Can't reach database server
```
**Solution:**
1. Verify `DATABASE_URL` uses Railway reference: `${{Postgres.DATABASE_URL}}`
2. Restart API service in Railway dashboard
3. Check database is running in Railway

### **Issue: CORS Error**
```
CORS policy blocked
```
**Solution:**
1. Update `CORS_ORIGINS` in API env vars (NO SPACES):
   ```
   https://your-client.railway.app,https://your-admin.railway.app
   ```
2. Redeploy API service

## 🎓 **Tips for Monorepo Deployment**

✅ **DO:**
- Deploy each app separately (API, Client, Admin)
- Use Railway references for database URL (`${{Postgres.DATABASE_URL}}`)
- Set same `NEXTAUTH_SECRET` for all 3 apps
- Update CORS after deploying all apps
- Test each service individually

❌ **DON'T:**
- Try to deploy all apps as one service
- Hardcode database URLs
- Use different `NEXTAUTH_SECRET` values
- Skip environment variables
- Deploy without testing locally first

## 📞 **Support**

Need help with deployment?
1. Check [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md) for detailed guide
2. Join Railway Discord: https://discord.gg/railway
3. Check Railway documentation: https://docs.railway.app

## 🎉 **Expected Result**

After successful deployment, you'll have:

```
✅ PostgreSQL Database: Railway internal URL
✅ API Service:          https://your-api.railway.app
✅ Client Service:       https://your-client.railway.app
✅ Admin Service:        https://your-admin.railway.app

Total Cost: $5-20/month (all included)
```

**Test with:**
- Login: `admin@rentalshop.com` / `admin123`
- All features should work identically to local dev
- File uploads disabled by default (can be enabled later if needed)

---

**Ready to deploy? See [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md) for complete step-by-step guide!** 🚀

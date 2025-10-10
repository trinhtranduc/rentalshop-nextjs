# 🚀 Setup Guide - Railway Deployment

Complete setup guide for deploying the Rental Shop Next.js monorepo to Railway.

## 📋 **Stack Overview**

```
┌─────────────────────────────────────────┐
│  🚂 Platform:     Railway                │
│  🗄️  Database:     Railway PostgreSQL    │
│  🖼️  Images:       Cloudinary (Optional) │
└─────────────────────────────────────────┘
```

---

## 🚂 **PART 1: Railway Setup (15 minutes)**

### **Step 1: Create Railway Account**

1. **Sign up**: https://railway.app
2. **Choose a plan**:
   - **Developer** (Free trial - $5 credit)
   - **Hobby** ($5/month)
   - **Pro** ($20/month)

### **Step 2: Install Railway CLI**

```bash
npm install -g @railway/cli
```

### **Step 3: Login**

```bash
railway login
```

### **Step 4: Create Project**

```bash
# In your project directory
railway init

# Or create via Dashboard:
# https://railway.app/dashboard → "New Project"
```

### **Step 5: Add PostgreSQL Database**

```bash
# Via CLI
railway add postgresql

# Or via Dashboard:
# Click "New" → "Database" → "Add PostgreSQL"
```

**Railway will automatically provide DATABASE_URL:**
```
${{Postgres.DATABASE_URL}}
```

---

## 🖼️ **PART 2: Cloudinary Setup (Optional - 5 minutes)**

### **Step 1: Create Account**

1. **Sign up**: https://cloudinary.com
2. **Free tier**: 25GB storage, 25GB bandwidth

### **Step 2: Create Upload Preset**

1. Go to **Settings** → **Upload**
2. Click **Add upload preset**
3. **Signing Mode**: **Unsigned** (Important!)
4. **Preset name**: `rentalshop_preset`
5. **Folder**: `rentalshop`
6. **Save**

### **Step 3: Get Credentials**

Go to **Dashboard** and copy:
- **Cloud Name**
- **API Key**
- **API Secret**

---

## 🔧 **PART 3: Environment Variables Setup (10 minutes)**

### **Option A: Automated Setup (Recommended)**

```bash
# Run the setup script
./scripts/setup-railway-env.sh
```

This will:
1. ✅ Generate secure secrets
2. ✅ Set all environment variables
3. ✅ Push database schema
4. ✅ Seed initial data

### **Option B: Manual Setup**

See [RAILWAY_ENV_SETUP.md](./RAILWAY_ENV_SETUP.md) for detailed instructions.

**Quick Reference:**

```bash
# API Service
railway variables --set DATABASE_URL='${{Postgres.DATABASE_URL}}' --service apis
railway variables --set NODE_ENV=production --service apis
railway variables --set JWT_SECRET='$(openssl rand -hex 32)' --service apis
railway variables --set NEXTAUTH_SECRET='$(openssl rand -hex 32)' --service apis

# Admin Service
railway variables --set NODE_ENV=production --service admin
railway variables --set NEXT_PUBLIC_API_URL='https://your-api.railway.app' --service admin

# Client Service
railway variables --set NODE_ENV=production --service client
railway variables --set NEXT_PUBLIC_API_URL='https://your-api.railway.app' --service client
```

---

## 📊 **PART 4: Database Migration (5 minutes)**

### **Push Schema to Railway**

```bash
# Push Prisma schema
railway run --service apis npx prisma db push --accept-data-loss

# Generate Prisma client
railway run --service apis npx prisma generate
```

### **Seed Database**

```bash
# Seed with initial data
railway run --service apis yarn db:regenerate-system
```

This creates:
- ✅ 2 merchants
- ✅ 4 outlets
- ✅ 8 users
- ✅ 60 customers
- ✅ 60 products
- ✅ 120 orders

---

## 🚀 **PART 5: Deploy (5 minutes)**

### **Deploy to Railway**

```bash
# Push to GitHub (Railway auto-deploys)
git push

# Or deploy directly
railway up
```

### **Monitor Deployment**

```bash
# View logs
railway logs --service apis -f

# Check status
railway status
```

---

## ✅ **Verification**

### **1. Check Services**

Visit your Railway URLs:
- API: `https://apis-development.up.railway.app/api/health`
- Admin: `https://admin-development.up.railway.app`
- Client: `https://client-development.up.railway.app`

### **2. Test Login**

Login with default credentials:
- Super Admin: `admin@rentalshop.com` / `admin123`
- Merchant: `merchant1@example.com` / `merchant123`
- Outlet Admin: `admin.outlet1@example.com` / `admin123`

### **3. Test Features**

- ✅ Create product
- ✅ Create customer
- ✅ Create order
- ✅ Upload image (if Cloudinary configured)

---

## 🔍 **Troubleshooting**

### **Issue: Build fails**

**Solution:**
1. Check Dockerfile syntax
2. Verify dependencies in package.json
3. Check Railway build logs

### **Issue: Database connection fails**

**Solution:**
1. Verify DATABASE_URL is set
2. Check PostgreSQL service is running
3. Test connection with Prisma Studio

### **Issue: API returns 500 errors**

**Solution:**
1. Check Railway logs: `railway logs --service apis`
2. Verify environment variables are set
3. Check for missing dependencies

---

## 📚 **Additional Resources**

- **Full Deployment Guide**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Environment Setup**: [RAILWAY_ENV_SETUP.md](./RAILWAY_ENV_SETUP.md)
- **Railway Documentation**: https://docs.railway.app/
- **Prisma Railway Guide**: https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-railway

---

## 🎉 **Done!**

Your Rental Shop is now deployed on Railway! 🚀

**Total Time**: ~40 minutes
**Total Cost**: ~$5-20/month

**Next Steps:**
1. Configure custom domains (optional)
2. Set up monitoring and alerts
3. Train your team
4. Launch! 🎉

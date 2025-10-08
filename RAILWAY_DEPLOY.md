# 🚀 Railway Deployment Guide - Complete Setup

## 📋 **Prerequisites**

Trước khi deploy, đảm bảo:

- ✅ Railway account created (https://railway.app)
- ✅ GitHub repository pushed
- ✅ Cloudinary account setup (for image uploads)
- ✅ Local build successful (`yarn build`)

---

## 🎯 **Tại sao chọn Railway?**

### **Railway vs Vercel:**

| Tính năng | Railway | Vercel |
|-----------|---------|--------|
| **Frontend hosting** | ✅ Yes | ✅ Yes |
| **Backend API** | ✅ Full support | ⚠️ Serverless only |
| **Database built-in** | ✅ PostgreSQL included | ❌ Need external |
| **Persistent storage** | ✅ Volumes | ❌ Need external |
| **Websockets** | ✅ Supported | ❌ Limited |
| **Long-running jobs** | ✅ Supported | ❌ 10s timeout |
| **Chi phí** | **$5-20/tháng** | $45+/tháng |

### **✅ Lý do chọn Railway:**

1. **All-in-One**: Database + hosting + storage trong 1 nơi
2. **Full-stack**: Hỗ trợ cả frontend + backend phức tạp
3. **Tiết kiệm**: $5-20/tháng vs $45+/tháng (Vercel + Supabase)
4. **Dễ dàng**: Setup nhanh, không cần nhiều services
5. **Flexible**: Chạy bất kỳ code gì (Node.js, Python, Go, etc.)

---

## 📦 **Deployment Architecture**

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

**Chúng ta sẽ deploy:**
- 1 PostgreSQL database service
- 3 web services (API, Client, Admin)

---

## ⚡ **Quick Deploy (30 phút)**

### **Step 1: Tạo Railway Project (2 phút)**

1. **Đăng nhập Railway**: https://railway.app
2. **Click "New Project"**
3. **Choose "Deploy from GitHub repo"**
4. **Select repository**: `rentalshop-nextjs`
5. **Đặt tên project**: `rentalshop`

**Railway sẽ tự động detect monorepo!**

---

### **Step 2: Add PostgreSQL Database (1 phút)**

1. **Trong Railway project dashboard**
2. **Click "New" → "Database" → "Add PostgreSQL"**
3. **Railway tự động provision database**
4. **Copy DATABASE_URL** (sẽ dùng sau)

**✅ Database URL format:**
```
postgresql://postgres:password@containers-us-west-1.railway.app:5432/railway
```

---

### **Step 3: Deploy API Service (5 phút)**

1. **Click "New" → "GitHub Repo"**
2. **Select `rentalshop-nextjs`**
3. **Configure service:**

**Settings → General:**
- **Service Name**: `api`
- **Root Directory**: `apps/api`
- **Build Command**: `cd ../.. && yarn install && yarn build --filter=@rentalshop/api`
- **Start Command**: `cd apps/api && yarn start`

**Settings → Networking:**
- **Generate Domain** (click để tạo public URL)
- **Save URL**: `https://rentalshop-api.up.railway.app`

**Settings → Variables:**
Click "Add Variable" cho từng biến:

```bash
# Database (from Railway PostgreSQL service)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Authentication
JWT_SECRET=generate-with-openssl-rand-base64-32
JWT_EXPIRES_IN=1d
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=https://rentalshop-api.up.railway.app

# Cloudinary (your credentials)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
UPLOAD_PROVIDER=cloudinary
MAX_FILE_SIZE=10485760

# URLs (update sau khi deploy client/admin)
API_URL=https://rentalshop-api.up.railway.app
CLIENT_URL=https://rentalshop-client.up.railway.app
ADMIN_URL=https://rentalshop-admin.up.railway.app
CORS_ORIGINS=https://rentalshop-client.up.railway.app,https://rentalshop-admin.up.railway.app

# Environment
NODE_ENV=production
LOG_LEVEL=warn
HUSKY=0
CI=true
```

**Generate secrets:**
```bash
# Trên terminal local
openssl rand -base64 32  # Copy cho JWT_SECRET
openssl rand -base64 32  # Copy cho NEXTAUTH_SECRET
```

4. **Click "Deploy"**
5. **Chờ build complete** (~3-5 phút)

---

### **Step 4: Deploy Client Service (5 phút)**

1. **Click "New" → "GitHub Repo"**
2. **Select `rentalshop-nextjs`**
3. **Configure service:**

**Settings → General:**
- **Service Name**: `client`
- **Root Directory**: `apps/client`
- **Build Command**: `cd ../.. && yarn install && yarn build --filter=@rentalshop/client`
- **Start Command**: `cd apps/client && yarn start`

**Settings → Networking:**
- **Generate Domain**
- **Save URL**: `https://rentalshop-client.up.railway.app`

**Settings → Variables:**
```bash
NEXT_PUBLIC_API_URL=https://rentalshop-api.up.railway.app
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=rentalshop_products
NEXTAUTH_SECRET=same-as-api-service
NEXTAUTH_URL=https://rentalshop-client.up.railway.app
NODE_ENV=production
HUSKY=0
CI=true
```

4. **Click "Deploy"**

---

### **Step 5: Deploy Admin Service (5 phút)**

1. **Click "New" → "GitHub Repo"**
2. **Select `rentalshop-nextjs`**
3. **Configure service:**

**Settings → General:**
- **Service Name**: `admin`
- **Root Directory**: `apps/admin`
- **Build Command**: `cd ../.. && yarn install && yarn build --filter=@rentalshop/admin`
- **Start Command**: `cd apps/admin && yarn start`

**Settings → Networking:**
- **Generate Domain**
- **Save URL**: `https://rentalshop-admin.up.railway.app`

**Settings → Variables:**
```bash
NEXT_PUBLIC_API_URL=https://rentalshop-api.up.railway.app
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=rentalshop_products
NEXTAUTH_SECRET=same-as-api-service
NEXTAUTH_URL=https://rentalshop-admin.up.railway.app
NODE_ENV=production
HUSKY=0
CI=true
```

4. **Click "Deploy"**

---

### **Step 6: Run Database Migrations (3 phút)**

Sau khi API service deployed, chạy migrations:

**Option 1: Railway CLI (Recommended)**

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to project
railway link

# Select API service
railway service

# Run migrations
railway run npx prisma migrate deploy --schema=./prisma/schema.prisma

# Generate Prisma client
railway run npx prisma generate --schema=./prisma/schema.prisma
```

**Option 2: Railway Dashboard**

1. **API service → Settings → Deploy**
2. **Add Custom Start Command**:
```bash
npx prisma migrate deploy --schema=../../prisma/schema.prisma && npx prisma generate --schema=../../prisma/schema.prisma && cd apps/api && yarn start
```
3. **Redeploy service**

---

### **Step 7: Seed Database (Optional, 2 phút)**

```bash
# Using Railway CLI
railway run node scripts/regenerate-entire-system-2025.js
```

**Hoặc chạy local với Railway DATABASE_URL:**
```bash
# Copy DATABASE_URL từ Railway
export DATABASE_URL="postgresql://postgres:..."

# Run seed script
yarn db:regenerate-system
```

---

## ✅ **Step 8: Testing (5 phút)**

### **Test API Health**

```bash
curl https://rentalshop-api.up.railway.app/api/health
```

**Expected:** `{"status":"ok","timestamp":"..."}`

### **Test Login**

```bash
curl -X POST https://rentalshop-api.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rentalshop.com","password":"admin123"}'
```

**Expected:** `{"success":true,"token":"...","user":{...}}`

### **Test Client App**

1. **Open**: https://rentalshop-client.up.railway.app
2. **Login**: `admin@rentalshop.com` / `admin123`
3. **Check**: Dashboard loads, products visible

### **Test Admin Dashboard**

1. **Open**: https://rentalshop-admin.up.railway.app
2. **Login**: Same credentials
3. **Test**: Create product, upload image

---

## 🎯 **Deployment Checklist**

### Pre-Deployment
- [x] Railway account created
- [x] GitHub repo pushed
- [x] Cloudinary setup completed
- [x] Secrets generated (`openssl rand -base64 32`)

### Deployment
- [ ] PostgreSQL database added
- [ ] API service deployed with env vars
- [ ] Client service deployed with env vars
- [ ] Admin service deployed with env vars
- [ ] Database migrations run
- [ ] Database seeded (optional)

### Testing
- [ ] API health check passed
- [ ] Login working
- [ ] Database connected
- [ ] Image upload working
- [ ] All 3 apps accessible

---

## 🚨 **Troubleshooting**

### **Issue: Build Failed**

```
Error: Cannot find module '@rentalshop/ui'
```

**Solution:**

Check Build Command includes monorepo root:
```bash
cd ../.. && yarn install && yarn build --filter=@rentalshop/api
```

### **Issue: Database Connection Failed**

```
Error: Can't reach database server
```

**Solution:**

1. **Check DATABASE_URL** in API service env vars
2. **Verify variable reference**: `${{Postgres.DATABASE_URL}}`
3. **Restart API service**

### **Issue: CORS Error**

```
CORS policy blocked
```

**Solution:**

1. **Update CORS_ORIGINS** in API env vars:
```bash
CORS_ORIGINS=https://rentalshop-client.up.railway.app,https://rentalshop-admin.up.railway.app
```
2. **No spaces** between URLs!
3. **Redeploy API service**

### **Issue: Prisma Client Not Generated**

```
Error: @prisma/client not initialized
```

**Solution:**

Add postinstall script in `apps/api/package.json`:
```json
{
  "scripts": {
    "postinstall": "cd ../.. && npx prisma generate --schema=./prisma/schema.prisma"
  }
}
```

Redeploy API service.

---

## 🔄 **Update Deployment**

### **Auto-Deploy (Recommended)**

Railway auto-deploys khi push code:

```bash
git add .
git commit -m "feat: new feature"
git push origin main
```

**Railway sẽ tự động:**
1. Detect changes
2. Rebuild affected services
3. Deploy new version
4. Zero-downtime deployment

### **Manual Deploy**

**Railway Dashboard:**
1. **Select service** (API/Client/Admin)
2. **Click "Deploy"**
3. **Chọn "Redeploy"**

**Railway CLI:**
```bash
# Redeploy specific service
railway service  # Select service
railway up       # Deploy
```

---

## 💰 **Cost Estimation**

### **Hobby Plan ($5/month)**

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

### **Pro Plan ($20/month)**

**Included:**
- $20 credit/month
- Priority support
- Custom domains
- Higher limits

---

## 🌐 **Custom Domain (Optional)**

### **Add Custom Domain**

1. **Railway Dashboard → Service → Settings → Networking**
2. **Click "Add Custom Domain"**
3. **Enter domain**:
   - API: `api.yourdomain.com`
   - Client: `yourdomain.com`
   - Admin: `admin.yourdomain.com`

4. **Update DNS** records:
```
Type: CNAME
Name: api (or @ for root)
Value: your-service.up.railway.app
```

5. **Update environment variables** with new domains
6. **Redeploy all services**

---

## 📊 **Monitoring**

### **Railway Dashboard**

- **Metrics**: CPU, Memory, Network usage
- **Logs**: Real-time application logs
- **Deployments**: History and status
- **Database**: Connection stats, size

### **View Logs**

**Railway Dashboard:**
1. **Click service** (API/Client/Admin)
2. **Click "Logs" tab**
3. **Real-time logs** displayed

**Railway CLI:**
```bash
railway logs  # View logs
railway logs -f  # Follow logs (live)
```

---

## 📚 **Useful Railway CLI Commands**

```bash
# Install CLI
npm i -g @railway/cli

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
railway logs -f  # Follow

# View variables
railway variables

# Run command in Railway environment
railway run <command>

# Open dashboard
railway open

# Deploy
railway up
```

---

## 🎉 **Success!**

Your RentalShop is now deployed on Railway!

```
✅ Database: PostgreSQL on Railway
✅ API:      https://rentalshop-api.up.railway.app
✅ Client:   https://rentalshop-client.up.railway.app
✅ Admin:    https://rentalshop-admin.up.railway.app
```

**Stack:**
- ☁️  Hosting: Railway ($5-20/month)
- 🗄️  Database: Railway PostgreSQL (included)
- 🖼️  Images: Cloudinary (25GB free)

**Total Cost:** ~$5-20/month 💰

**Default Login:**
- Email: `admin@rentalshop.com`
- Password: `admin123`

---

## 💡 **Post-Deployment Tips**

### **Enable Auto-Deploy**

Railway auto-deploys by default. Để disable:
1. **Service → Settings → Deploy**
2. **Toggle "Watch Paths"**

### **Monitor Usage**

**Railway Dashboard → Usage:**
- CPU/Memory usage
- Network bandwidth
- Database size
- Monthly credit usage

**Set up alerts** khi sắp hết credit.

### **Backup Database**

```bash
# Export database
railway run pg_dump $DATABASE_URL > backup.sql

# Import database
railway run psql $DATABASE_URL < backup.sql
```

### **Environment-Specific Deployments**

**Create staging environment:**
1. **Duplicate project**
2. **Name it "rentalshop-staging"**
3. **Deploy from `dev` branch**
4. **Use separate database**

---

## 🆚 **Railway vs Vercel Comparison**

| Feature | Railway | Vercel |
|---------|---------|--------|
| **Setup time** | 30 phút | 30 phút |
| **Database** | ✅ Built-in | ❌ External ($25/mo) |
| **Storage** | ✅ Volumes | ❌ External |
| **Backend** | ✅ Full support | ⚠️ Serverless only |
| **Websockets** | ✅ Yes | ❌ No |
| **Cost** | **$5-20/mo** | $45+/mo |
| **Complexity** | ⭐⭐ Easy | ⭐⭐⭐ Medium |

**Kết luận: Railway = Tốt hơn cho full-stack apps!** 🎯

---

## 📞 **Support**

- **Railway Discord**: https://discord.gg/railway
- **Railway Docs**: https://docs.railway.app
- **Railway Status**: https://status.railway.app

---

**Congratulations! You're live on Railway! 🚀**


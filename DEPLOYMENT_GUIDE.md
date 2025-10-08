# 🚀 Deployment Guide - Deploy to Railway

## 📋 **Prerequisites**

Before deploying, make sure you have:

- ✅ Railway account created (https://railway.app)
- ✅ GitHub repository pushed
- ✅ Cloudinary account setup with upload preset (Unsigned mode!)
- ✅ Local build successful (`yarn build`)

## 🎯 **Recommended: Railway Deployment**

**For full deployment guide, see [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md)**

### **Why Railway?**

| Feature | Railway | Vercel |
|---------|---------|--------|
| **Database** | ✅ Built-in PostgreSQL | ❌ Need external ($25/mo) |
| **Backend** | ✅ Full support | ⚠️ Serverless only |
| **Storage** | ✅ Persistent volumes | ❌ Need external |
| **Cost** | **$5-20/month** | $45+/month |

**Railway is better for full-stack apps with database!** 🚀

---

## 🚂 **Quick Railway Deploy**

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. Create project
railway init

# 4. Add PostgreSQL
railway add postgresql

# 5. Deploy services (Railway auto-detects monorepo!)
# Just push to GitHub and Railway will deploy automatically
```

**See [RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md) for detailed step-by-step guide.**

---

## ⚠️ **Legacy: Vercel Deployment (Not Recommended)**

**Note: Vercel deployment still works but requires external database (Supabase) and costs more.**

### **Prerequisites for Vercel:**

- ✅ Supabase database created & migrated
- ✅ Cloudinary account setup
- ✅ Vercel CLI installed

## 🎯 **Expert Strategy (Simplified)**

### **🔍 Tại Sao Deploy 3 Projects Riêng Biệt?**

**Vercel Monorepo Deployment Options:**

| Approach | Complexity | Flexibility | Recommended |
|----------|-----------|-------------|-------------|
| **Separate Projects** (đang dùng) | Medium | ⭐⭐⭐⭐⭐ | ✅ **YES** |
| **Single Monorepo Project** | High | ⭐⭐ | ❌ No |

### **💡 Lý Do Chọn Separate Projects:**

**✅ Advantages:**
1. **Independent Domains:**
   - `api.yourdomain.com`
   - `yourdomain.com` (client)
   - `admin.yourdomain.com`

2. **Isolated Deployments:**
   - Update API không ảnh hưởng Client/Admin
   - Rollback từng app riêng biệt
   - Deploy schedule linh hoạt

3. **Better Scaling:**
   - Scale API độc lập (nhiều traffic hơn)
   - Client/Admin ít traffic hơn
   - Optimize từng app riêng

4. **Security:**
   - API có env vars riêng (DATABASE_URL, secrets)
   - Client/Admin chỉ có public env vars
   - Isolated failures

5. **Team Workflow:**
   - Backend team deploy API
   - Frontend team deploy Client/Admin
   - Không conflict

**❌ Tradeoff:**
- Phải deploy 3 lần (nhưng có script `deploy-all.sh`)
- Set env vars 3 lần (nhưng copy-paste nhanh)

### **🏢 Industry Examples:**

- **Netflix:** 40+ separate Vercel projects cho monorepo
- **Uber:** Separate projects cho web, admin, driver apps
- **Airbnb:** Separate deployments cho mỗi app
- **Vercel Official:** Khuyên dùng separate projects

### **📦 Monorepo Deployment Approach:**

```
┌─────────────────────────────────────────┐
│  LOCAL: yarn dev:all (không đổi)        │
│  ├── packages/*/src/ (source code)      │
│  ├── Hot reload ✅                       │
│  └── SQLite database ✅                  │
│                                          │
│  PRODUCTION: 3 Vercel Projects          │
│  ├── rentalshop-api ✅                   │
│  ├── rentalshop-client ✅                │
│  ├── rentalshop-admin ✅                 │
│  │                                       │
│  ├── packages/*/dist/ (pre-built) ✅     │
│  ├── Apps build only ✅                  │
│  └── PostgreSQL (auto-convert) ✅        │
└─────────────────────────────────────────┘
```

**Why This Works:**
- ✅ **Local dev không ảnh hưởng** - `yarn dev:all` vẫn dùng source code
- ✅ **Vercel đơn giản** - chỉ build Next.js apps, không build packages
- ✅ **Nhanh & ổn định** - no npm/rollup errors
- ✅ **Industry standard** - Netflix, Airbnb dùng approach này
- ✅ **Scalable** - easy to add more apps later

## 🗄️ **Database Strategy**

**Local Development:**
- ✅ SQLite (`file:./prisma/dev.db`)
- ✅ `yarn dev:all` dùng SQLite
- ✅ Fast, no setup needed

**Production (Vercel):**
- ✅ PostgreSQL (Supabase)
- ✅ Auto-converted trong build command
- ✅ Scalable, production-ready

**Auto-Conversion:**
- Build command tự động convert schema: `sqlite` → `postgresql`
- Generate Prisma Client cho PostgreSQL
- Build Next.js apps
- Deploy!

---

## 📦 **Step 0: Commit Pre-Built Packages (1 lần)**

**Note:** Packages đã được build (`yarn build`) và staged. Chỉ cần commit:

```bash
cd /Users/mac/Source-Code/rentalshop-nextjs

# Commit packages/dist vào Git
git add .
git commit -m "feat: add pre-built packages for Vercel deployment"
git push origin dev
```

**Giải thích:**
- Packages `dist/` cần có trong Git để Vercel deploy
- Không ảnh hưởng local development
- Next.js vẫn dùng source code khi dev

---

## ⚡ **Quick Deploy (30 phút)**

### Step 1: Deploy API Server (5 phút)

```bash
cd /Users/mac/Source-Code/rentalshop-nextjs/apps/api
vercel --prod
```

**When prompted:**
```
? Set up and deploy? → Y
? Which scope? → trinhduc20-gmailcoms-projects
? Link to existing project? → N
? Project name? → rentalshop-api
? In which directory? → ./
? Want to modify settings? → N
? Connect Git repository? → Y (auto-deploy on push)
```

**Save the deployment URL!**
```
✅ Deployed: https://rentalshop-api.vercel.app
```

---

### Step 2: Deploy Client App (5 phút)

```bash
cd /Users/mac/Source-Code/rentalshop-nextjs/apps/client
vercel --prod
```

**When prompted:**
```
? Set up and deploy? → Y
? Which scope? → trinhduc20-gmailcoms-projects
? Link to existing project? → N
? Project name? → rentalshop-client
? In which directory? → ./
? Connect Git? → Y
```

**Save the deployment URL!**
```
✅ Deployed: https://rentalshop-client.vercel.app
```

---

### Step 3: Deploy Admin Dashboard (5 phút)

```bash
cd /Users/mac/Source-Code/rentalshop-nextjs/apps/admin
vercel --prod
```

**When prompted:**
```
? Set up and deploy? → Y
? Which scope? → trinhduc20-gmailcoms-projects  
? Link to existing project? → N
? Project name? → rentalshop-admin
? In which directory? → ./
? Connect Git? → Y
```

**Save the deployment URL!**
```
✅ Deployed: https://rentalshop-admin.vercel.app
```

---

## ⚙️ **Step 4: Set Environment Variables (10 phút)**

**Important:** Set environment variables cho **TẤT CẢ 3 projects** trước khi redeploy!

### API Server (rentalshop-api)

**Vercel Dashboard → rentalshop-api → Settings → Environment Variables**

Click **"Add"** cho từng biến (chọn **Production**):

   ```bash
# Database (Supabase)
DATABASE_URL
postgresql://postgres:Anhiuem123@@db.yqbjnaitiptdagpjsndx.supabase.co:5432/postgres

# Authentication (Generated secrets)
JWT_SECRET
c078b5563dacc05139fc46d09337e42a5e99af2d95cd9a2a555afc0e66c01d62

JWT_EXPIRES_IN
1d

NEXTAUTH_SECRET
45264662a1976492ba7bdc929bf0b07ffd4066a37417f0c5205dcad85b09f599

NEXTAUTH_URL
https://rentalshop-api.vercel.app

# Cloudinary (Your credentials)
CLOUDINARY_CLOUD_NAME
dewd6fwn0

CLOUDINARY_API_KEY
895686533155893

CLOUDINARY_API_SECRET
PSHE8NBY0R1c2Yl8oQDAdbEmN9M

UPLOAD_PROVIDER
cloudinary

MAX_FILE_SIZE
10485760

# URLs (Update sau khi deploy client/admin)
API_URL
https://rentalshop-api.vercel.app

CLIENT_URL
https://rentalshop-client.vercel.app

ADMIN_URL
https://rentalshop-admin.vercel.app

CORS_ORIGINS
https://rentalshop-client.vercel.app,https://rentalshop-admin.vercel.app

# Environment
NODE_ENV
production

LOG_LEVEL
warn
```

### Client App (rentalshop-client)

**Vercel Dashboard → rentalshop-client → Settings → Environment Variables**

```bash
NEXT_PUBLIC_API_URL
https://rentalshop-api.vercel.app

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
dewd6fwn0

NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
rentalshop_products

NEXTAUTH_SECRET
45264662a1976492ba7bdc929bf0b07ffd4066a37417f0c5205dcad85b09f599

NEXTAUTH_URL
https://rentalshop-client.vercel.app

NODE_ENV
production
```

### Admin Dashboard (rentalshop-admin)

**Vercel Dashboard → rentalshop-admin → Settings → Environment Variables**

```bash
NEXT_PUBLIC_API_URL
https://rentalshop-api.vercel.app

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
dewd6fwn0

NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET
rentalshop_products

NEXTAUTH_SECRET
45264662a1976492ba7bdc929bf0b07ffd4066a37417f0c5205dcad85b09f599

NEXTAUTH_URL
https://rentalshop-admin.vercel.app

NODE_ENV
production
```

**⚠️ Lưu Ý:**
- Tất cả 3 apps phải dùng **CÙNG** `NEXTAUTH_SECRET`
- `CORS_ORIGINS` KHÔNG CÓ SPACES: `url1.com,url2.com`
- Cloudinary preset phải **Unsigned** mode!

---

## 🔄 **Step 5: Redeploy with Environment Variables (3 phút)**

Sau khi set xong **TẤT CẢ** environment variables cho cả 3 projects, redeploy:

```bash
# API
cd /Users/mac/Source-Code/rentalshop-nextjs/apps/api
vercel --prod --force

# Client
cd /Users/mac/Source-Code/rentalshop-nextjs/apps/client
vercel --prod --force

# Admin
cd /Users/mac/Source-Code/rentalshop-nextjs/apps/admin
vercel --prod --force
```

**Hoặc dùng script tự động để redeploy cả 3:**
```bash
cd /Users/mac/Source-Code/rentalshop-nextjs

# Redeploy all 3 apps
cd apps/api && vercel --prod --force && cd ../client && vercel --prod --force && cd ../admin && vercel --prod --force
```

**⏱️ Time:**
- Manual redeploy cả 3: ~2-3 phút
- Automated script: ~2 phút

---

## ✅ **Step 6: Testing (5 phút)**

### Test API Health

```bash
curl https://rentalshop-api.vercel.app/api/health
```

**Expected:** `{"status":"ok","timestamp":"..."}`

### Test Login API

```bash
curl -X POST https://rentalshop-api.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rentalshop.com","password":"admin123"}'
```

**Expected:** `{"success":true,"token":"...","user":{...}}`

### Test Client App

1. **Open:** https://rentalshop-client.vercel.app
2. **Login:**
   - Email: `admin@rentalshop.com`
   - Password: `admin123`
3. **Check:** Dashboard loads, data displays correctly
4. **Test:** Navigate to Products, Orders, Customers

### Test Admin Dashboard

1. **Open:** https://rentalshop-admin.vercel.app
2. **Login:** Same credentials
3. **Test features:**
   - ✅ View products
   - ✅ View orders
   - ✅ Upload image (test Cloudinary)
   - ✅ Create new order
   - ✅ View analytics

### Test Image Upload

1. Admin → Products → Add Product
2. Upload image
3. Check: Cloudinary Media Library → `rentalshop/products/`
4. Verify: Image URL works

---

## 🎯 **Deployment Checklist**

### Pre-Deployment
- [x] Local build successful (`yarn build`)
- [x] Packages pre-built and committed
- [x] Supabase database migrated
- [x] Cloudinary upload preset created (Unsigned!)
- [x] Secrets generated
- [x] Vercel CLI installed

### Deployment
- [ ] API deployed successfully
- [ ] Client deployed successfully
- [ ] Admin deployed successfully
- [ ] All environment variables set (cả 3 projects!)
- [ ] Apps redeployed with env vars

### Testing
- [ ] API health check passed (`curl .../api/health`)
- [ ] Login working (admin@rentalshop.com)
- [ ] Database connected (data hiển thị)
- [ ] Image upload working (Cloudinary)
- [ ] No console errors (F12)
- [ ] Mobile responsive
- [ ] All features working

---

## 🚨 **Troubleshooting**

### Issue: Prisma Client Not Found

```
Error: @prisma/client did not initialize
```

**Solution:**

Add to `apps/api/package.json`:
```json
{
  "scripts": {
    "postinstall": "prisma generate"
  }
}
```

Redeploy: `vercel --prod --force`

### Issue: Database Connection Failed

```
Error: Can't reach database server
```

**Solution:**
1. Verify `DATABASE_URL` in Vercel env vars
2. Check password is correct
3. Test connection locally:
```bash
   DATABASE_URL="postgresql://..." npx prisma db execute --stdin <<< "SELECT 1"
   ```

### Issue: CORS Error

```
CORS policy blocked
```

**Solution:**
1. Check `CORS_ORIGINS` in API env vars
2. Format must be: `https://url1.com,https://url2.com` (NO SPACES!)
3. Redeploy API: `vercel --prod --force`

### Issue: Environment Variables Not Loaded

```
JWT_SECRET is undefined
```

**Solution:**
1. Verify variables are set: Vercel Dashboard → Settings → Environment Variables
2. Check environment: **Production** (not Preview or Development)
3. Redeploy: `vercel --prod --force`

---

## 🔄 **Update Deployment**

### Deploy New Changes

```bash
# Make changes to code
git add .
git commit -m "feat: new feature"

# Deploy
cd apps/api && vercel --prod
cd apps/client && vercel --prod
cd apps/admin && vercel --prod
```

### Rollback

If something goes wrong:

```bash
# Vercel Dashboard → Project → Deployments
# → Find previous working deployment
# → Click "..." → Promote to Production
```

---

## 🌐 **Custom Domain (Optional)**

### Add Custom Domain

1. **Buy domain** (Namecheap, GoDaddy, etc.)
2. **Vercel Dashboard** → Project → Settings → Domains
3. **Add domain**:
   - API: `api.yourdomain.com`
   - Client: `yourdomain.com`
   - Admin: `admin.yourdomain.com`
4. **Update DNS** records (Vercel will guide you)
5. **Update environment variables** with new domains
6. **Redeploy** all apps

---

## 📊 **Monitoring**

### Vercel Dashboard

- **Analytics**: Page views, performance
- **Logs**: Function logs, errors
- **Deployments**: History, status

### Supabase Dashboard

- **Database**: Size, connections
- **Tables**: Data viewer
- **Logs**: Query logs

### Cloudinary Dashboard

- **Usage**: Storage, bandwidth
- **Media Library**: All images
- **Transformations**: Image optimizations

---

## 📚 **Useful Commands**

```bash
# View Vercel env vars
vercel env ls

# Pull env vars to local
vercel env pull .env.vercel.local

# View deployment logs
vercel logs <deployment-url>

# Force redeploy
vercel --prod --force

# Remove deployment
vercel remove <deployment-name>
```

---

## 🎉 **Success!**

Your RentalShop is now deployed and running on:

```
✅ API:    https://rentalshop-api.vercel.app
✅ Client: https://rentalshop-client.vercel.app
✅ Admin:  https://rentalshop-admin.vercel.app
```

**Stack:**
- ☁️  Hosting: Vercel (100GB bandwidth)
- 🗄️  Database: Supabase PostgreSQL (500MB)
- 🖼️  Images: Cloudinary (25GB storage)

**Total Cost:** $0/month 💰

**Default Login:**
- Email: `admin@rentalshop.com`
- Password: `admin123`

**Update Passwords:**
```bash
# Sau khi login lần đầu, đổi password ngay!
# Settings → Change Password
```

---

## 💡 **Post-Deployment Tips**

### Update CORS After All Apps Deployed

Sau khi deploy cả 3 apps, update `CORS_ORIGINS` trong API:

```bash
# Vercel Dashboard → rentalshop-api → Settings → Environment Variables
# Update CORS_ORIGINS với URLs thực tế:

CORS_ORIGINS=https://rentalshop-client.vercel.app,https://rentalshop-admin.vercel.app
```

Redeploy API:
```bash
cd apps/api && vercel --prod --force
```

### Monitor Usage

**Supabase:**
- Database: 500MB limit
- Check: https://app.supabase.com → Database size

**Cloudinary:**
- Storage: 25GB limit
- Bandwidth: 25GB/month
- Check: https://console.cloudinary.com → Usage

**Vercel:**
- Bandwidth: 100GB/month
- Functions: Monitor execution time
- Check: https://vercel.com/dashboard → Analytics

---

## 📞 **Support**

- **Vercel Discord**: https://vercel.com/discord
- **Supabase Discord**: https://discord.supabase.com
- **Cloudinary Community**: https://community.cloudinary.com

---

**Congratulations! You're live! 🎊**

---

## ❓ **FAQ - Deployment Strategy**

### Q: Tại sao phải deploy 3 projects riêng biệt?

**A:** Đây là **best practice** cho production apps! 

**Benefits:**
- ✅ Independent domains (api.domain.com, domain.com, admin.domain.com)
- ✅ Isolated deployments (update API không ảnh hưởng Frontend)
- ✅ Better scaling (scale API riêng khi cần)
- ✅ Security (API env vars isolated)
- ✅ Team workflow (backend/frontend deploy độc lập)

**Tradeoff:**
- Deploy 3 lần (có script `deploy-all.sh` giúp)
- Set env vars 3 lần (copy-paste nhanh)

### Q: Có cách deploy 1 lần cho cả 3 apps không?

**A:** Có, nhưng **KHÔNG khuyên dùng** cho production!

**Lý do:**
- ❌ Phức tạp hơn (config routing, rewrites)
- ❌ Không linh hoạt (phải dùng 1 domain)
- ❌ Khó scale (không thể scale riêng API)
- ❌ Khó debug (errors mixed together)

**Kết luận:** Separate projects tốt hơn, đặc biệt khi app lớn lên!

### Q: Local dev (yarn dev:all) vẫn hoạt động không?

**A:** **CÓ! 100% hoạt động bình thường!**

Local dev:
- Dùng: `packages/*/src/` (source code)
- Build: On-the-fly transpile
- Database: SQLite
- Hot reload: Instant

Production:
- Dùng: `packages/*/dist/` (pre-built)
- Build: 1 lần
- Database: PostgreSQL
- Hot reload: N/A (production)

**Không ảnh hưởng nhau!** ✅

### Q: Khi nào cần rebuild packages?

**A:** Khi thay đổi code trong `packages/*/src/`:

```bash
# Rebuild packages
yarn build

# Commit
git add packages/*/dist
git commit -m "feat: update packages"
git push

# Vercel auto-deploy (nếu connect Git)
# Hoặc manual: vercel --prod --force
```

**Lưu ý:** Không cần rebuild nếu chỉ đổi code trong `apps/`

### Q: Script deploy-all.sh có an toàn không?

**A:** **CÓ! Hoàn toàn an toàn!**

Script chỉ:
- ✅ Run `vercel --prod` cho từng app
- ✅ Show env vars cần set
- ✅ Không tự động set secrets (manual để an toàn)
- ✅ Không delete/modify code

Bạn vẫn control từng bước!

---

## 🎓 **Best Practices Summary**

### Do's ✅
- ✅ Deploy 3 projects riêng biệt
- ✅ Commit pre-built packages/dist
- ✅ Use same NEXTAUTH_SECRET cho 3 apps
- ✅ Connect Git for auto-deploy
- ✅ Monitor usage (Supabase, Cloudinary, Vercel)
- ✅ Test thoroughly after deployment

### Don'ts ❌
- ❌ Deploy từ single project (phức tạp)
- ❌ Skip setting environment variables
- ❌ Dùng weak secrets (phải 32+ chars)
- ❌ Commit secrets vào Git (.env.local)
- ❌ Skip testing sau deployment
- ❌ Forget to update CORS after deploy

---

**Tóm tắt:** Deploy 3 projects riêng = **ĐÚNG & TỐT NHẤT!** ✅

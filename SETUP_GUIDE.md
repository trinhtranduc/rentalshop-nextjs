# 🚀 Setup Guide - Supabase + Cloudinary + Vercel

## 📋 **Stack Overview**

```
┌─────────────────────────────────────────┐
│     100% FREE DEPLOYMENT STACK          │
├─────────────────────────────────────────┤
│  ☁️  Hosting:      Vercel              │
│  🗄️  Database:     Supabase PostgreSQL │
│  🖼️  Images:       Cloudinary          │
│  💰 Total Cost:    $0/month            │
└─────────────────────────────────────────┘
```

---

## 🗄️ **PART 1: Supabase Setup (10 phút)**

### Step 1: Create Account & Project

1. **Sign up**: https://supabase.com
2. **Create Project**:
   ```
   Name: rentalshop-production
   Password: <create-strong-password>
   Region: Southeast Asia (Singapore)
   Plan: Free
   ```
3. **Wait** 2-3 phút để project khởi tạo

### Step 2: Get Connection String

1. **Settings** → **Database** → **Connection string**
2. Tab **"URI"** (not Session mode)
3. Copy connection string:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres
   ```
4. **Replace** `[YOUR-PASSWORD]` với password bạn tạo ở Step 1

### Step 3: Migrate Database to Supabase

**Working directory:** `/Users/mac/Source-Code/rentalshop-nextjs`

**⚠️ Chiến Lược:**
- **Local**: SQLite (fast, easy development)
- **Production (Vercel)**: PostgreSQL (auto-convert khi deploy)
- **Không cần** update `prisma/schema.prisma` manually!

```bash
# Navigate to project root
cd /Users/mac/Source-Code/rentalshop-nextjs

# Set DATABASE_URL
export DATABASE_URL="postgresql://postgres:Anhiuem123@@db.yqbjnaitiptdagpjsndx.supabase.co:5432/postgres"

# Temporary: Convert schema to PostgreSQL
sed -i.bak 's/provider = "sqlite"/provider = "postgresql"/g' prisma/schema.prisma

# Generate Prisma Client
npx prisma generate

# Push schema to Supabase
npx prisma db push

# Seed production data
yarn db:regenerate-system

# Revert schema back to SQLite (for local development)
mv prisma/schema.prisma.bak prisma/schema.prisma

# Regenerate Prisma Client for SQLite
npx prisma generate
```

### Step 4: Verify

**Supabase Dashboard**:
1. Go to https://app.supabase.com
2. Select your project
3. Click **Table Editor**
4. Check tables: `User`, `Product`, `Order`, `Customer`, etc.
5. Verify data exists (should have users, products, etc.)

**✅ Supabase Setup Complete!**

**📝 Important:**
- Your local `prisma/schema.prisma` is back to **SQLite** (for local development)
- Vercel will automatically convert to **PostgreSQL** when deploying
- You don't need to manually update schema!

---

## 🖼️ **PART 2: Cloudinary Setup (5 phút)**

**ℹ️ Note:** Project đã tích hợp sẵn Cloudinary! Bạn chỉ cần:
1. Tạo account Cloudinary
2. Lấy credentials
3. Set environment variables (khi deploy)

**KHÔNG CẦN:**
- ❌ Install thêm packages (đã có `cloudinary` package)
- ❌ Update code (upload logic đã sẵn trong `packages/utils`)
- ❌ Tạo config files (đã có)

---

### Step 1: Create Account

1. **Sign up**: https://cloudinary.com/users/register_free
2. Fill in:
   ```
   Email: your-email@gmail.com
   Cloud Name: <unique-name> (e.g., rentalshop-vn)
   ```
3. **Verify email**

### Step 2: Get Credentials

1. **Dashboard** → Copy credentials:
   ```
   Cloud Name: dewd6fwn0
   API Key: 895686533155893
   API Secret: PSHE8NBY0R1c2Yl8oQDAdbEmN9M
   ```

**⚠️ IMPORTANT:** Đây là credentials THẬT của bạn! Giữ bí mật!

### Step 3: Create Upload Preset (QUAN TRỌNG!)

Upload preset cho phép frontend upload ảnh trực tiếp lên Cloudinary mà không cần qua backend.

#### **Cách Tạo Upload Preset:**

1. **Vào Cloudinary Dashboard**: https://console.cloudinary.com
2. Click **Settings** (icon bánh răng ⚙️ góc trên bên trái)
3. Trong menu bên trái, click **Upload**
4. Scroll xuống section **"Upload presets"**
5. Click **"Add upload preset"**

#### **Configure Preset (CHI TIẾT):**

**🔴 BẮT BUỘC - Signing Mode:**
```
Signing Mode: Unsigned ← PHẢI CHỌN "Unsigned"!
```
⚠️ **Nếu để "Signed" sẽ bị lỗi:** `Upload preset must be whitelisted for unsigned uploads`

**📝 Basic Settings:**
```
Preset name: rentalshop_products
Folder: rentalshop/products
```

**🔧 Advanced Settings (Optional):**
```
Use filename: No (auto-generate unique names)
Unique filename: Yes (tránh conflict)
Overwrite: No (giữ cả 2 files nếu trùng)
```

**6. Click "Save" ở góc trên bên phải**

---

#### **🚨 TROUBLESHOOTING: Nếu Vẫn Bị Lỗi**

**Lỗi:** `Upload preset must be whitelisted for unsigned uploads`

**Nguyên nhân:** Preset đã tạo nhưng vẫn ở "Signed" mode

**Giải pháp:**

**Option A: Edit Preset Đã Tạo**
1. Settings → Upload → Upload presets
2. Tìm preset `rentalshop_products`
3. Click vào preset name để edit
4. **CHỦ ĐỘNG THAY ĐỔI:**
   - Tìm dropdown **"Signing Mode"**
   - Chọn **"Unsigned"** (KHÔNG phải "Signed")
5. Click **"Save"**

**Option B: Xóa & Tạo Lại**
1. Settings → Upload → Upload presets
2. Tìm preset `rentalshop_products`
3. Click icon "🗑️ Delete" → Confirm
4. Tạo lại preset mới:
   - Preset name: `rentalshop_products`
   - **Signing Mode: Unsigned** ← Chọn ngay từ đầu!
   - Folder: `rentalshop/products`
5. Save

**Option C: Tạo Preset Khác**
Nếu không muốn xóa, tạo preset mới:
```
Preset name: rentalshop_unsigned
Signing mode: Unsigned
Folder: rentalshop/products
```

Sau đó update test command:
```bash
curl -X POST "https://api.cloudinary.com/v1_1/dewd6fwn0/image/upload" \
  -F "file=@test.jpeg" \
  -F "upload_preset=rentalshop_unsigned"
```

---

**Giải thích:**
- **Unsigned mode**: Frontend có thể upload trực tiếp mà không cần API key
- **Signed mode**: Chỉ backend mới upload được (cần signature)
- **Folder**: Tổ chức ảnh theo danh mục (products, avatars, etc.)
- **Unique filename**: Tránh ảnh bị ghi đè

### Step 4: Test Upload (Optional)

Test với cloud name của bạn:

```bash
curl -X POST "https://api.cloudinary.com/v1_1/dewd6fwn0/image/upload" \
  -F "file=@test.jpg" \
  -F "upload_preset=rentalshop_products"
```

**Expected response:** 
```json
{
  "public_id": "rentalshop/products/abc123",
  "secure_url": "https://res.cloudinary.com/dewd6fwn0/image/upload/v1234567890/rentalshop/products/abc123.jpg",
  "width": 1920,
  "height": 1080
}
```

---

### ✅ **Files Đã Sẵn Sàng Trong Project**

**Upload code đã có tại:**
- `/Users/mac/Source-Code/rentalshop-nextjs/packages/utils/src/api/upload.ts`
- Frontend sẽ tự động dùng code này khi upload ảnh

**Không cần làm gì thêm!** Chỉ cần:
1. ✅ Set environment variables khi deploy (DEPLOYMENT_GUIDE.md)
2. ✅ Test upload trong Admin dashboard sau khi deploy

**✅ Cloudinary Setup Complete!**

---

## ⚡ **PART 3: Vercel Setup (10 phút)**

### Step 1: Install CLI & Login

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login
```

### Step 2: Test Build

**Working directory:** `/Users/mac/Source-Code/rentalshop-nextjs`

```bash
# Navigate to project root
cd /Users/mac/Source-Code/rentalshop-nextjs

# Make sure everything builds
yarn build
```

### Step 3: Generate Secrets

```bash
# Generate JWT_SECRET
openssl rand -hex 32

# Generate NEXTAUTH_SECRET
openssl rand -hex 32
```

**Save these!** You'll need them for environment variables.

**✅ Vercel Setup Complete!**

---

## 🔐 **PART 4: Environment Variables Reference**

**Note:** These will be set in Vercel Dashboard later (DEPLOYMENT_GUIDE.md), but prepare them now.

You can save these locally in:
- `/Users/mac/Source-Code/rentalshop-nextjs/.env.local` (for local testing)
- **DO NOT commit** this file to Git!

### For API Server (rentalshop-api)

**Project:** `rentalshop-api` on Vercel Dashboard

```bash
# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres

# Authentication
JWT_SECRET=<your-generated-secret>
JWT_EXPIRES_IN=1d
NEXTAUTH_SECRET=<your-generated-secret>
NEXTAUTH_URL=https://rentalshop-api.vercel.app

# Cloudinary
CLOUDINARY_CLOUD_NAME=dxxxxxxxxx
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abc123def456...
UPLOAD_PROVIDER=cloudinary
MAX_FILE_SIZE=10485760

# URLs (update after deployment)
API_URL=https://rentalshop-api.vercel.app
CLIENT_URL=https://rentalshop-client.vercel.app
ADMIN_URL=https://rentalshop-admin.vercel.app
CORS_ORIGINS=https://rentalshop-client.vercel.app,https://rentalshop-admin.vercel.app

# Environment
NODE_ENV=production
LOG_LEVEL=warn
```

### For Client App (rentalshop-client)

**Project:** `rentalshop-client` on Vercel Dashboard

```bash
# API Connection
NEXT_PUBLIC_API_URL=https://rentalshop-api.vercel.app

# Cloudinary (for direct upload)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dxxxxxxxxx
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=rentalshop_products

# Authentication (same as API)
NEXTAUTH_SECRET=<same-as-api>
NEXTAUTH_URL=https://rentalshop-client.vercel.app

# Environment
NODE_ENV=production
```

### For Admin Dashboard (rentalshop-admin)

**Project:** `rentalshop-admin` on Vercel Dashboard

```bash
# API Connection
NEXT_PUBLIC_API_URL=https://rentalshop-api.vercel.app

# Cloudinary (for direct upload)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dxxxxxxxxx
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=rentalshop_products

# Authentication (same as API)
NEXTAUTH_SECRET=<same-as-api>
NEXTAUTH_URL=https://rentalshop-admin.vercel.app

# Environment
NODE_ENV=production
```

---

## 📊 **Free Tier Limits**

| Service | Free Tier |
|---------|-----------|
| **Supabase** | 500MB database, 50K users, daily backups |
| **Cloudinary** | 25GB storage, 25GB bandwidth/month |
| **Vercel** | 100GB bandwidth, unlimited deployments |

---

## 🚨 **Important Notes**

### Database
- ✅ Use direct connection (port 5432) for Vercel
- ✅ Update Prisma schema file: `/Users/mac/Source-Code/rentalshop-nextjs/prisma/schema.prisma`
- ✅ Change: `provider = "postgresql"` (from "sqlite")
- ✅ Monitor usage: 500MB limit

### Cloudinary
- ✅ Upload preset MUST be "Unsigned"
- ✅ Enable auto-optimization
- ✅ Monitor: 25GB bandwidth/month

### Environment Variables
- ✅ **JWT_SECRET** = **NEXTAUTH_SECRET** (can be same)
- ✅ **CORS_ORIGINS** NO spaces: `url1.com,url2.com`
- ✅ Update URLs after deployment

---

## 🛠️ **Troubleshooting**

### Issue: Database Connection Failed

```
Error: Can't reach database server
```

**Solution:**
1. Check DATABASE_URL format in your environment
   - Local: `/Users/mac/Source-Code/rentalshop-nextjs/.env.local`
   - Production: Vercel Dashboard → Settings → Environment Variables
2. Verify password is correct (from Supabase Step 1)
3. Check Supabase project is active at https://app.supabase.com

### Issue: Cloudinary Upload Failed

```
Error: Upload preset must be whitelisted
```

**Solution:**
1. Verify upload preset name
2. Check "Signing mode" = "Unsigned"
3. Clear browser cache

### Issue: CORS Error

```
CORS policy: No 'Access-Control-Allow-Origin'
```

**Solution:**
1. Update `CORS_ORIGINS` in API env vars
2. Format: `https://url1.com,https://url2.com` (NO SPACES!)
3. Redeploy API

---

## ✅ **Setup Checklist**

- [ ] Supabase account created
- [ ] Database password saved
- [ ] Connection string copied
- [ ] Prisma schema updated
- [ ] Database migrated & seeded
- [ ] Cloudinary account created
- [ ] Upload preset created (Unsigned)
- [ ] API credentials saved
- [ ] Vercel CLI installed
- [ ] Secrets generated
- [ ] Environment variables prepared

**Next:** Go to `/Users/mac/Source-Code/rentalshop-nextjs/DEPLOYMENT_GUIDE.md` to deploy your apps!

---

## 📚 **Quick Links**

- **Supabase Dashboard**: https://app.supabase.com
- **Cloudinary Console**: https://console.cloudinary.com
- **Vercel Dashboard**: https://vercel.com/dashboard

---

## 📂 **Important Files & Locations**

| File/Directory | Purpose | When to use |
|---------------|---------|-------------|
| `/Users/mac/Source-Code/rentalshop-nextjs/prisma/schema.prisma` | Database schema | Update when changing from SQLite to PostgreSQL |
| `/Users/mac/Source-Code/rentalshop-nextjs/.env.local` | Local environment variables | For local testing (DO NOT commit!) |
| `/Users/mac/Source-Code/rentalshop-nextjs/apps/api/vercel.json` | API Vercel config | Already configured ✅ |
| `/Users/mac/Source-Code/rentalshop-nextjs/apps/client/vercel.json` | Client Vercel config | Already configured ✅ |
| `/Users/mac/Source-Code/rentalshop-nextjs/apps/admin/vercel.json` | Admin Vercel config | Already configured ✅ |
| `/Users/mac/Source-Code/rentalshop-nextjs/DEPLOYMENT_GUIDE.md` | Next step | Follow after setup complete |

---

**Setup Complete! Ready to Deploy! 🎉**


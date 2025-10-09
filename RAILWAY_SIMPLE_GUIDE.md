# 🚂 Hướng Dẫn Deploy Railway Đơn Giản (Không Docker)

> ⚠️ **CẬP NHẬT:** File này đã được review lại. Xem `RAILWAY_CORRECT_CONFIG.md` cho config đúng cuối cùng.
> 
> **Sửa đổi quan trọng:**
> - ❌ Admin & Client **KHÔNG cần** Prisma Client
> - ✅ Chỉ API app cần Prisma
> - ✅ Frontend gọi API qua HTTP, không truy cập database trực tiếp

## 📋 **Tổng Quan**

Railway hỗ trợ **Nixpacks** - tự động detect và build project mà không cần viết Dockerfile phức tạp.

**Lợi ích của Nixpacks:**
- ✅ **Không cần Dockerfile** - Railway tự động detect
- ✅ **Đơn giản hơn** - Chỉ cần config file nhỏ
- ✅ **Tự động tối ưu** - Railway optimize cho bạn
- ✅ **Dễ maintain** - Ít code hơn cần quản lý

---

## 🏗️ **Cấu Trúc Monorepo của Bạn**

```
rentalshop-nextjs/
├── apps/
│   ├── admin/           # Next.js Admin Dashboard
│   │   ├── railway.json # ✅ Railway config
│   │   └── nixpacks.toml # ✅ Build config
│   │
│   ├── api/             # Next.js API Routes
│   │   ├── railway.json
│   │   └── nixpacks.toml
│   │
│   └── client/          # Next.js Customer App
│       ├── railway.json
│       └── nixpacks.toml
│
├── packages/            # Shared packages
│   ├── ui/
│   ├── auth/
│   ├── database/
│   └── types/
│
├── prisma/              # Database ở ROOT
│   └── schema.prisma
│
└── package.json         # Root package.json
```

**❓ TẠI SAO CẤU TRÚC NÀY?**
- **3 apps riêng biệt**: Deploy độc lập, scale riêng
- **Shared packages**: Tái sử dụng code (DRY principle)
- **Prisma ở root**: Quản lý database tập trung
- **railway.json + nixpacks.toml**: Cấu hình Railway đơn giản

---

## 📄 **1. railway.json - Cấu Hình Railway**

### **Công dụng:**
File này cho Railway biết **cách build và deploy** app của bạn.

### **Cấu Trúc Hiện Tại (apps/api/railway.json):**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  
  "build": {
    "builder": "NIXPACKS",        // ✅ Sử dụng Nixpacks (tự động)
    "buildCommand": "cd ../.. && yarn install --frozen-lockfile && npx prisma generate --schema=./prisma/schema.prisma && cd apps/api && yarn build"
  },
  
  "deploy": {
    "startCommand": "cd apps/api && yarn start:standalone",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### **❓ GIẢI THÍCH TỪNG DÒNG:**

#### **1️⃣ Build Section:**

```json
"buildCommand": "cd ../.. && yarn install --frozen-lockfile && npx prisma generate --schema=./prisma/schema.prisma && cd apps/api && yarn build"
```

**Bước 1:** `cd ../..`
- **Tại sao?** Di chuyển lên ROOT của monorepo
- **Lý do:** Cần access `package.json` và `node_modules` ở root

**Bước 2:** `yarn install --frozen-lockfile`
- **Tại sao?** Install tất cả dependencies
- **--frozen-lockfile:** Đảm bảo dùng đúng version trong `yarn.lock`
- **Lý do:** Monorepo cần install tất cả packages (ui, auth, database...)

**Bước 3:** `npx prisma generate --schema=./prisma/schema.prisma`
- **Tại sao?** Tạo Prisma Client từ schema
- **--schema=./prisma/schema.prisma:** Chỉ định đường dẫn schema ở root
- **Lý do:** Packages sử dụng Prisma Client cần generate trước

**Bước 4:** `cd apps/api && yarn build`
- **Tại sao?** Build Next.js API app
- **Lý do:** Tạo production build tối ưu

#### **2️⃣ Deploy Section:**

```json
"startCommand": "cd apps/api && yarn start:standalone"
```
- **cd apps/api:** Di chuyển vào thư mục API
- **yarn start:standalone:** Start Next.js standalone mode
- **Standalone mode:** Tự chứa tất cả dependencies (không cần node_modules)

```json
"healthcheckPath": "/api/health"
```
- **Tại sao?** Railway check endpoint này để xem app còn sống không
- **Quan trọng:** Bạn phải tạo API route `/api/health`

```json
"healthcheckTimeout": 300
```
- **300 giây = 5 phút:** Thời gian chờ app start
- **Tại sao lâu?** Monorepo + Prisma cần thời gian build

```json
"restartPolicyType": "ON_FAILURE",
"restartPolicyMaxRetries": 10
```
- **ON_FAILURE:** Auto restart khi app crash
- **10 retries:** Thử lại 10 lần trước khi báo lỗi

---

## 📄 **2. nixpacks.toml - Build Configuration**

### **Công dụng:**
File này chi tiết hơn về **cách build**, thay thế cho Dockerfile.

### **Cấu Trúc Hiện Tại (apps/api/nixpacks.toml):**

```toml
# Nixpacks configuration for Railway deployment
# This ensures Prisma generates correctly in monorepo setup

[phases.setup]
nixPkgs = ["nodejs_20", "yarn"]

[phases.install]
cmds = [
  "yarn install --frozen-lockfile"
]

[phases.build]
cmds = [
  # Generate Prisma Client in root node_modules
  "cd ../.. && npx prisma generate --schema=./prisma/schema.prisma",
  # Build the API app
  "cd apps/api && yarn build"
]

[start]
cmd = "cd apps/api && yarn start:standalone"

[variables]
NODE_ENV = "production"
```

### **❓ GIẢI THÍCH TỪNG PHẦN:**

#### **1️⃣ Setup Phase:**

```toml
[phases.setup]
nixPkgs = ["nodejs_20", "yarn"]
```
- **nixPkgs:** Các packages cần thiết để build
- **nodejs_20:** Node.js version 20
- **yarn:** Package manager
- **Tại sao?** Railway cần biết dùng công cụ gì

#### **2️⃣ Install Phase:**

```toml
[phases.install]
cmds = [
  "yarn install --frozen-lockfile"
]
```
- **Chạy ở ROOT:** Install tất cả dependencies
- **frozen-lockfile:** Đảm bảo version chính xác

#### **3️⃣ Build Phase:**

```toml
[phases.build]
cmds = [
  "cd ../.. && npx prisma generate --schema=./prisma/schema.prisma",
  "cd apps/api && yarn build"
]
```
- **Command 1:** Generate Prisma Client
- **Command 2:** Build Next.js app
- **Thứ tự quan trọng:** Prisma phải generate trước khi build

#### **4️⃣ Start Command:**

```toml
[start]
cmd = "cd apps/api && yarn start:standalone"
```
- **Production start command**
- **Standalone mode:** Tối ưu cho production

#### **5️⃣ Environment Variables:**

```toml
[variables]
NODE_ENV = "production"
```
- **NODE_ENV=production:** Enable production optimizations
- **Tự động apply:** Next.js optimize khi thấy production

---

## 🔄 **So Sánh: railway.json vs nixpacks.toml**

### **Khi nào dùng gì?**

| Feature | railway.json | nixpacks.toml |
|---------|--------------|---------------|
| **Build command** | ✅ Simple | ✅ Detailed (phases) |
| **Start command** | ✅ Deploy section | ✅ [start] section |
| **Health check** | ✅ Có | ❌ Không |
| **Restart policy** | ✅ Có | ❌ Không |
| **Packages setup** | ❌ Không | ✅ nixPkgs |
| **Environment vars** | ❌ Không | ✅ [variables] |

### **✅ Khuyên dùng:**

**Option 1: Chỉ dùng railway.json (Đơn giản nhất)**
- Đủ cho hầu hết cases
- Dễ maintain

**Option 2: Dùng cả hai (Kiểm soát tốt hơn)**
- railway.json: Health check, restart policy
- nixpacks.toml: Build phases, packages setup

---

## 🎯 **Cấu Hình Tối Ưu Cho 3 Apps**

### **📍 apps/admin/railway.json**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd ../.. && yarn install --frozen-lockfile && npx prisma generate --schema=./prisma/schema.prisma && cd apps/admin && yarn build"
  },
  "deploy": {
    "startCommand": "cd apps/admin && yarn start",
    "healthcheckPath": "/",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**❓ Khác biệt:**
- **healthcheckPath: "/"** - Admin dashboard homepage
- **startCommand:** Start admin app

### **📍 apps/client/railway.json**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd ../.. && yarn install --frozen-lockfile && npx prisma generate --schema=./prisma/schema.prisma && cd apps/client && yarn build"
  },
  "deploy": {
    "startCommand": "cd apps/client && yarn start",
    "healthcheckPath": "/",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**❓ Khác biệt:**
- **healthcheckPath: "/"** - Client homepage
- **startCommand:** Start client app

### **📍 apps/api/railway.json**

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "cd ../.. && yarn install --frozen-lockfile && npx prisma generate --schema=./prisma/schema.prisma && cd apps/api && yarn build"
  },
  "deploy": {
    "startCommand": "cd apps/api && yarn start:standalone",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**❓ Khác biệt:**
- **healthcheckPath: "/api/health"** - API health endpoint
- **start:standalone** - Next.js standalone mode (tối ưu cho API)

---

## 🚀 **Workflow Deploy lên Railway**

### **Bước 1: Tạo Project trên Railway**
```bash
# Login Railway CLI
railway login

# Link project
railway link
```

### **Bước 2: Tạo 3 Services**

**Option 1: Qua Railway Dashboard (Web UI)**
1. Tạo service "Admin"
   - Root Directory: `apps/admin`
   - Deploy

2. Tạo service "API"
   - Root Directory: `apps/api`
   - Deploy

3. Tạo service "Client"
   - Root Directory: `apps/client`
   - Deploy

**Option 2: Qua Railway CLI**
```bash
# Deploy API
cd apps/api
railway up

# Deploy Admin
cd ../admin
railway up

# Deploy Client
cd ../client
railway up
```

### **Bước 3: Cấu hình Environment Variables**

**Trên Railway Dashboard, thêm variables:**

**API Service:**
```env
DATABASE_URL=postgresql://...
NODE_ENV=production
JWT_SECRET=your-secret
NEXTAUTH_SECRET=your-secret
CLIENT_URL=https://your-client.railway.app
ADMIN_URL=https://your-admin.railway.app
```

**Admin Service:**
```env
NEXT_PUBLIC_API_URL=https://your-api.railway.app
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=https://your-admin.railway.app
```

**Client Service:**
```env
NEXT_PUBLIC_API_URL=https://your-api.railway.app
NEXTAUTH_SECRET=your-secret
NEXTAUTH_URL=https://your-client.railway.app
```

### **Bước 4: Tạo Database**

**Option 1: Railway PostgreSQL (Khuyến nghị)**
1. Add Database service
2. Copy DATABASE_URL
3. Paste vào API service environment

**Option 2: External Database (Supabase, Neon, etc.)**
```env
DATABASE_URL=postgresql://user:pass@host:5432/db
```

### **Bước 5: Run Migrations**

```bash
# Qua Railway CLI
railway run npx prisma migrate deploy
```

Hoặc add vào buildCommand:
```json
"buildCommand": "cd ../.. && yarn install --frozen-lockfile && npx prisma migrate deploy && npx prisma generate --schema=./prisma/schema.prisma && cd apps/api && yarn build"
```

---

## ⚡ **Tips Tối Ưu Performance**

### **1. Cache node_modules**
Railway tự động cache, nhưng đảm bảo:
```json
"buildCommand": "yarn install --frozen-lockfile"
```

### **2. Prisma Generate Cache**
```toml
[phases.build]
cmds = [
  "cd ../.. && npx prisma generate --schema=./prisma/schema.prisma"
]
```

### **3. Next.js Standalone Mode**
Trong `next.config.js`:
```js
module.exports = {
  output: 'standalone',  // ✅ Giảm 90% bundle size
}
```

### **4. Health Check Timeout**
```json
"healthcheckTimeout": 300  // 5 phút cho monorepo
```

---

## 🐛 **Troubleshooting**

### **Lỗi: "Prisma Client not found"**

**Nguyên nhân:** Prisma generate chưa chạy hoặc sai đường dẫn

**Giải pháp:**
```bash
# Thêm vào buildCommand
npx prisma generate --schema=./prisma/schema.prisma
```

### **Lỗi: "Module not found @rentalshop/xxx"**

**Nguyên nhân:** Monorepo dependencies không được transpile

**Giải pháp:** Thêm vào `next.config.js`
```js
transpilePackages: [
  '@rentalshop/auth',
  '@rentalshop/utils',
  '@rentalshop/types'
]
```

### **Lỗi: "Build timeout"**

**Nguyên nhân:** Build quá lâu

**Giải pháp:**
```json
"healthcheckTimeout": 600  // Tăng lên 10 phút
```

### **Lỗi: "Cannot find module '.prisma/client'"**

**Nguyên nhân:** Prisma Client path sai trong monorepo

**Giải pháp:** Thêm vào `next.config.js`
```js
webpack: (config, { isServer }) => {
  if (isServer) {
    config.resolve.alias['.prisma/client'] = 
      require('path').join(__dirname, '../../node_modules/.prisma/client');
  }
  return config;
}
```

---

## 📊 **Checklist Deploy**

### **Trước khi Deploy:**
- [ ] ✅ Sửa typo trong `next.config.js` (đã fix)
- [ ] ✅ Có `railway.json` cho mỗi app
- [ ] ✅ Có `nixpacks.toml` cho mỗi app (optional)
- [ ] ✅ `output: 'standalone'` trong `next.config.js`
- [ ] ✅ Health check endpoints (`/api/health`)
- [ ] ✅ Environment variables đã setup
- [ ] ✅ Database connection string đã có

### **Sau khi Deploy:**
- [ ] ✅ Test health check endpoint
- [ ] ✅ Check logs trên Railway dashboard
- [ ] ✅ Test API endpoints
- [ ] ✅ Test authentication
- [ ] ✅ Check database connections

---

## 🎓 **Tóm Tắt**

### **Railway Deploy với Nixpacks:**
1. **railway.json**: Cấu hình deploy (health check, restart policy)
2. **nixpacks.toml**: Cấu hình build (packages, phases)
3. **next.config.js**: Next.js config (standalone, transpile packages)
4. **Environment variables**: Database, secrets, URLs

### **Build Process:**
```
Setup (Node + Yarn) 
  → Install (yarn install) 
    → Build (prisma generate + yarn build) 
      → Start (yarn start:standalone)
```

### **Lợi ích so với Docker:**
- ✅ **Đơn giản hơn** - Không cần viết Dockerfile
- ✅ **Tự động** - Railway tối ưu cho bạn
- ✅ **Nhanh hơn** - Caching tốt hơn
- ✅ **Dễ maintain** - Config file ngắn gọn

---

## 🚀 **Next Steps**

1. **Review các file railway.json** - Đảm bảo đúng config
2. **Test local build** - Chạy `yarn build` ở từng app
3. **Push to Railway** - Deploy và monitor logs
4. **Setup monitoring** - Check health endpoints
5. **Optimize** - Giảm build time nếu cần

**Chúc bạn deploy thành công! 🎉**


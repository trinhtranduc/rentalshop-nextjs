# Docker Local Setup - Remote Database & Qdrant

## 🎯 Mục đích

Test Docker local với **remote database và Qdrant** để giống 100% với Railway environment.

## 📋 Yêu cầu

1. **Remote PostgreSQL Database:**
   - Railway PostgreSQL service
   - Hoặc Supabase, Neon, hoặc bất kỳ remote PostgreSQL

2. **Remote Qdrant:**
   - Railway Qdrant service
   - Hoặc Qdrant Cloud (free 1GB)

## 🚀 Cách Setup

### **Bước 1: Lấy Database URL**

**Railway PostgreSQL:**
1. Vào Railway Dashboard → PostgreSQL Service → Variables
2. Copy `DATABASE_URL`
3. Format: `postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway`

**Supabase:**
1. Vào Supabase Dashboard → Project Settings → Database
2. Copy Connection String
3. Format: `postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres`

**Neon:**
1. Vào Neon Dashboard → Connection String
2. Copy connection string
3. Format: `postgresql://user:password@ep-xxxxx.us-east-2.aws.neon.tech/neondb`

### **Bước 2: Lấy Qdrant URL**

**Railway Qdrant:**
1. Vào Railway Dashboard → Qdrant Service → Settings
2. Copy **Public Domain**
3. Format: `https://your-qdrant-service.railway.app`

**Qdrant Cloud:**
1. Đăng ký tại: https://cloud.qdrant.io
2. Tạo cluster (free 1GB)
3. Copy **Cluster URL** và **API Key**
4. Format: `https://your-cluster-id.region.cloud.qdrant.io`

### **Bước 3: Set Environment Variables**

**Option 1: Export trực tiếp**
```bash
export DATABASE_URL='postgresql://user:password@host:port/database'
export QDRANT_URL='https://your-qdrant.railway.app'
export QDRANT_API_KEY='your-api-key'  # Optional
```

**Option 2: Tạo .env.local file (Khuyến nghị - Next.js convention)**
```bash
# Tạo file .env.local (script sẽ tự động load)
cat > .env.local << 'EOF'
DATABASE_URL=postgresql://user:password@host:port/database
QDRANT_URL=https://your-qdrant.railway.app
QDRANT_API_KEY=your-api-key
JWT_SECRET=supersecretjwtkeythatisatleast32characterslong
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3002
USE_ONNXRUNTIME=false
USE_BROWSER=true
ONNXRUNTIME_NODE_DISABLE=true
EOF

# Script sẽ tự động load .env.local, không cần source
```

### **Bước 4: Start Container**

```bash
# Script sẽ tự động:
# - Kiểm tra DATABASE_URL và QDRANT_URL
# - Build image nếu chưa có
# - Start container với remote database và Qdrant
./scripts/start-docker-railway.sh
```

## ✅ Verification

Script sẽ hiển thị:
```
✅ DATABASE_URL: postgresql://...
   ✅ Using REMOTE database (like Railway)
✅ QDRANT_URL: https://...
   ✅ Using REMOTE Qdrant (like Railway)
✅ QDRANT_API_KEY: ***SET***
```

## 🧪 Test

Sau khi container chạy:

```bash
# Test health check
curl http://localhost:3002/api/health

# Test validation (Bước 1)
./scripts/test-docker-local-step1.sh

# Test full API (nếu có database connection)
./scripts/test-search-by-image-api.sh
```

## 📝 Example .env.local

```bash
# Railway PostgreSQL
DATABASE_URL=postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway

# Railway Qdrant
QDRANT_URL=https://qdrant-production.up.railway.app
QDRANT_API_KEY=

# Hoặc Qdrant Cloud
# QDRANT_URL=https://6b2f953d-75c4-4ce5-bc1d-a479bfc4a397.europe-west3-0.gcp.cloud.qdrant.io
# QDRANT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT Secret (for testing)
JWT_SECRET=supersecretjwtkeythatisatleast32characterslong

# API URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3002

# ML Model Configuration
USE_ONNXRUNTIME=false
USE_BROWSER=true
ONNXRUNTIME_NODE_DISABLE=true
```

**Lưu ý:** `.env.local` đã có trong `.gitignore`, không cần lo về security.

## ⚠️ Lưu ý

1. **Không dùng localhost:** Script sẽ yêu cầu remote database và Qdrant
2. **Security:** `.env.local` đã có trong `.gitignore`, không commit vào git
3. **Next.js Convention:** `.env.local` là convention chuẩn của Next.js
4. **Testing:** Local Docker với remote services ≈ Railway environment 100%

## 🔍 Troubleshooting

### **Error: DATABASE_URL is not set**
```bash
# Set DATABASE_URL
export DATABASE_URL='postgresql://...'
# Hoặc tạo .env.local file với DATABASE_URL
```

### **Error: QDRANT_URL is not set**
```bash
# Set QDRANT_URL
export QDRANT_URL='https://...'
# Hoặc tạo .env.local file với QDRANT_URL
```

### **Database connection failed**
- Kiểm tra DATABASE_URL có đúng không
- Kiểm tra database có cho phép remote connection không
- Kiểm tra firewall/network

### **Qdrant connection failed**
- Kiểm tra QDRANT_URL có đúng không
- Kiểm tra QDRANT_API_KEY (nếu cần)
- Kiểm tra Qdrant service có running không

## 📚 Related Documents

- [TEST_DOCKER_LOCAL_VS_RAILWAY.md](./TEST_DOCKER_LOCAL_VS_RAILWAY.md) - So sánh Local vs Railway
- [RAILWAY_QDRANT_SETUP.md](./RAILWAY_QDRANT_SETUP.md) - Setup Qdrant trên Railway
- [RAILWAY_ENV_VARIABLES.md](./RAILWAY_ENV_VARIABLES.md) - Environment variables guide

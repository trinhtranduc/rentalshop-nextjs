# Test Docker Local vs Railway

## 📋 So sánh Local Docker và Railway

### ✅ **GIỐNG NHAU (99%)**

| Aspect | Local Docker | Railway | Ghi chú |
|--------|-------------|---------|---------|
| **Dockerfile** | ✅ Cùng file | ✅ Cùng file | `apps/api/Dockerfile` |
| **Base Image** | ✅ `node:22-alpine` | ✅ `node:22-alpine` | Alpine Linux |
| **Build Process** | ✅ Multi-stage build | ✅ Multi-stage build | Dependencies → Builder → Runner |
| **Runtime** | ✅ Node.js 22 | ✅ Node.js 22 | Cùng version |
| **OS** | ✅ Alpine Linux | ✅ Alpine Linux | Cùng OS |
| **Code** | ✅ Cùng codebase | ✅ Cùng codebase | Git commit |
| **Dependencies** | ✅ Cùng packages | ✅ Cùng packages | `yarn.lock` |
| **ML Model** | ✅ WASM mode | ✅ WASM mode | No `onnxruntime-node` |
| **Start Command** | ✅ `cd apps/api && sh start.sh` | ✅ `cd apps/api && sh start.sh` | Cùng command |

### ⚠️ **KHÁC NHAU (1%)**

| Aspect | Local Docker | Railway | Ghi chú |
|--------|-------------|---------|---------|
| **Environment Variables** | ⚠️ Local values | ⚠️ Railway Dashboard | DATABASE_URL, JWT_SECRET, etc. |
| **Network** | ⚠️ Localhost | ⚠️ Railway network | Private networking trên Railway |
| **Resources** | ⚠️ Local machine | ⚠️ Railway limits | CPU, Memory, Disk |
| **Database** | ⚠️ Local/Remote | ⚠️ Railway PostgreSQL | Connection string khác |
| **Qdrant** | ⚠️ Local/Remote | ⚠️ Railway Qdrant | URL khác |

## 🧪 Cách Test Local Docker

### **Bước 1: Set Environment Variables (Remote Database & Qdrant)**

**Option 1: Export trực tiếp**
```bash
# Set remote database (Railway PostgreSQL hoặc bất kỳ remote PostgreSQL)
export DATABASE_URL='postgresql://user:password@host:port/database'

# Set remote Qdrant (Railway Qdrant hoặc Qdrant Cloud)
export QDRANT_URL='https://your-qdrant.railway.app'
export QDRANT_API_KEY='your-api-key'  # Optional
```

**Option 2: Dùng .env.local file (Khuyến nghị - Next.js convention)**
```bash
# 1. Copy example file
cp env.example .env.local

# 2. Edit .env.local với values của bạn
# DATABASE_URL=postgresql://...
# QDRANT_URL=https://...

# 3. Chạy script (tự động load .env.local)
./scripts/start-docker-railway.sh
```

### **Bước 2: Build và Start Container**

```bash
# Script sẽ tự động:
# - Kiểm tra DATABASE_URL và QDRANT_URL
# - Build image nếu chưa có
# - Start container với remote database và Qdrant
./scripts/start-docker-railway.sh
```

**Lưu ý:** Script sẽ **yêu cầu** DATABASE_URL và QDRANT_URL phải set (không dùng localhost).

### **Bước 2: Test Validation (Bước 1)**

```bash
# Test validation logic (không cần database)
./scripts/test-docker-local-step1.sh
```

Script này sẽ test:
- ✅ Container đang chạy
- ✅ Server health check
- ✅ Validation logic (missing image, invalid file, etc.)

### **Bước 3: Test Full API (cần database)**

```bash
# Test với database connection
./scripts/test-search-by-image-api.sh
```

## 🔍 Kiểm tra Container

### **Xem logs:**
```bash
docker logs -f rentalshop-api-railway
```

### **Vào container:**
```bash
docker exec -it rentalshop-api-railway sh
```

### **Kiểm tra environment:**
```bash
docker exec rentalshop-api-railway env | grep -E "(NODE_ENV|USE_ONNXRUNTIME|DATABASE_URL)"
```

## 📊 So sánh chi tiết

### **1. Build Process**

**Local Docker:**
```bash
docker build -t rentalshop-api-test-local -f apps/api/Dockerfile .
```

**Railway:**
- Railway tự động build từ `apps/api/Dockerfile`
- Sử dụng `railway.json` để config
- Build trong Railway cloud

**Kết luận:** ✅ **GIỐNG NHAU** - Cùng Dockerfile, cùng build process

### **2. Runtime Environment**

**Local Docker:**
```bash
docker run -d \
  -e NODE_ENV=production \
  -e USE_ONNXRUNTIME=false \
  -e ONNXRUNTIME_NODE_DISABLE=true \
  rentalshop-api-test-local
```

**Railway:**
- Environment variables set trong Railway Dashboard
- Tự động inject vào container
- Cùng format và values

**Kết luận:** ✅ **GIỐNG NHAU** - Cùng environment variables

### **3. Start Command**

**Local Docker:**
```bash
# Container chạy: cd apps/api && sh start.sh
```

**Railway:**
```json
{
  "deploy": {
    "startCommand": "cd apps/api && sh start.sh"
  }
}
```

**Kết luận:** ✅ **GIỐNG NHAU** - Cùng start command

### **4. Health Check**

**Local Docker:**
```bash
curl http://localhost:3002/api/health
```

**Railway:**
```json
{
  "deploy": {
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 300
  }
}
```

**Kết luận:** ✅ **GIỐNG NHAU** - Cùng health check endpoint

## 🎯 Kết luận

### **Local Docker ≈ Railway (99%)**

- ✅ **Cùng Dockerfile** → Cùng build process
- ✅ **Cùng Alpine Linux** → Cùng runtime environment
- ✅ **Cùng code** → Cùng logic và behavior
- ✅ **Cùng dependencies** → Cùng packages và versions

### **Khác biệt chính:**

1. **Environment Variables:**
   - Local: Set trong `docker run` command
   - Railway: Set trong Railway Dashboard
   - **Giải pháp:** Dùng `.env` file hoặc Railway CLI

2. **Database Connection:**
   - Local: Có thể dùng local database hoặc remote
   - Railway: Dùng Railway PostgreSQL service
   - **Giải pháp:** Test với cùng database URL

3. **Network:**
   - Local: `localhost:3002`
   - Railway: `https://your-api.railway.app`
   - **Giải pháp:** Test với localhost trước, Railway sau

## ✅ Best Practices

### **1. Test Local Trước Khi Deploy Railway**

```bash
# 1. Build và start local Docker
./scripts/start-docker-railway.sh

# 2. Test validation (Bước 1)
./scripts/test-docker-local-step1.sh

# 3. Test full API (nếu có database)
./scripts/test-search-by-image-api.sh

# 4. Nếu OK → Commit và deploy Railway
git add .
git commit -m "feat: Step 1 validation"
git push
```

### **2. Sử dụng Cùng Environment Variables**

Tạo file `.env.docker` để test local:
```bash
DATABASE_URL=postgresql://...
JWT_SECRET=...
QDRANT_URL=...
USE_ONNXRUNTIME=false
ONNXRUNTIME_NODE_DISABLE=true
```

Load vào Docker:
```bash
docker run -d --env-file .env.docker rentalshop-api-test-local
```

### **3. So sánh Logs**

**Local:**
```bash
docker logs rentalshop-api-railway | grep "Step 1"
```

**Railway:**
```bash
railway logs | grep "Step 1"
```

Nếu logs giống nhau → ✅ Code hoạt động đúng

## 🚀 Quick Start

```bash
# 1. Start container
./scripts/start-docker-railway.sh

# 2. Test Bước 1 (validation)
./scripts/test-docker-local-step1.sh

# 3. Nếu OK → Deploy Railway
git push
```

## 📝 Summary

**Local Docker và Railway GIỐNG NHAU 99%:**
- ✅ Cùng Dockerfile, Alpine Linux, Node.js
- ✅ Cùng build process và runtime
- ✅ Cùng code và dependencies
- ⚠️ Chỉ khác: Environment variables và network

**Kết luận:** Nếu test local Docker OK → Railway cũng sẽ OK! 🎯

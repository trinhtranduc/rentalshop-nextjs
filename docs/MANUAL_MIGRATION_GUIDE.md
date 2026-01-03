# 🚀 Manual Migration Guide

Hướng dẫn chi tiết cách manual migrate từ local machine lên Development và Production databases.

---

## 📋 **Tổng quan**

Khi bạn không có local database và muốn chạy migration từ local machine lên Railway database, có 3 cách:

1. **Railway CLI** (Recommended) - Tự động inject DATABASE_URL
2. **Set DATABASE_URL** - Manual set connection string
3. **Railway Dashboard** - Run command qua web interface

---

## 🎯 **Option 1: Railway CLI (Recommended)**

### **Setup Railway CLI:**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link
```

### **Migrate Development:**

```bash
# Chạy migration lên development database
railway run --service apis --environment development \
  npx prisma migrate deploy --schema=./prisma/schema.prisma

# Check status
railway run --service apis --environment development \
  npx prisma migrate status --schema=./prisma/schema.prisma
```

### **Migrate Production:**

```bash
# ⚠️ WARNING: Production migration!
railway run --service apis --environment production \
  npx prisma migrate deploy --schema=./prisma/schema.prisma

# Check status
railway run --service apis --environment production \
  npx prisma migrate status --schema=./prisma/schema.prisma
```

**Lợi ích:**
- ✅ Tự động inject DATABASE_URL
- ✅ Không cần copy/paste connection string
- ✅ An toàn (credentials không lưu local)
- ✅ Hoạt động với cả internal và public URLs

---

## 🔧 **Option 2: Set DATABASE_URL**

### **Lấy DATABASE_URL từ Railway Dashboard:**

1. **Mở Railway Dashboard:**
   - Development: https://railway.app/project/[your-project]/environments/development
   - Production: https://railway.app/project/[your-project]/environments/production

2. **Lấy Public DATABASE_URL:**
   - Vào **PostgreSQL service**
   - Click **Connect** → **Public Network**
   - Copy connection string

3. **Set DATABASE_URL và chạy migration:**

```bash
# Development
export DATABASE_URL="postgresql://postgres:password@proxy.rlwy.net:port/railway"
yarn db:migrate:dev:manual

# Production
export DATABASE_URL="postgresql://postgres:password@proxy.rlwy.net:port/railway"
yarn db:migrate:prod:manual  # Có confirmation prompt
```

### **Hoặc lấy từ Railway CLI:**

```bash
# View all variables
railway variables --service apis --environment development

# Get DATABASE_URL only (cần parse output)
railway variables --service apis --environment development | grep DATABASE_URL
```

---

## 🖥️ **Option 3: Railway Dashboard**

### **Chạy Migration qua Web Interface:**

1. **Mở Railway Dashboard:**
   - Development: https://railway.app/project/[project]/environments/development
   - Production: https://railway.app/project/[project]/environments/production

2. **Chọn API Service:**
   - Click vào service **API** (hoặc **apis**)

3. **Vào Deployments tab:**
   - Click tab **Deployments**
   - Click **Run Command** (hoặc **Execute Command**)

4. **Chạy Migration Command:**
   ```bash
   npx prisma migrate deploy --schema=./prisma/schema.prisma
   ```

5. **Check Status:**
   ```bash
   npx prisma migrate status --schema=./prisma/schema.prisma
   ```

**Lợi ích:**
- ✅ Không cần install Railway CLI
- ✅ Chạy trực tiếp trên Railway server
- ✅ An toàn (không expose credentials)
- ✅ Dễ sử dụng qua web UI

---

## 🔄 **Workflow Khuyến nghị**

### **Khi có schema changes:**

```
1. Sửa prisma/schema.prisma
   ↓
2. Manual migrate lên Development (test)
   railway run --service apis --environment development \
     npx prisma migrate deploy --schema=./prisma/schema.prisma
   ↓
3. Test trên Development
   ↓
4. Commit và push code
   git add prisma/schema.prisma prisma/migrations/
   git commit -m "feat: add new feature"
   git push origin dev
   ↓
5. Railway auto-deploy (backup, nếu manual migration chưa chạy)
   ↓
6. Sau khi test OK → Merge main → Production auto-deploy
```

### **Khi migration failed trên Railway:**

```
1. Check logs
   railway logs --service apis --environment development --tail 100
   ↓
2. Fix migration file (nếu cần)
   ↓
3. Manual migrate để apply fix
   railway run --service apis --environment development \
     npx prisma migrate deploy --schema=./prisma/schema.prisma
   ↓
4. Verify
   railway run --service apis --environment development \
     npx prisma migrate status --schema=./prisma/schema.prisma
```

---

## 📝 **Commands Reference**

### **Development:**

```bash
# Migrate (Recommended - Railway CLI)
railway run --service apis --environment development \
  npx prisma migrate deploy --schema=./prisma/schema.prisma

# Status
railway run --service apis --environment development \
  npx prisma migrate status --schema=./prisma/schema.prisma

# Generate Prisma Client
railway run --service apis --environment development \
  npx prisma generate --schema=./prisma/schema.prisma

# Using script (requires DATABASE_URL)
export DATABASE_URL="..."
yarn db:migrate:dev:manual
```

### **Production:**

```bash
# Migrate (Recommended - Railway CLI)
railway run --service apis --environment production \
  npx prisma migrate deploy --schema=./prisma/schema.prisma

# Status
railway run --service apis --environment production \
  npx prisma migrate status --schema=./prisma/schema.prisma

# Using script (requires DATABASE_URL + confirmation)
export DATABASE_URL="..."
yarn db:migrate:prod:manual
```

---

## ⚠️ **Lưu ý quan trọng**

### **Internal vs Public URLs:**

Railway có 2 loại DATABASE_URL:
- **Internal URL**: `postgresql://...@postgres.railway.internal:5432/...`
  - Chỉ hoạt động TRONG Railway network
  - Không thể dùng từ local machine
- **Public URL**: `postgresql://...@proxy.rlwy.net:port/...`
  - Hoạt động từ internet
  - Có thể dùng từ local machine

**Giải pháp:**
- ✅ Dùng **Railway CLI** (tự động handle)
- ✅ Hoặc lấy **Public URL** từ Railway Dashboard

### **Security:**

- ✅ **KHÔNG** commit DATABASE_URL vào git
- ✅ **KHÔNG** log DATABASE_URL ra console (có password)
- ✅ Dùng Railway CLI khi có thể (an toàn hơn)
- ✅ Chỉ dùng Public URL khi cần (tạm thời)

---

## 🐛 **Troubleshooting**

### **Error: DATABASE_URL is not set**

**Giải pháp:**
```bash
# Option 1: Dùng Railway CLI
railway run --service apis --environment development \
  npx prisma migrate deploy --schema=./prisma/schema.prisma

# Option 2: Set DATABASE_URL
export DATABASE_URL="postgresql://..."
yarn db:migrate:dev:manual
```

### **Error: Can't reach database server**

**Nguyên nhân:** Đang dùng Internal URL từ local machine

**Giải pháp:**
```bash
# Dùng Railway CLI (tự động dùng Internal URL)
railway run --service apis --environment development \
  npx prisma migrate deploy --schema=./prisma/schema.prisma

# Hoặc lấy Public URL từ Railway Dashboard
export DATABASE_URL="postgresql://...@proxy.rlwy.net:port/..."
```

### **Error: Migration already applied**

**Giải pháp:**
```bash
# Check status
npx prisma migrate status --schema=./prisma/schema.prisma

# Nếu migration đã apply, không cần làm gì
# Nếu migration failed, resolve nó:
npx prisma migrate resolve --applied <migration-name> --schema=./prisma/schema.prisma
```

---

## 📚 **Tóm tắt**

| Method | Setup | Security | Ease of Use | Recommended |
|--------|-------|----------|-------------|-------------|
| **Railway CLI** | Install CLI | ✅ High | ✅ Easy | ⭐⭐⭐⭐⭐ |
| **DATABASE_URL** | Get URL | ⚠️ Medium | ✅ Easy | ⭐⭐⭐ |
| **Dashboard** | None | ✅ High | ⚠️ Medium | ⭐⭐⭐⭐ |

**Best Practice:** Dùng **Railway CLI** cho tất cả manual migrations!


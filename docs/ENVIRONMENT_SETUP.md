# 🔧 Environment Setup Guide: Development vs Production

Hướng dẫn setup và quản lý 2 environments: **Development** và **Production**

---

## 📋 **Vấn đề: Shadow Database Error**

Khi chạy `prisma migrate dev` với production database, bạn sẽ gặp lỗi:
```
Error: P3006
Migration failed to apply cleanly to the shadow database.
The underlying table for model `public.Outlet` does not exist.
```

**Nguyên nhân:**
- `prisma migrate dev` cần **shadow database** để test migrations
- Railway **không hỗ trợ** shadow database
- Chỉ nên dùng `migrate dev` với **local database** (SQLite hoặc local PostgreSQL)

---

## 🎯 **Giải pháp: Tách riêng Environments**

### **1. Local Development (SQLite) - Dùng cho `migrate dev`**

Tạo file `.env.local`:

```bash
# .env.local - Local Development (SQLite)
NODE_ENV=local
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="local-jwt-secret-DO-NOT-USE-IN-PRODUCTION"
NEXTAUTH_SECRET="local-nextauth-secret-DO-NOT-USE-IN-PRODUCTION"
NEXTAUTH_URL="http://localhost:3002"
API_URL="http://localhost:3002"
CLIENT_URL="http://localhost:3000"
ADMIN_URL="http://localhost:3001"
```

**Setup local database:**
```bash
# Tạo migration với local SQLite database
NODE_ENV=local yarn db:migrate:dev --name your_migration_name

# Reset local database nếu cần
NODE_ENV=local npx prisma migrate reset --schema=./prisma/schema.prisma

# Seed local database
NODE_ENV=local yarn db:regenerate-system
```

---

### **2. Development (Railway Dev) - Dùng cho `migrate deploy`**

**Option A: Railway Dashboard (Khuyến nghị)**
1. Mở Railway Dashboard
2. Chọn **development** environment
3. Vào service **API** → **Variables**
4. Set `DATABASE_URL` từ Railway PostgreSQL service

**Option B: Railway CLI**
```bash
# Login Railway
railway login

# Link to development project
railway link

# Set environment variables
railway variables set DATABASE_URL=${{Postgres.DATABASE_URL}} --environment development

# Run migration (Railway tự động chạy khi deploy)
railway run --service apis --environment development npx prisma migrate deploy
```

**Workflow:**
```bash
# 1. Create migration locally (với SQLite)
NODE_ENV=local yarn db:migrate:dev --name add_referral_tracking

# 2. Commit migration files
git add prisma/migrations/
git commit -m "feat: add referral tracking"
git push origin dev

# 3. Railway auto-deploy và chạy migration deploy
# (Không cần chạy thủ công nếu Railway đã setup auto-migration)
```

---

### **3. Production (Railway Prod) - Chỉ dùng `migrate deploy`**

**⚠️ QUAN TRỌNG: KHÔNG BAO GIỜ chạy `migrate dev` với production database!**

**Workflow:**
```bash
# 1. Test migration trên development trước
git push origin dev  # → Railway dev auto-deploy

# 2. Sau khi test OK, merge vào main
git checkout main
git merge dev
git push origin main  # → Railway prod auto-deploy

# 3. Railway tự động chạy: npx prisma migrate deploy
```

**Manual migration (nếu cần):**
```bash
# Railway Dashboard → Production → API Service → Run Command
npx prisma migrate deploy --schema=./prisma/schema.prisma

# Hoặc Railway CLI
railway run --service apis --environment production npx prisma migrate deploy
```

---

## 🔄 **Migration Commands theo Environment**

### **Local Development (SQLite):**
```bash
# Create migration (cần shadow database)
NODE_ENV=local yarn db:migrate:dev --name migration_name

# Check status
NODE_ENV=local yarn db:migrate:status

# Reset database (⚠️ mất data)
NODE_ENV=local npx prisma migrate reset

# Generate Prisma Client
NODE_ENV=local yarn db:generate
```

### **Development (Railway Dev):**
```bash
# ❌ KHÔNG dùng migrate dev (không có shadow database)
# ✅ Dùng migrate deploy (Railway tự động chạy khi deploy)
yarn db:migrate  # hoặc npx prisma migrate deploy

# Check status
railway run --service apis --environment development npx prisma migrate status

# Manual deploy (nếu cần)
railway run --service apis --environment development npx prisma migrate deploy
```

### **Production (Railway Prod):**
```bash
# ❌ KHÔNG BAO GIỜ dùng migrate dev
# ✅ CHỈ dùng migrate deploy (Railway tự động chạy khi deploy)
yarn db:migrate  # hoặc npx prisma migrate deploy

# Check status
railway run --service apis --environment production npx prisma migrate status

# Manual deploy (chỉ khi cần)
railway run --service apis --environment production npx prisma migrate deploy
```

---

## 📝 **Workflow Best Practices**

### **✅ DO (Làm):**

1. **Local Development:**
   - ✅ Dùng SQLite (`file:./prisma/dev.db`)
   - ✅ Chạy `migrate dev` để tạo migration files
   - ✅ Test migrations locally trước

2. **Development (Railway):**
   - ✅ Commit migration files vào git
   - ✅ Push lên `dev` branch
   - ✅ Railway tự động chạy `migrate deploy`
   - ✅ Test trên development trước khi merge

3. **Production (Railway):**
   - ✅ Merge `dev` → `main` sau khi test OK
   - ✅ Railway tự động chạy `migrate deploy`
   - ✅ Monitor logs để đảm bảo migration thành công

### **❌ DON'T (Không làm):**

1. ❌ **KHÔNG** chạy `migrate dev` với Railway database
2. ❌ **KHÔNG** chạy migration production mà không test dev trước
3. ❌ **KHÔNG** sửa migration files đã được apply
4. ❌ **KHÔNG** commit `.env` files vào git
5. ❌ **KHÔNG** dùng production database cho development

---

## 🛠️ **Quick Setup Commands**

### **Setup Local Development:**
```bash
# 1. Tạo .env.local
cp env.example .env.local
# Edit .env.local với SQLite DATABASE_URL

# 2. Tạo migration với local database
NODE_ENV=local yarn db:migrate:dev --name initial

# 3. Generate Prisma Client
NODE_ENV=local yarn db:generate

# 4. Seed data (optional)
NODE_ENV=local yarn db:regenerate-system
```

### **Switch Environments:**
```bash
# Use local environment (SQLite)
export NODE_ENV=local
source .env.local

# Use development environment (Railway Dev)
unset NODE_ENV  # Railway tự động inject từ environment variables

# Use production environment (Railway Prod)
# Railway tự động inject từ environment variables
```

---

## 🛠️ **Manual Migration từ Local**

### **Khi nào cần manual migrate?**

1. ✅ **Khi muốn test migration trước khi deploy**
2. ✅ **Khi cần apply migration nhanh mà không muốn đợi deploy**
3. ✅ **Khi migration failed trên Railway và cần fix**
4. ✅ **Khi cần sync schema giữa environments**

### **Option 1: Railway CLI (Recommended - An toàn nhất)**

**Development:**
```bash
# Chạy migration từ local → Development database
railway run --service apis --environment development \
  npx prisma migrate deploy --schema=./prisma/schema.prisma

# Check status
railway run --service apis --environment development \
  npx prisma migrate status --schema=./prisma/schema.prisma
```

**Production:**
```bash
# ⚠️ WARNING: Production migration!
railway run --service apis --environment production \
  npx prisma migrate deploy --schema=./prisma/schema.prisma

# Check status
railway run --service apis --environment production \
  npx prisma migrate status --schema=./prisma/schema.prisma
```

### **Option 2: Set DATABASE_URL trực tiếp**

**Development:**
```bash
# Set DATABASE_URL từ Railway development database
export DATABASE_URL="postgresql://postgres:password@dev-host:port/railway"

# Chạy migration
npx prisma migrate deploy --schema=./prisma/schema.prisma

# Hoặc dùng script
./scripts/migrate-dev.sh
```

**Production:**
```bash
# ⚠️ WARNING: Production migration!
export DATABASE_URL="postgresql://postgres:password@prod-host:port/railway"

# Chạy migration
npx prisma migrate deploy --schema=./prisma/schema.prisma

# Hoặc dùng script (có confirmation)
./scripts/migrate-prod.sh
```

### **Option 3: Railway Dashboard**

1. Mở Railway Dashboard
2. Chọn environment (development/production)
3. Chọn service **API**
4. Vào tab **Deployments** → **Run Command**
5. Chạy:
   ```bash
   npx prisma migrate deploy --schema=./prisma/schema.prisma
   ```

---

## 🔍 **Troubleshooting**

### **Lỗi Shadow Database:**
```
Error: P3006 - Migration failed to apply cleanly to the shadow database
```

**Giải pháp:**
1. ✅ Dùng `migrate deploy` thay vì `migrate dev` với Railway
2. ✅ Setup local SQLite cho `migrate dev`
3. ✅ Chỉ chạy `migrate dev` locally
4. ✅ Dùng `migrate deploy` khi manual migrate từ local

### **Check Database Connection:**
```bash
# Check local database
NODE_ENV=local npx prisma db pull

# Check development database (Railway CLI)
railway run --service apis --environment development npx prisma db pull

# Check production database (Railway CLI)
railway run --service apis --environment production npx prisma db pull

# Check với DATABASE_URL
export DATABASE_URL="your-database-url"
npx prisma db pull
```

---

## 📚 **Tóm tắt**

| Environment | Database | Migration Command | Shadow DB? |
|-------------|----------|-------------------|------------|
| **Local** | SQLite | `migrate dev` | ✅ Yes |
| **Development** | Railway PostgreSQL | `migrate deploy` | ❌ No |
| **Production** | Railway PostgreSQL | `migrate deploy` | ❌ No |

**Quy tắc vàng:**
- 🏠 **Local** → Dùng SQLite + `migrate dev`
- 🧪 **Development** → Railway Dev + `migrate deploy` (auto)
- 🚀 **Production** → Railway Prod + `migrate deploy` (auto)


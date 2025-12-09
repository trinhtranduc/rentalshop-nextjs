# 🗄️ Database Migration Workflow: Dev → Production

Hướng dẫn chi tiết workflow migration từ development đến production với case cụ thể.

---

## 📋 Table of Contents

1. [Workflow Overview](#-workflow-overview)
2. [Case Study: Thêm Column mới](#-case-study-thêm-column-mới)
3. [Step-by-Step Guide](#-step-by-step-guide)
4. [Troubleshooting](#-troubleshooting)

---

## 🎯 Workflow Overview

```
┌─────────────────┐
│ 1. Modify Schema│  (Local/Dev)
│  prisma/schema  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. Create       │  (Local)
│ Migration       │
│ yarn db:migrate │
│     :dev        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. Test         │  (Local/Dev DB)
│ Migration       │
│ yarn db:migrate │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. Commit       │  (Git)
│ Migration Files │
│ git add         │
│ git commit      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. Deploy Dev   │  (Railway Dev)
│ Railway auto    │
│ runs migration  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 6. Test Dev     │  (Verify)
│ Verify changes  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 7. Deploy Prod  │  (Railway Prod)
│ Railway auto    │
│ runs migration  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 8. Verify Prod  │  (Done!)
│ All good!       │
└─────────────────┘
```

---

## 📝 Case Study: Thêm Column mới

**Scenario:** Bạn muốn thêm column `permissionsChangedAt` vào bảng `User` để track khi permissions thay đổi.

### Step 1: Modify Schema (Local)

**File:** `prisma/schema.prisma`

```prisma
model User {
  id                    Int       @id @default(autoincrement())
  email                 String    @unique
  password              String
  // ... other fields ...
  passwordChangedAt    DateTime? // Existing field
  permissionsChangedAt  DateTime? // ✅ NEW FIELD - Add this line
  createdAt            DateTime  @default(now())
  // ... rest of fields ...
}
```

### Step 2: Create Migration (Local)

```bash
# Tạo migration file
yarn db:migrate:dev --name add_permissions_changed_at

# Output:
# ✔ Migration `20251205103926_add_permissions_changed_at` created
# 
# The following migration(s) have been applied:
# migrations/
#   └─ 20251205103926_add_permissions_changed_at/
#       └─ migration.sql
```

**Migration file được tạo:**
```
prisma/migrations/20251205103926_add_permissions_changed_at/migration.sql
```

**Nội dung migration:**
```sql
-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "permissionsChangedAt" TIMESTAMP(3);
```

### Step 3: Test Migration (Local)

```bash
# Check migration status
yarn db:migrate:status

# Apply migration to local database
yarn db:migrate

# Verify column đã được thêm
npx prisma studio
# Hoặc check database trực tiếp
```

**Verify trong Prisma Studio:**
1. Run: `npx prisma studio`
2. Open `User` table
3. Check column `permissionsChangedAt` đã có

### Step 4: Commit Migration Files

```bash
# Add migration files
git add prisma/schema.prisma
git add prisma/migrations/20251205103926_add_permissions_changed_at/

# Commit
git commit -m "feat: add permissionsChangedAt column to User model"

# Push to dev branch
git push origin dev
```

**⚠️ QUAN TRỌNG:** 
- ✅ Commit cả `schema.prisma` và `migrations/` folder
- ✅ KHÔNG commit `.env` hoặc database files
- ✅ Migration files phải được track trong git

### Step 5: Deploy to Development (Railway Auto)

**Railway tự động chạy migration khi deploy:**

1. **Git push trigger Railway build:**
   ```bash
   git push origin dev
   ```

2. **Railway build process:**
   - Build Docker image
   - Run `start.sh` script
   - `start.sh` tự động chạy: `npx prisma migrate deploy`
   - Migration được apply vào dev database

3. **Check logs:**
   ```bash
   railway logs --service dev-apis --tail 100
   ```

   **Expected output:**
   ```
   📦 Step 4: Running database migrations...
   Applying migration `20251205103926_add_permissions_changed_at`
   ✅ All migrations applied successfully
   ```

### Step 6: Test trên Development

```bash
# Test API endpoint
curl https://dev-api.anyrent.shop/api/health

# Test với code mới (nếu có)
# Verify column được sử dụng đúng
```

**Verify trong code:**
```typescript
// packages/auth/src/auth.ts
const user = await prisma.user.create({
  data: {
    email: 'test@example.com',
    password: hashedPassword,
    permissionsChangedAt: new Date(), // ✅ New field works!
  }
});
```

### Step 7: Deploy to Production

**Sau khi test OK trên dev:**

```bash
# Merge dev → main
git checkout main
git merge dev
git push origin main
```

**Railway production tự động:**
- Build Docker image
- Run migration: `npx prisma migrate deploy`
- Apply migration vào production database

**Check production logs:**
```bash
railway logs --service apis --tail 100
```

### Step 8: Verify Production

```bash
# Test production API
curl https://api.anyrent.shop/api/health

# Verify migration status
railway run --service apis npx prisma migrate status --schema=./prisma/schema.prisma
```

**Expected output:**
```
Database schema is up to date!
```

---

## 🔧 Manual Migration (Nếu cần)

### Nếu Railway auto-migration không chạy

**Option 1: Railway Dashboard (Khuyến nghị)**

1. Mở Railway Dashboard: https://railway.app
2. Chọn project → **production** environment
3. Chọn service **API** (`apis` hoặc `api`)
4. Vào tab **Deployments** → **Run Command**
5. Chạy:
   ```bash
   npx prisma migrate deploy --schema=./prisma/schema.prisma
   ```

**Option 2: Railway CLI với Public DATABASE_URL**

```bash
# Set public DATABASE_URL
export DATABASE_URL="postgresql://postgres:password@proxy.rlwy.net:port/railway"

# Run migration
npx prisma migrate deploy --schema=./prisma/schema.prisma

# Verify
npx prisma migrate status --schema=./prisma/schema.prisma

# Clean up
unset DATABASE_URL
```

---

## ⚠️ Troubleshooting

### Migration Failed trên Production

**Error:** `P3018: A migration failed to apply`

**Giải pháp:**
```bash
# Resolve failed migration
npx prisma migrate resolve --rolled-back <migration-name> --schema=./prisma/schema.prisma

# Hoặc mark as applied nếu đã apply thủ công
npx prisma migrate resolve --applied <migration-name> --schema=./prisma/schema.prisma

# Chạy lại migration
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

### Migration File có Syntax Error

**Error:** `syntax error at or near "Error"`

**Nguyên nhân:** Migration file chứa error message thay vì SQL

**Giải pháp:**
1. Fix migration file SQL
2. Resolve migration failed
3. Chạy lại migration

### Database Out of Sync

**Error:** `Migration out of sync`

**Giải pháp:**
```bash
# Check migration status
npx prisma migrate status --schema=./prisma/schema.prisma

# Sync database với schema
npx prisma db push --schema=./prisma/schema.prisma

# Hoặc reset (⚠️ data loss)
npx prisma migrate reset --schema=./prisma/schema.prisma
```

---

## 📝 Best Practices

### ✅ DO

- ✅ **Luôn test migration trên local trước**
- ✅ **Commit migration files vào git**
- ✅ **Test trên dev trước khi deploy production**
- ✅ **Backup database trước khi chạy migration production**
- ✅ **Review migration SQL trước khi commit**

### ❌ DON'T

- ❌ **KHÔNG sửa migration files đã được apply**
- ❌ **KHÔNG skip testing trên dev**
- ❌ **KHÔNG chạy migration production mà không backup**
- ❌ **KHÔNG commit `.env` files**

---

## 🎯 Quick Reference

### Commands

```bash
# Create migration
yarn db:migrate:dev --name <migration-name>

# Check status
yarn db:migrate:status

# Apply migration (local)
yarn db:migrate

# Apply migration (production - manual)
railway run --service apis npx prisma migrate deploy --schema=./prisma/schema.prisma

# Resolve failed migration
npx prisma migrate resolve --rolled-back <migration-name> --schema=./prisma/schema.prisma
```

### Workflow Summary

1. **Modify** `prisma/schema.prisma`
2. **Create** migration: `yarn db:migrate:dev`
3. **Test** locally
4. **Commit** migration files
5. **Push** to dev → Railway auto-deploys
6. **Test** on dev
7. **Merge** to main → Railway auto-deploys
8. **Verify** production

---

## 📚 Related Docs

- `DATABASE_MIGRATION_GUIDE.md` - Detailed migration guide
- `RAILWAY_DEPLOY.md` - Railway deployment guide
- `MIGRATION_SAFETY_GUIDE.md` - Safety best practices


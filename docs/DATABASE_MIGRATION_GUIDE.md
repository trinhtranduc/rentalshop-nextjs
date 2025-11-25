# 🗄️ Database Migration Guide

Hướng dẫn chi tiết về cách modify database và chạy migration trên cả development và production.

---

## 📋 Table of Contents

1. [Quick Start](#-quick-start)
2. [Migration Workflow](#-migration-workflow)
3. [Development](#-development)
4. [Production (Railway)](#-production-railway)
5. [Troubleshooting](#-troubleshooting)

---

## ⚡ Quick Start

### 1. Modify Schema

```bash
# Edit prisma/schema.prisma
# Add/modify models, fields, indexes, etc.
```

### 2. Create Migration (Development)

```bash
# Create migration file
yarn db:migrate:dev

# Or with custom name
npx prisma migrate dev --name add_password_reset --schema=./prisma/schema.prisma
```

### 3. Test Migration (Local)

```bash
# Check migration status
yarn db:migrate:status

# Apply migration
yarn db:migrate
```

### 4. Deploy to Production

```bash
# Commit migration files
git add prisma/migrations/
git commit -m "feat: add password reset functionality"
git push origin main

# Railway sẽ tự động deploy và chạy migration
```

---

## 🔄 Migration Workflow

### Development Workflow

```mermaid
graph LR
    A[Modify schema.prisma] --> B[Create Migration]
    B --> C[Test Locally]
    C --> D[Commit & Push]
    D --> E[Railway Auto Deploy]
```

### Step-by-Step

1. **Modify Schema** (`prisma/schema.prisma`)
   ```prisma
   model PasswordReset {
     id        Int       @id @default(autoincrement())
     userId    Int
     token     String    @unique
     // ... other fields
   }
   ```

2. **Create Migration** (Development only)
   ```bash
   # This creates migration file and applies it
   yarn db:migrate:dev
   
   # Or create migration without applying
   npx prisma migrate dev --name add_password_reset --create-only
   ```

3. **Review Migration File**
   ```bash
   # Check generated migration
   cat prisma/migrations/[timestamp]_add_password_reset/migration.sql
   ```

4. **Test Locally**
   ```bash
   # Reset database and apply all migrations
   npx prisma migrate reset --schema=./prisma/schema.prisma
   
   # Or just apply pending migrations
   yarn db:migrate
   ```

5. **Commit Changes**
   ```bash
   git add prisma/schema.prisma prisma/migrations/
   git commit -m "feat: add password reset functionality"
   git push origin main
   ```

---

## 💻 Development

### Local Development Setup

```bash
# 1. Set DATABASE_URL in .env
DATABASE_URL="postgresql://user:password@localhost:5432/rentalshop_dev"

# 2. Create migration
yarn db:migrate:dev

# 3. Generate Prisma Client
yarn db:generate

# 4. Check status
yarn db:migrate:status
```

### Development Commands

```bash
# Create new migration (interactive)
yarn db:migrate:dev

# Create migration with name
npx prisma migrate dev --name migration_name --schema=./prisma/schema.prisma

# Apply pending migrations
yarn db:migrate

# Check migration status
yarn db:migrate:status

# Reset database (⚠️ deletes all data)
npx prisma migrate reset --schema=./prisma/schema.prisma

# Generate Prisma Client
yarn db:generate
```

### Using Migration Script

```bash
# Development mode (can create new migrations)
./scripts/migrate-database.sh dev

# Or
bash scripts/migrate-database.sh dev
```

---

## 🚀 Production (Railway)

### Automatic Migration (Recommended)

Migration tự động chạy khi deploy trên Railway:

1. **Build Time** (Dockerfile)
   ```dockerfile
   # Migration chạy trong Dockerfile build step
   # Railway tự động inject DATABASE_URL vào environment
   RUN npx prisma migrate deploy --schema=./prisma/schema.prisma
   ```

2. **Runtime** (start.sh)
   ```bash
   # Backup migration trong start.sh
   # Sử dụng DATABASE_URL từ Railway environment variables
   npx prisma migrate deploy --schema=../../prisma/schema.prisma
   ```

### ⚠️ Important: DATABASE_URL trên Railway

**Railway tự động cung cấp DATABASE_URL:**

- ✅ **Không cần public URL** - Railway tự động inject DATABASE_URL
- ✅ **Internal network** - Migration chạy trong cùng network với database
- ✅ **Tự động** - Không cần cấu hình thêm

**Cách Railway hoạt động:**

1. **Railway tự động set DATABASE_URL:**
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   ```
   - Railway inject URL từ PostgreSQL service
   - URL có thể là internal (`railway.internal`) hoặc public (`proxy.rlwy.net`)
   - Migration tự động sử dụng URL này

2. **Migration chạy trong Railway network:**
   - Build time: Migration chạy trong Docker build (có DATABASE_URL)
   - Runtime: Migration chạy trong container (có DATABASE_URL)
   - Cả 2 đều trong Railway network → không cần public URL

3. **Chỉ cần public URL nếu:**
   - ❌ Chạy migration từ local machine (testing)
   - ❌ Debug từ local
   - ✅ **KHÔNG cần** khi deploy trên Railway (tự động)

### Manual Migration (If Needed)

```bash
# 1. Login to Railway
railway login

# 2. Link to project
railway link

# 3. Run migration
# Railway tự động inject DATABASE_URL - KHÔNG cần set manual
railway run yarn railway:migrate

# Or use script
railway run yarn db:migrate

# 4. Check status
railway run yarn db:migrate:status
```

**Lưu ý:** Khi dùng `railway run`, Railway tự động:
- ✅ Inject DATABASE_URL từ PostgreSQL service
- ✅ Chạy command trong Railway network
- ✅ Không cần public URL hoặc manual config

### Railway CLI Commands

```bash
# Run migration on Railway
railway run yarn railway:migrate

# Generate Prisma Client
railway run yarn railway:generate

# Check migration status
railway run yarn db:migrate:status

# Full setup (generate + migrate + seed)
railway run yarn railway:setup
```

### Using Migration Script on Railway

```bash
# Production mode (safe, no new migrations)
railway run bash scripts/migrate-database.sh prod
```

---

## 🔍 Migration Status

### Check Migration Status

```bash
# Local
yarn db:migrate:status

# Railway
railway run yarn db:migrate:status
```

### Expected Output

```
Database migrations status:
✅ 20251031141300_baseline
✅ 20251031153417_add_email_verification_fields
✅ 20251118131443_add_password_reset

Your database is up to date.
```

---

## ⚠️ Important Notes

### Development vs Production

| Command | Development | Production |
|---------|-------------|------------|
| **Create Migration** | `migrate dev` ✅ | `migrate dev` ❌ |
| **Apply Migration** | `migrate dev` ✅ | `migrate deploy` ✅ |
| **Reset Database** | `migrate reset` ✅ | `migrate reset` ❌ |

### Best Practices

1. ✅ **Always test migrations locally first**
   ```bash
   yarn db:migrate:dev  # Test locally
   git commit           # Commit migration files
   git push             # Deploy to Railway
   ```

2. ✅ **Use `migrate deploy` on production**
   ```bash
   # ✅ CORRECT: Production
   npx prisma migrate deploy
   
   # ❌ WRONG: Production
   npx prisma migrate dev  # This creates new migrations!
   ```

3. ✅ **Review migration files before committing**
   ```bash
   # Always review SQL before committing
   cat prisma/migrations/[timestamp]_*/migration.sql
   ```

4. ✅ **Backup database before major migrations**
   ```bash
   # Railway: Use Railway's database backup feature
   # Or export manually
   railway run pg_dump $DATABASE_URL > backup.sql
   ```

5. ✅ **Use transactions for safety**
   ```sql
   -- Migration files automatically use transactions
   -- But you can wrap manually if needed
   BEGIN;
   -- Your migration SQL
   COMMIT;
   ```

---

## 🐛 Troubleshooting

### Migration Failed

```bash
# 1. Check logs
railway logs --service api

# 2. Check migration status
railway run yarn db:migrate:status

# 3. Try manual migration
railway run yarn railway:migrate

# 4. If stuck, check migration history
railway run npx prisma migrate status --schema=./prisma/schema.prisma
```

### Migration Already Applied

```
Error: Migration already applied
```

**Solution:** Migration đã được apply, không cần làm gì. Đây là normal behavior.

### Database Connection Failed

```
Error: Can't reach database server
```

**Solution:**

**Nếu chạy trên Railway:**
```bash
# 1. Check DATABASE_URL được inject tự động
railway run echo $DATABASE_URL

# 2. Verify PostgreSQL service được link
railway variables | grep DATABASE_URL

# 3. Test connection
railway run npx prisma db pull --schema=./prisma/schema.prisma
```

**Nếu chạy từ local (testing):**
```bash
# Cần public DATABASE_URL từ Railway Dashboard
# Railway Dashboard → PostgreSQL → Connect → Public Network

# Set public URL
export DATABASE_URL="postgresql://postgres:password@proxy.rlwy.net:port/railway"

# Then run migration
yarn db:migrate
```

**Lưu ý:**
- ✅ **Trên Railway:** Không cần public URL - Railway tự động inject
- ⚠️ **Từ local:** Cần public URL để test (chỉ dùng cho testing)

### Migration Out of Sync

```
Error: Migration out of sync
```

**Solution:**
```bash
# 1. Check migration status
yarn db:migrate:status

# 2. Resolve manually or reset (⚠️ data loss)
npx prisma migrate reset --schema=./prisma/schema.prisma
```

### Prisma Client Not Generated

```
Error: Prisma Client not generated
```

**Solution:**
```bash
# Generate Prisma Client
yarn db:generate

# Or on Railway
railway run yarn railway:generate
```

---

## 📝 Migration File Structure

```
prisma/
├── schema.prisma              # Database schema
└── migrations/
    ├── 20251031141300_baseline/
    │   └── migration.sql
    ├── 20251031153417_add_email_verification_fields/
    │   └── migration.sql
    └── 20251118131443_add_password_reset/
        └── migration.sql
```

### Migration File Format

```sql
-- Migration: Add PasswordReset model
-- Created: 2025-01-15

-- Create table
CREATE TABLE IF NOT EXISTS "PasswordReset" (
    "id" SERIAL NOT NULL,
    -- ... fields
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "PasswordReset_userId_idx" ON "PasswordReset"("userId");

-- Add foreign keys
ALTER TABLE "PasswordReset" 
ADD CONSTRAINT "PasswordReset_userId_fkey" 
FOREIGN KEY ("userId") REFERENCES "User"("id") 
ON DELETE CASCADE;
```

---

## 🎯 Current Migration: Password Reset

Migration mới nhất: `20251118131443_add_password_reset`

### What it does:

- ✅ Creates `PasswordReset` table
- ✅ Adds indexes for performance
- ✅ Adds foreign key to `User` table
- ✅ Sets up cascade delete

### To apply:

```bash
# Development
yarn db:migrate:dev

# Production (Railway)
# Automatically applied on deploy
# Or manually:
railway run yarn railway:migrate
```

---

## 📚 Additional Resources

- [Prisma Migrate Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Railway Database Docs](https://docs.railway.app/databases/postgresql)
- [Migration Best Practices](https://www.prisma.io/docs/guides/migrate/production-troubleshooting)

---

## ✅ Checklist

Khi modify database:

- [ ] Modify `prisma/schema.prisma`
- [ ] Create migration: `yarn db:migrate:dev`
- [ ] Review migration SQL file
- [ ] Test locally: `yarn db:migrate`
- [ ] Commit migration files
- [ ] Push to GitHub
- [ ] Verify Railway auto-deploy
- [ ] Check migration status on Railway
- [ ] Test functionality on production

---

**Last Updated:** 2025-01-15  
**Migration Version:** 20251118131443_add_password_reset


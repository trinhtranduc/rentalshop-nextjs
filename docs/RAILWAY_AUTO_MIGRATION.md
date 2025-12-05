# Railway Automatic Migration Guide

## ✅ Migration Tự Động trên Railway

Hệ thống đã được cấu hình để **tự động chạy migration** khi deploy trên Railway.

## 🔄 Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  1. Developer tạo migration                                │
│     yarn db:migrate:dev                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Commit migration files vào git                          │
│     git add prisma/migrations/                               │
│     git commit -m "feat: add permissionsChangedAt"           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Push lên git repository                                 │
│     git push origin main                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Railway tự động trigger build                           │
│     - Build Docker image từ Dockerfile                      │
│     - Copy migration files vào image                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Railway start container                                 │
│     - Chạy start.sh script                                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  6. start.sh tự động chạy migration                         │
│     - npx prisma migrate deploy                             │
│     - Apply tất cả pending migrations                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│  7. Server start sau khi migration thành công               │
│     - Next.js server chạy trên port 3002                    │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Files Liên Quan

### 1. Dockerfile (`apps/api/Dockerfile`)

```dockerfile
# Copy Prisma schema AND migrations (needed for runtime migrations)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copy start script (runs migrations + starts server)
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/start.sh ./apps/api/start.sh

# Start command runs start.sh
CMD ["sh", "start.sh"]
```

**Quan trọng**: Migration files được copy vào Docker image, đảm bảo Railway có thể chạy migration.

### 2. start.sh (`apps/api/start.sh`)

Script này tự động:
1. Generate Prisma Client
2. Check database connection
3. **Run pending migrations** (`prisma migrate deploy`)
4. Verify migration results
5. Start Next.js server

```bash
# Step 4: Run Database Migrations
npx prisma migrate deploy --schema="${SCHEMA_PATH}"
```

### 3. railway.json (`apps/api/railway.json`)

```json
{
  "deploy": {
    "startCommand": "cd apps/api && sh start.sh"
  }
}
```

Railway sẽ chạy `start.sh` khi container start.

## 🚀 Cách Sử Dụng

### Development (Local)

```bash
# 1. Modify schema
# Edit prisma/schema.prisma

# 2. Create migration
yarn db:migrate:dev

# 3. Test locally
yarn db:migrate:status

# 4. Commit và push
git add prisma/migrations/
git commit -m "feat: add new field"
git push origin main
```

### Production/Staging (Railway)

**Tự động**: Railway sẽ tự động:
1. Build Docker image
2. Copy migration files
3. Run `start.sh`
4. `start.sh` chạy `prisma migrate deploy`
5. Apply pending migrations
6. Start server

**Không cần manual intervention!**

## ⚠️ Important Notes

### 1. Migration Files Phải Có Trong Git

```bash
# ✅ CORRECT: Commit migration files
git add prisma/migrations/
git commit -m "feat: add migration"
git push

# ❌ WRONG: Không commit migration files
# Railway sẽ không có migration files để chạy!
```

### 2. Không Tạo Migration Thủ Công trên Production

```bash
# ❌ WRONG: Không chạy migrate dev trên production
railway run yarn db:migrate:dev

# ✅ CORRECT: Migration tự động chạy qua start.sh
# Chỉ cần commit và push migration files
```

### 3. Migration Files Phải Idempotent

Sử dụng `IF NOT EXISTS` để tránh lỗi khi migration đã được apply:

```sql
-- ✅ GOOD: Idempotent
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "permissionsChangedAt" TIMESTAMP(3);

-- ❌ BAD: Sẽ lỗi nếu column đã tồn tại
ALTER TABLE "User" ADD COLUMN "permissionsChangedAt" TIMESTAMP(3);
```

### 4. Kiểm Tra Migration Status

```bash
# Local
yarn db:migrate:status

# Railway
railway run yarn db:migrate:status
```

## 🔍 Troubleshooting

### Migration Không Chạy Tự Động

**Kiểm tra:**
1. Migration files có trong git không?
   ```bash
   git ls-files prisma/migrations/
   ```

2. Dockerfile có copy migrations không?
   ```dockerfile
   COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
   ```

3. start.sh có chạy migrate deploy không?
   ```bash
   npx prisma migrate deploy --schema="${SCHEMA_PATH}"
   ```

4. Railway logs có show migration không?
   ```bash
   railway logs --service api
   ```

### Migration Failed trên Railway

**Kiểm tra logs:**
```bash
railway logs --service api | grep -i migration
```

**Common issues:**
- Database connection timeout → Migration sẽ retry tự động
- Migration conflict → Cần resolve manually
- Missing migration files → Đảm bảo commit vào git

### Manual Migration (Nếu Cần)

Chỉ khi migration tự động fail:

```bash
# Connect to Railway
railway link

# Run migration manually
railway run yarn db:migrate

# Check status
railway run yarn db:migrate:status
```

## 📊 Migration Status trên Railway

Sau khi deploy, check logs:

```bash
railway logs --service api
```

Tìm các dòng:
```
✅ All migrations applied successfully
✅ Database schema is up to date
```

## 🎯 Best Practices

1. ✅ **Luôn test migration locally trước**
   ```bash
   yarn db:migrate:dev  # Test locally
   git commit           # Commit migration files
   git push             # Deploy to Railway
   ```

2. ✅ **Review migration SQL trước khi commit**
   ```bash
   cat prisma/migrations/[timestamp]_*/migration.sql
   ```

3. ✅ **Sử dụng IF NOT EXISTS cho safety**
   ```sql
   ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "newField" TEXT;
   ```

4. ✅ **Commit migration files cùng với code changes**
   ```bash
   git add prisma/schema.prisma prisma/migrations/
   git commit -m "feat: add new feature with migration"
   ```

5. ✅ **Monitor Railway logs sau khi deploy**
   ```bash
   railway logs --service api --tail
   ```

## ✅ Summary

- ✅ Migration tự động chạy khi deploy trên Railway
- ✅ Không cần manual intervention
- ✅ Migration files phải có trong git
- ✅ start.sh tự động chạy `prisma migrate deploy`
- ✅ Server start sau khi migration thành công

**Workflow đơn giản**: Modify schema → Create migration → Commit → Push → Railway tự động deploy và chạy migration! 🚀


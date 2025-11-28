# 🚀 Hướng Dẫn Migrate Prisma với Railway

Hướng dẫn đơn giản về cách migrate Prisma database trên Railway.

---

## 🎯 2 Cách Cơ Bản

### Cách 1: Chạy Migration Thủ Công (Manual)

**Khi nào dùng:**
- ✅ Cần chạy migration ngay lập tức
- ✅ Debug hoặc test migration
- ✅ Emergency fix

**Cách làm:**

```bash
# 1. Mở Terminal trên máy của bạn
cd /Users/mac/Source-Code/rentalshop-nextjs

# 2. Chạy migration
# Development
railway run --service dev-apis yarn railway:migrate

# Production
railway run --service apis yarn railway:migrate
```

**Xong!** Migration sẽ chạy ngay lập tức.

---

### Cách 2: Commit Migration - Tự Động Qua Docker (Khuyến nghị) ⭐

**Khi nào dùng:**
- ✅ Cách chuẩn - dùng cho mọi trường hợp
- ✅ Migration tự động chạy khi deploy
- ✅ Không cần can thiệp thủ công

**Cách làm:**

```bash
# 1. Tạo migration (local)
yarn db:migrate:dev

# 2. Commit và push
git add prisma/
git commit -m "feat: add migration"
git push

# 3. Railway tự động:
#    - Build Docker image
#    - Deploy container
#    - Chạy migration tự động (qua start.sh)
#    - Start server

# Xong! Không cần làm gì thêm!
```

**Cách hoạt động:**

```
Git Push
  ↓
Railway Build Docker Image
  ↓
Railway Start Container
  ↓
start.sh tự động chạy: prisma migrate deploy
  ↓
Next.js Server Start
```

**Ưu điểm:**
- ✅ Tự động - không cần can thiệp
- ✅ An toàn - có retry logic
- ✅ Consistent - mỗi deploy đều chạy migration

---

## 📋 So Sánh 2 Cách

| Aspect | Cách 1: Thủ Công | Cách 2: Tự Động |
|--------|------------------|-----------------|
| **Effort** | ⚠️ Phải gõ command | ✅ Chỉ commit & push |
| **Khi nào dùng** | Debug, emergency | Mọi trường hợp |
| **An toàn** | ⚠️ Có thể miss | ✅ Luôn chạy |
| **Khuyến nghị** | ❌ Chỉ khi cần | ✅ **Dùng cách này!** |

---

## 🎯 Quick Reference

### Development Commands

```bash
# Tạo migration mới
yarn db:migrate:dev

# Apply migrations
yarn db:migrate

# Check status
yarn db:migrate:status
```

### Railway Commands

```bash
# Chạy migration thủ công
railway run --service dev-apis yarn railway:migrate  # Dev
railway run --service apis yarn railway:migrate      # Prod

# Check status
railway run --service dev-apis yarn db:migrate:status
```

---

## ✅ Làm Sao Biết Migration Thành Công?

### Cách 1: Check Database Sync (Khuyến nghị) ⭐

**So sánh migration status giữa Local và Railway:**

```bash
# Check sync với dev-apis (default)
yarn db:check-sync

# Hoặc chỉ định service
yarn db:check-sync:dev   # Development
yarn db:check-sync:prod  # Production

# Hoặc dùng script trực tiếp
./scripts/check-db-sync.sh dev-apis
./scripts/check-db-sync.sh apis
```

**Output mẫu (Đồng bộ):**
```
✅ DATABASES ARE IN SYNC!
   Both local and Railway have all migrations applied.
```

**Output mẫu (Không đồng bộ):**
```
❌ Railway database is OUT OF SYNC
   Missing migrations on Railway:
      - 20251121153338_create_outlet_stock
      - 20251128000000_add_custom_merchant_roles

💡 To fix, run:
   railway run --service dev-apis yarn railway:migrate
```

### Cách 2: Check Migration Status (Manual)

```bash
# Local
yarn db:migrate:status

# Railway Development
railway run --service dev-apis yarn db:migrate:status

# Railway Production
railway run --service apis yarn db:migrate:status
```

**Output mẫu (Thành công):**
```
Database migrations status:
✅ 20250101_baseline
✅ 20250102_add_feature
✅ 20250103_add_new_table

Your database is up to date.
```

**Output mẫu (Có migration chưa apply):**
```
Database migrations status:
✅ 20250101_baseline
✅ 20250102_add_feature
⚠️  20250103_add_new_table (not yet applied)
```

### Cách 2: Xem Logs trên Railway

```bash
# Xem logs real-time
railway logs --service dev-apis -f

# Hoặc xem logs gần nhất
railway logs --service dev-apis --tail 50
```

**Tìm dòng này trong logs:**
```
✅ All migrations applied successfully
Database schema is up to date
```

### Cách 3: Xem Railway Dashboard

1. Mở Railway Dashboard: https://railway.app
2. Chọn service (dev-apis hoặc apis)
3. Click tab "Logs"
4. Tìm dòng: `✅ Migration completed successfully`

### Cách 4: Test Application

Nếu migration thêm table/column mới:
- ✅ Test API endpoint liên quan
- ✅ Check database có table/column mới
- ✅ Application hoạt động bình thường

---

## 🐛 Troubleshooting

### Lỗi: P1001 - Can't Reach Database Server

**Error:**
```
Error: P1001: Can't reach database server at `dev-tenant-database.railway.internal:5432`
```

**Nguyên nhân:**
1. ❌ DATABASE_URL chưa được set đúng (hardcoded URL thay vì reference)
2. ❌ Database service chưa sẵn sàng
3. ❌ Service name không đúng

**Fix nhanh:**

#### Bước 1: Check DATABASE_URL

```bash
# Check DATABASE_URL hiện tại
railway variables --service dev-apis | grep DATABASE_URL

# Check trong container
railway run --service dev-apis echo \$DATABASE_URL
```

#### Bước 2: Set DATABASE_URL Đúng

```bash
# Option 1: Dùng reference (Khuyến nghị)
railway variables --set DATABASE_URL='${{dev-tenant-database.DATABASE_URL}}' --service dev-apis

# Option 2: Nếu service name khác, tìm đúng service name
# Railway Dashboard → Services → Tìm PostgreSQL service
# Copy service name và thay vào:
railway variables --set DATABASE_URL='${{<service-name>.DATABASE_URL}}' --service dev-apis
```

#### Bước 3: Verify Database Service Đang Chạy

```bash
# Check database service logs
railway logs --service dev-tenant-database --tail 20

# Nếu thấy "listening on port 5432" → Database đang chạy
# Nếu không thấy → Database chưa ready, đợi thêm
```

#### Bước 4: Redeploy Service (Nếu cần)

```bash
# Trigger redeploy để apply DATABASE_URL mới
# Railway Dashboard → dev-apis → Deployments → Redeploy
# Hoặc push code mới để trigger deploy
```

#### Bước 5: Chạy Migration Lại

```bash
# Sau khi DATABASE_URL đúng và database ready
railway run --service dev-apis yarn railway:migrate
```

**Lưu ý:**
- ✅ DATABASE_URL phải dùng reference format: `${{ServiceName.DATABASE_URL}}`
- ✅ Service name phải đúng (check trong Railway Dashboard)
- ✅ Database service phải đang chạy (check logs)
- ⚠️ Có thể cần đợi 1-2 phút sau khi set DATABASE_URL

### Lỗi: Migration Already Applied

- ✅ Đây là normal - migration đã được apply
- ✅ Không cần làm gì, server sẽ start bình thường

### Lỗi: Migration Failed - P3009 (Failed Migrations)

**Error:**
```
Error: P3009
migrate found failed migrations in the target database, new migrations will not be applied.
The `20251121153338_create_outlet_stock` migration started at 2025-11-21 08:39:02.241877 UTC failed
```

**Nguyên nhân:**
- Có migration đã failed trước đó trong database
- Prisma không cho phép chạy migration mới khi có migration failed
- Cần resolve failed migration trước

**Fix:**

#### Option 1: Dùng Script (Khuyến nghị)

```bash
# Resolve migration (nếu migration đã được apply thủ công)
./scripts/resolve-failed-migration.sh 20251121153338_create_outlet_stock --applied

# Hoặc rollback (nếu migration chưa được apply)
./scripts/resolve-failed-migration.sh 20251121153338_create_outlet_stock --rolled-back

# Sau đó chạy migration lại
railway run --service dev-apis yarn railway:migrate
```

#### Option 2: Manual Resolve (Nếu script không hoạt động)

**Nếu `railway run` không kết nối được database (P1001):**

1. **Lấy Public DATABASE_URL từ Railway Dashboard:**
   - Railway Dashboard → PostgreSQL service → Connect → Public Network
   - Copy public URL

2. **Set DATABASE_URL và resolve:**
   ```bash
   # Set public DATABASE_URL
   export DATABASE_URL="postgresql://postgres:password@proxy.rlwy.net:port/railway"
   
   # Resolve migration
   npx prisma migrate resolve --applied 20251121153338_create_outlet_stock --schema=./prisma/schema.prisma
   
   # Hoặc rollback
   npx prisma migrate resolve --rolled-back 20251121153338_create_outlet_stock --schema=./prisma/schema.prisma
   ```

3. **Sau đó chạy migration lại:**
   ```bash
   railway run --service dev-apis yarn railway:migrate
   ```

#### Option 3: Check Migration Status Trước

```bash
# Check migration status để xem migration nào failed
railway logs --service dev-apis --tail 100 | grep -i "failed\|P3009"

# Sau đó resolve theo Option 1 hoặc 2
```

**Lưu ý:**
- ✅ `--applied`: Dùng nếu migration đã được apply thủ công hoặc đã thành công
- ✅ `--rolled-back`: Dùng nếu muốn rollback migration failed
- ⚠️ Chỉ resolve khi bạn chắc chắn về trạng thái của migration

### Lỗi: Migration Failed (General)

**Check logs:**
```bash
railway logs --service dev-apis --tail 100
```

**Tìm lỗi cụ thể và fix theo error message.**

### Lỗi: start.sh syntax error: unexpected redirection

**Error:**
```
start.sh: line 57: syntax error: unexpected redirection
```

**Nguyên nhân:**
- `<<<` (here-string) không được hỗ trợ trong `/bin/sh` trên Alpine Linux
- Script đang dùng bash-specific syntax

**Fix:**
- ✅ **Đã được fix trong code** (dùng `echo ... |` thay vì `<<<`)
- ✅ **Đã commit và push** (commit: c36e7a85)

**Verify fix:**
```bash
# Check start.sh line 57
grep -n "echo.*prisma db execute" apps/api/start.sh

# Should show:
# 57:  if echo "SELECT 1;" | npx prisma db execute --stdin --schema="${SCHEMA_PATH}" > /dev/null 2>&1; then
```

**Nếu vẫn thấy lỗi trong logs:**
- ⚠️ Có thể là logs cũ (trước khi deploy fix)
- ✅ Đợi Railway deploy code mới (sau khi push)
- ✅ Check logs mới nhất: `railway logs --service dev-apis --tail 20`

---

## ✅ Checklist

### Khi Tạo Migration Mới

- [ ] Modify `prisma/schema.prisma`
- [ ] Create migration: `yarn db:migrate:dev`
- [ ] Review migration SQL file
- [ ] Test locally: `yarn db:migrate`
- [ ] Commit migration files
- [ ] Push to GitHub
- [ ] Railway tự động deploy và chạy migration

---

## 📚 Tóm Tắt

**Cách chuẩn (Khuyến nghị):**
```bash
yarn db:migrate:dev  # Tạo migration
git commit && git push  # Commit & push
# Railway tự động chạy migration qua Docker
```

**Cách thủ công (Nếu cần):**
```bash
railway run --service dev-apis yarn railway:migrate
```

**Kết luận:** Dùng Cách 2 (tự động) cho mọi trường hợp! ✅

---

**Last Updated:** 2025-01-15

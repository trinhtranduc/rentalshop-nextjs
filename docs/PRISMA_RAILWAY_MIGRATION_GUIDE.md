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

### Cách 1: Check Migration Status (Khuyến nghị)

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

**Fix nhanh:**

```bash
# 1. Check database service name
railway service list

# 2. Set DATABASE_URL đúng
railway variables --set DATABASE_URL='${{dev-tenant-database.DATABASE_URL}}' --service dev-apis

# 3. Chạy migration lại
railway run --service dev-apis yarn railway:migrate
```

### Lỗi: Migration Already Applied

- ✅ Đây là normal - migration đã được apply
- ✅ Không cần làm gì, server sẽ start bình thường

### Lỗi: Migration Failed

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
- ✅ Đã được fix trong code
- ✅ Commit và push lại để deploy fix

**Nếu vẫn gặp lỗi:**
```bash
# Pull latest code
git pull

# Commit và push lại
git add apps/api/start.sh
git commit -m "fix: replace <<< with echo pipe for sh compatibility"
git push
```

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

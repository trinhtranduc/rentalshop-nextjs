# Production Migration Fix - PaymentTransaction Error

## 🔴 Vấn đề

Khi commit và Railway trigger Docker build, migration bị lỗi:
```
ERROR:  relation "PaymentTransaction" does not exist
CONTEXT:  SQL statement "ALTER TABLE "PaymentTransaction" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD'"
```

## 🔍 Nguyên nhân

1. **Có script SQL cũ** trong production database đang cố gắng thêm `currency` vào table `PaymentTransaction`
2. **Table đúng là `Payment`** (không phải `PaymentTransaction`)
3. Script này có thể là:
   - Migration cũ chưa được cleanup
   - Script SQL được execute trực tiếp trong production
   - Migration được tạo tự động bởi Prisma nhưng có lỗi

## ✅ Giải pháp

### 1. Migration mới đã được tạo

File: `prisma/migrations/20250125000000_safe_status_migration_production/migration.sql`

Migration này:
- ✅ **An toàn cho production** - Idempotent (có thể chạy nhiều lần)
- ✅ **Check table tồn tại** trước khi thao tác
- ✅ **Dùng đúng table name** - `Payment` (không phải `PaymentTransaction`)
- ✅ **Migrate tất cả status columns** sang enum types

### 2. Cách chạy migration

#### Trên Railway (Tự động)
Khi commit code mới, Railway sẽ:
1. Build Docker image
2. Chạy `start.sh` script
3. `start.sh` sẽ chạy `prisma migrate deploy`
4. Migration mới sẽ được apply tự động

#### Manual (Nếu cần)
```bash
# Check migration status
yarn db:migrate:status

# Apply migrations
yarn db:migrate

# Hoặc trực tiếp
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

### 3. Verify Migration

Sau khi migration chạy, verify bằng script:
```bash
./scripts/check-migration-status.sh
```

Script này sẽ check:
- ✅ Enum types đã được tạo
- ✅ Status columns đã được migrate sang enum
- ✅ Payment.currency column đã tồn tại
- ✅ PaymentTransaction table không tồn tại (đúng)

## 🚨 Lưu ý quan trọng

1. **Không có migration nào reference `PaymentTransaction`** trong codebase
2. **Tất cả migrations đều dùng `Payment`** (đúng table name)
3. **Migration mới sẽ skip nếu đã được apply** (idempotent)

## 📋 Checklist

- [x] Migration mới đã được tạo (20250125000000_safe_status_migration_production)
- [x] Migration check table tồn tại trước khi thao tác
- [x] Migration dùng đúng table name (`Payment`)
- [x] Script check migration status đã được tạo
- [ ] Migration đã được test trên production
- [ ] Verify không còn lỗi PaymentTransaction

## 🔄 Next Steps

1. **Commit migration mới**
2. **Push lên Railway** - Migration sẽ tự động chạy
3. **Check logs** trên Railway để verify migration thành công
4. **Run check script** để verify tất cả status columns đã được migrate


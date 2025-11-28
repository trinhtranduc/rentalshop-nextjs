# 🛡️ Migration Safety Guide

## Tổng quan

Migration này (`20251128000000_add_custom_merchant_roles`) đã được thiết kế với **nhiều lớp bảo vệ** để đảm bảo an toàn khi deploy.

## ✅ Các tính năng an toàn

### 1. **Idempotent (Có thể chạy nhiều lần)**
- Tất cả operations đều có `IF NOT EXISTS` checks
- Migration có thể chạy nhiều lần mà không gây lỗi
- An toàn khi re-deploy hoặc retry

### 2. **Transaction-wrapped (Atomic)**
- Toàn bộ migration được wrap trong `BEGIN/COMMIT`
- Nếu có lỗi, tất cả thay đổi sẽ được rollback
- Đảm bảo database consistency

### 3. **Comprehensive Error Handling**
- Mỗi step có `EXCEPTION` handler riêng
- Xử lý các lỗi phổ biến (duplicate_table, duplicate_column, etc.)
- Logging chi tiết cho troubleshooting

### 4. **Pre-flight Validation**
- Kiểm tra table/column tồn tại trước khi thao tác
- Verify foreign key constraints trước khi tạo
- Tránh lỗi do missing dependencies

### 5. **Post-flight Verification**
- Kiểm tra kết quả sau khi migration hoàn thành
- Verify các objects quan trọng đã được tạo
- Log kết quả verification

## 📋 Migration Steps

### Step 1: Create MerchantRole Table
- ✅ Check table exists trước khi tạo
- ✅ Handle duplicate_table error
- ✅ Logging chi tiết

### Step 2: Add Foreign Key (MerchantRole.merchantId)
- ✅ Verify Merchant table exists
- ✅ Verify MerchantRole table exists
- ✅ Check constraint exists trước khi tạo
- ✅ Handle duplicate_object error

### Step 3: Add customRoleId Column
- ✅ Verify User table exists
- ✅ Check column exists trước khi thêm
- ✅ Handle duplicate_column error

### Step 4: Add Foreign Key (User.customRoleId)
- ✅ Verify User table và column exists
- ✅ Verify MerchantRole table exists
- ✅ Check constraint exists trước khi tạo
- ✅ Handle duplicate_object error

### Step 5: Create Indexes
- ✅ Verify MerchantRole table exists
- ✅ Sử dụng `CREATE INDEX IF NOT EXISTS`
- ✅ Handle errors gracefully

### Step 6: Create Unique Constraints
- ✅ Check constraint exists trước khi tạo
- ✅ Handle unique_violation errors
- ✅ Logging chi tiết

### Step 7: Add updatedAt Trigger
- ✅ Create function nếu chưa có
- ✅ Create trigger nếu chưa có
- ✅ Handle errors gracefully

### Step 8: Verification
- ✅ Check MerchantRole table exists
- ✅ Check customRoleId column exists
- ✅ Check foreign key constraint exists
- ✅ Log kết quả verification

## 🚀 Deploy Process

### Automatic (via start.sh)

Script `start.sh` sẽ tự động:

1. **Generate Prisma Client**
   - Fail nếu không generate được
   - Exit nếu fail

2. **Check Database Connection**
   - Retry 5 lần với delay 3s
   - Continue nếu không connect được (database có thể chưa ready)

3. **Pre-Migration Validation**
   - Check migration status
   - Count pending migrations
   - Log chi tiết

4. **Run Migrations**
   - Retry 5 lần với delay 3s
   - Capture và log errors
   - Continue nếu fail (server vẫn start)

5. **Post-Migration Verification**
   - Verify migration status
   - Check critical objects
   - Log verification results

6. **Start Server**
   - Start Next.js server
   - Log migration summary

### Manual (nếu cần)

```bash
# Check migration status
npx prisma migrate status --schema=prisma/schema.prisma

# Apply migrations manually
npx prisma migrate deploy --schema=prisma/schema.prisma

# Verify results
npx prisma db execute --stdin --schema=prisma/schema.prisma <<< "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'MerchantRole');"
```

## ⚠️ Lưu ý quan trọng

### 1. **Migration có thể chạy nhiều lần**
- ✅ Safe to re-run
- ✅ Không gây duplicate errors
- ✅ Idempotent design

### 2. **Transaction Safety**
- ✅ Tất cả changes trong một transaction
- ✅ Rollback nếu có lỗi
- ✅ Database consistency guaranteed

### 3. **Error Handling**
- ✅ Graceful degradation
- ✅ Server vẫn start nếu migration fail
- ✅ Detailed logging cho troubleshooting

### 4. **Verification**
- ✅ Pre và post migration checks
- ✅ Verify critical objects
- ✅ Log verification results

## 🔍 Troubleshooting

### Migration Failed

1. **Check logs**
   ```bash
   # Railway logs
   railway logs --service api
   ```

2. **Check migration status**
   ```bash
   npx prisma migrate status --schema=prisma/schema.prisma
   ```

3. **Manual verification**
   ```bash
   # Check MerchantRole table
   npx prisma db execute --stdin --schema=prisma/schema.prisma <<< "SELECT * FROM information_schema.tables WHERE table_name = 'MerchantRole';"
   
   # Check customRoleId column
   npx prisma db execute --stdin --schema=prisma/schema.prisma <<< "SELECT * FROM information_schema.columns WHERE table_name = 'User' AND column_name = 'customRoleId';"
   ```

### Migration Already Applied

Nếu migration đã được apply:
- ✅ Safe to re-run (idempotent)
- ✅ Không gây lỗi
- ✅ Chỉ log "already exists" messages

### Database Not Ready

Nếu database chưa ready:
- ✅ Script sẽ retry 5 lần
- ✅ Server vẫn start nếu migration fail
- ✅ Migration sẽ retry ở lần deploy tiếp theo

## 📊 Migration Summary

| Feature | Status |
|---------|--------|
| Idempotent | ✅ Yes |
| Transaction-wrapped | ✅ Yes |
| Error Handling | ✅ Comprehensive |
| Pre-flight Validation | ✅ Yes |
| Post-flight Verification | ✅ Yes |
| Retry Logic | ✅ Yes (5 retries) |
| Detailed Logging | ✅ Yes |
| Graceful Degradation | ✅ Yes |

## 🎯 Best Practices

1. ✅ **Always test locally first**
   ```bash
   yarn db:migrate:dev
   ```

2. ✅ **Review migration SQL before committing**
   ```bash
   cat prisma/migrations/20251128000000_add_custom_merchant_roles/migration.sql
   ```

3. ✅ **Monitor logs during deploy**
   - Watch for migration success/failure
   - Check verification results

4. ✅ **Verify after deploy**
   - Check migration status
   - Verify critical objects exist
   - Test application functionality

## 📝 Changelog

- **2025-11-28**: Initial migration with comprehensive safety features
- **2025-11-28**: Enhanced error handling and verification
- **2025-11-28**: Added transaction wrapper and idempotent checks


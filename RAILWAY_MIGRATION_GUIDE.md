# 🚀 Railway Database Migration Guide

## **📋 OVERVIEW**

Railway tự động chạy migration khi deploy code mới. Không cần manual migration.

## **🔧 MIGRATION WORKFLOW**

### **1. Development Changes**
```bash
# 1. Thay đổi schema
vim prisma/schema.prisma

# 2. Commit changes
git add -A
git commit -m "feat: add new field to User table"

# 3. Push to Railway
git push origin main
```

### **2. Railway Auto Migration**
Railway sẽ tự động:
- ✅ Deploy new code
- ✅ Run `npx prisma generate`
- ✅ Apply pending migrations
- ✅ Update database schema

## **📝 MIGRATION EXAMPLES**

### **THÊM FIELD MỚI**
```prisma
model User {
  id    Int    @id @default(autoincrement())
  name  String
  email String @unique
  // ✅ Thêm field mới
  phone String?
  age   Int?
}
```
```bash
git commit -m "feat: add phone and age fields to User"
git push origin main
```

### **XÓA FIELD**
```prisma
model User {
  id    Int    @id @default(autoincrement())
  name  String
  email String @unique
  // ❌ Xóa field cũ
  // oldField String?
}
```
```bash
git commit -m "refactor: remove oldField from User"
git push origin main
```

### **THÊM INDEX**
```prisma
model Product {
  id    Int    @id @default(autoincrement())
  name  String
  price Float
  
  @@index([name])      // ✅ Thêm index
  @@index([price])     // ✅ Thêm index
}
```
```bash
git commit -m "perf: add indexes to Product table"
git push origin main
```

### **THÊM TABLE MỚI**
```prisma
// ✅ Thêm model mới
model Category {
  id          Int      @id @default(autoincrement())
  name        String
  description String?
  createdAt   DateTime @default(now())
  
  @@index([name])
}
```
```bash
git commit -m "feat: add Category table"
git push origin main
```

### **XÓA TABLE**
```prisma
// ❌ Xóa toàn bộ model
// model OldTable {
//   id   Int @id @default(autoincrement())
//   name String
// }
```
```bash
git commit -m "refactor: remove OldTable"
git push origin main
```

## **⚠️ DATA SAFETY**

### **✅ SAFE OPERATIONS**
- Thêm field mới (nullable)
- Thêm index
- Thêm table mới
- Thêm relationship

### **⚠️ DANGEROUS OPERATIONS**
- Xóa field (mất data)
- Xóa table (mất toàn bộ data)
- Thay đổi field type (có thể lỗi)
- Rename field/table

### **🛡️ BACKUP BEFORE DANGEROUS CHANGES**
```bash
# Railway tự động backup, nhưng nên backup thêm
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

## **🔍 CHECKING MIGRATION STATUS**

### **1. Railway Dashboard**
- Vào Railway Dashboard
- Check deployment logs
- Xem migration status

### **2. API Health Check**
```bash
curl https://dev-apis-development.up.railway.app/api/health
```

### **3. Test Database Connection**
```bash
curl https://dev-apis-development.up.railway.app/api/merchants
```

## **🚨 TROUBLESHOOTING**

### **Migration Failed**
```bash
# Check Railway logs
# Fix schema issues
# Push again
git commit -m "fix: resolve migration issues"
git push origin main
```

### **Data Loss Prevention**
```bash
# 1. Backup trước khi thay đổi lớn
pg_dump $DATABASE_URL > backup.sql

# 2. Test migration locally
npx prisma migrate dev --name test-migration

# 3. Deploy to Railway
git push origin main
```

### **Rollback Migration**
```bash
# 1. Revert code changes
git revert <commit-hash>

# 2. Push revert
git push origin main

# 3. Railway sẽ apply rollback migration
```

## **📋 BEST PRACTICES**

### **✅ DO**
- Commit migration với message rõ ràng
- Test migration locally trước
- Backup trước khi thay đổi lớn
- Deploy trong giờ ít traffic
- Monitor deployment logs

### **❌ DON'T**
- Xóa field/table mà không backup
- Deploy migration phức tạp vào giờ cao điểm
- Bỏ qua test local
- Commit migration không rõ ràng

## **🎯 RECENT MIGRATION**

### **Removed `merchant.subscriptionStatus`**
```prisma
// Before
model Merchant {
  subscriptionStatus String @default("trial")
}

// After  
model Merchant {
  // ✅ Removed duplicate field
  // Single source of truth: subscription.status
}
```

**Impact:** ✅ No data loss - field was duplicate
**Status:** ✅ Successfully deployed to Railway

## **📞 SUPPORT**

Nếu migration bị lỗi:
1. Check Railway deployment logs
2. Verify schema syntax
3. Test locally với `npx prisma migrate dev`
4. Rollback nếu cần thiết

**Railway tự động handle migration - không cần manual intervention!** 🎉

# 🚀 Automatic Migration Flow trong Docker

## ✅ Xác nhận: Migration tự động chạy khi commit

Khi bạn commit migration và push lên GitHub, Railway sẽ tự động:

```
1. Git Push
   ↓
2. Railway Build Docker Image
   ↓
3. Railway Start Container
   ↓
4. Docker chạy: CMD ["sh", "start.sh"]
   ↓
5. start.sh tự động chạy: prisma migrate deploy
   ↓
6. Next.js Server Start
```

## 📋 Chi tiết Flow

### 1. Dockerfile Configuration

**File:** `apps/api/Dockerfile`

```dockerfile
# Copy Prisma schema AND migrations (needed for runtime migrations)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copy start script (runs migrations + starts server)
COPY --from=builder --chown=nextjs:nodejs /app/apps/api/start.sh ./apps/api/start.sh
RUN chmod +x ./apps/api/start.sh

# STARTUP COMMAND
CMD ["sh", "start.sh"]
```

### 2. start.sh Script

**File:** `apps/api/start.sh`

Script này tự động:
1. Generate Prisma Client
2. Check database connection (với retry logic)
3. Check migration status
4. **Run pending migrations** (`prisma migrate deploy`)
5. Verify migration results
6. Start Next.js server

**Key command:**
```bash
npx prisma migrate deploy --schema=../../prisma/schema.prisma
```

### 3. Migration Files

Migrations được copy vào Docker image:
- `prisma/schema.prisma` ✅
- `prisma/migrations/` ✅ (tất cả migration files)

## 🎯 Cách sử dụng

### Tạo Migration mới:

```bash
# 1. Tạo migration (local)
yarn db:migrate:dev --name your_migration_name

# 2. Commit và push
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add your migration"
git push origin dev

# 3. Railway tự động:
#    - Build Docker image
#    - Deploy container
#    - Chạy migration tự động (qua start.sh)
#    - Start server

# ✅ Xong! Không cần làm gì thêm!
```

## 🔒 Safety Features

1. **Retry Logic**: start.sh có retry logic (5 lần) nếu migration fail
2. **Error Handling**: Server vẫn start nếu migration fail (để debug)
3. **Validation**: Pre và post migration validation
4. **Logging**: Detailed logging cho troubleshooting

## ⚠️ Lưu ý

- ✅ **Migration tự động chạy** mỗi lần deploy
- ✅ **Không cần** chạy migration thủ công
- ✅ **An toàn** với retry logic và error handling
- ⚠️ **Nếu migration fail**, server vẫn start (để bạn có thể debug)

## 📝 Example

```bash
# Tạo migration
yarn db:migrate:dev --name add_new_feature

# Commit
git add prisma/
git commit -m "feat: add new feature migration"
git push

# Railway tự động:
# ✅ Build Docker
# ✅ Deploy
# ✅ Run migration (tự động)
# ✅ Start server
```

**Không cần làm gì thêm!** 🎉

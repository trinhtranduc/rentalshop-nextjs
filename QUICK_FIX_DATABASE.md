# 🔧 Quick Fix: Database Connection Error

## ❌ Lỗi hiện tại
```
SERVICE_UNAVAILABLE: "Không thể kết nối đến cơ sở dữ liệu. Vui lòng kiểm tra lại kết nối."
```

## ✅ Giải pháp

### Bước 1: Kiểm tra Database Connection
```bash
# Test connection
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$queryRaw\`SELECT 1\`.then(() => { console.log('✅ Database connection successful'); process.exit(0); }).catch((err) => { console.error('❌ Database connection failed:', err.message); process.exit(1); });"
```

### Bước 2: Fix Migration Conflict
Migration history không đồng bộ. Có 2 cách:

#### Cách 1: Deploy migrations (Recommended)
```bash
# Deploy tất cả pending migrations
yarn db:migrate
```

#### Cách 2: Reset migration history (Nếu cách 1 không work)
```bash
# ⚠️ CHỈ DÙNG CHO DEVELOPMENT!
# Reset migration history và sync lại
npx prisma migrate reset --schema=./prisma/schema.prisma
yarn db:regenerate-system
```

### Bước 3: Generate Prisma Client
```bash
yarn db:generate
```

### Bước 4: Test lại
```bash
# Start API server
yarn dev:api

# Hoặc test login
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rentalshop.com","password":"admin123"}'
```

## 🔍 Troubleshooting

### Nếu vẫn lỗi "Can't reach database server":

1. **Kiểm tra DATABASE_URL trong .env:**
   ```bash
   grep DATABASE_URL .env
   ```

2. **Nếu dùng Railway database:**
   - Đảm bảo database service đang chạy
   - Kiểm tra public URL nếu chạy từ local

3. **Nếu dùng local PostgreSQL:**
   ```bash
   # Start PostgreSQL (macOS)
   brew services start postgresql
   
   # Hoặc (Linux)
   sudo systemctl start postgresql
   ```

### Nếu migration conflict không fix được:

```bash
# 1. Backup database (nếu cần)
pg_dump $DATABASE_URL > backup.sql

# 2. Reset và sync lại
npx prisma migrate reset --schema=./prisma/schema.prisma --force

# 3. Regenerate system data
yarn db:regenerate-system
```

## 📝 Lưu ý

- **Prisma không cần "start"** - nó là ORM library, không phải service
- **Database server (PostgreSQL) mới cần start**
- **Migration conflict** thường xảy ra khi:
  - Database được modify trực tiếp
  - Migration files bị xóa hoặc thay đổi
  - Multiple developers làm việc cùng lúc

## ✅ Checklist

- [ ] Database connection test thành công
- [ ] Migration status không có conflict
- [ ] Prisma Client đã được generate
- [ ] API server start thành công
- [ ] Login API hoạt động


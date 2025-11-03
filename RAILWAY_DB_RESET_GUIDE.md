# Railway Database Reset & Setup Guide

Hướng dẫn reset database trên Railway, thiết lập Main DB và tạo super admin.

## 🎯 Mục đích

Script này sẽ:
1. ✅ Reset Main DB (xóa tất cả bảng và tạo lại schema)
2. ✅ Chạy migrations cho Main DB
3. ✅ Tạo super admin user trong Main DB

## 🚀 Cách sử dụng

### **Bước 0: Setup Railway (Nếu chưa làm)**

```bash
# 1. Đăng nhập Railway
railway login

# 2. Link đến project của bạn
railway link

# 3. Kiểm tra services có sẵn
railway status

# 4. Nếu cần chọn service cụ thể
railway service
```

**Lưu ý:** Service name thường là `api` hoặc `apis` (tùy theo cách bạn đặt tên trên Railway).

### **Trên Railway (Khuyến nghị)**

```bash
# Cách 1: Không chỉ định service (dùng service hiện tại)
railway run node scripts/railway-reset-db.js

# Cách 2: Chỉ định service name (thử cả api và apis)
railway run --service api node scripts/railway-reset-db.js
# Hoặc
railway run --service apis node scripts/railway-reset-db.js

# Cách 3: Với script npm
railway run yarn railway:reset-db
# Hoặc
railway run --service api yarn railway:reset-db

# Với thông tin admin tùy chỉnh
ADMIN_EMAIL="admin@rentalshop.com" ADMIN_PASSWORD="admin123" \
  railway run node scripts/railway-reset-db.js

# Cập nhật password cho admin đã tồn tại
UPDATE_PASSWORD=true ADMIN_PASSWORD="newpassword123" \
  railway run node scripts/railway-reset-db.js
```

### **Local Development**

```bash
# Đảm bảo có file .env với MAIN_DATABASE_URL
# Sau đó chạy:
MAIN_DATABASE_URL="postgresql://user:pass@host:port/dbname" node scripts/railway-reset-db.js

# Hoặc với script npm
MAIN_DATABASE_URL="postgresql://..." yarn railway:reset-db
```

## 📋 Environment Variables

### **Bắt buộc**

- `MAIN_DATABASE_URL`: Connection string cho Main Database

### **Tùy chọn**

- `ADMIN_EMAIL`: Email cho super admin (mặc định: `admin@rentalshop.com`)
- `ADMIN_PASSWORD`: Password cho super admin (mặc định: `admin123`)
- `ADMIN_FIRST_NAME`: Tên của admin (mặc định: `Super`)
- `ADMIN_LAST_NAME`: Họ của admin (mặc định: `Administrator`)
- `ADMIN_PHONE`: Số điện thoại (mặc định: `+1-555-0001`)
- `UPDATE_PASSWORD`: Nếu `true`, sẽ cập nhật password cho admin đã tồn tại

## 🔧 Script sẽ thực hiện

### **1. Kiểm tra Environment Variables**
- Kiểm tra `MAIN_DATABASE_URL` có được thiết lập
- Hiển thị masked database URL (ẩn password)

### **2. Reset Main DB**
- Xóa tất cả bảng trong Main DB (theo thứ tự để tránh foreign key conflicts)
- Bảng được xóa: `Tenant`, `Merchant`, `User`, `Plan`

### **3. Chạy Migrations**
- Chạy `prisma db push` cho Main DB schema
- Tạo lại tất cả bảng và indexes

### **4. Tạo Super Admin**
- Kiểm tra admin đã tồn tại chưa
- Nếu chưa: Tạo mới với role `ADMIN`
- Nếu đã tồn tại: Bỏ qua (hoặc cập nhật password nếu `UPDATE_PASSWORD=true`)

## 📝 Output

Script sẽ hiển thị:

```
============================================================
🚀 Railway Database Reset & Setup Script
============================================================

🔍 Checking environment variables...

📊 MAIN_DATABASE_URL: postgresql://user:***@host:port/dbname
✅ Environment variables are set

🔄 Resetting Main Database...
   ⚠️  Dropping all tables in Main DB...
   ✅ Dropped: Tenant
   ✅ Dropped: Merchant
   ✅ Dropped: User
   ✅ Dropped: Plan

✅ Main Database reset complete

📦 Running Prisma migrations for Main DB...
   Running: npx prisma db push --schema=prisma/main/schema.prisma --accept-data-loss

✅ Main DB migrations complete

👑 Creating super admin user in Main DB...

   Email: admin@rentalshop.com
   Name: Super Administrator

✅ Super admin created successfully!
   ID: 1
   Email: admin@rentalshop.com
   Name: Super Administrator
   Role: ADMIN

📝 Login credentials:
   Email: admin@rentalshop.com
   Password: admin123

⚠️  Please change the default password after first login!

============================================================
✅ Database reset and setup completed successfully!
============================================================

📋 Summary:
   ✅ Main DB reset and migrated
   ✅ Super admin created

💡 Next steps:
   1. Test login with admin credentials
   2. Change default password
   3. Create test merchants and tenants if needed
```

## ⚠️ Lưu ý quan trọng

### **⚠️ WARNING: Script này sẽ XÓA TẤT CẢ DỮ LIỆU trong Main DB!**

- Script sẽ **DROP TẤT CẢ BẢNG** trong Main DB
- Tất cả dữ liệu sẽ bị **MẤT VĨNH VIỄN**
- Chỉ chạy script này khi:
  - ✅ Môi trường development/testing
  - ✅ Cần reset hoàn toàn database
  - ✅ Đã backup dữ liệu quan trọng (nếu có)

### **Production Environment**

**KHÔNG CHẠY SCRIPT NÀY TRÊN PRODUCTION** trừ khi:
- Đã có backup đầy đủ
- Đã thông báo và được phê duyệt
- Hiểu rõ hậu quả

## 🔍 Troubleshooting

### **Error: Service not found**

```bash
# 1. Đảm bảo đã link Railway project
railway link

# 2. Kiểm tra services có sẵn
railway status

# 3. Thử không chỉ định service (dùng service hiện tại)
railway run node scripts/railway-reset-db.js

# 4. Hoặc thử với service name khác (api hoặc apis)
railway run --service api node scripts/railway-reset-db.js
railway run --service apis node scripts/railway-reset-db.js
```

### **Error: MAIN_DATABASE_URL not set**

```bash
# Trên Railway: Kiểm tra environment variables
railway variables

# Hoặc với service cụ thể
railway variables --service api
railway variables --service apis

# Thêm MAIN_DATABASE_URL nếu chưa có
railway variables set MAIN_DATABASE_URL="postgresql://..."

# Hoặc qua Railway Dashboard
# 1. Vào Railway Dashboard
# 2. Chọn project và service
# 3. Tab Variables
# 4. Add MAIN_DATABASE_URL
```

### **Error: Can't reach database server**

- Kiểm tra database service có đang chạy trên Railway
- Kiểm tra `MAIN_DATABASE_URL` có đúng không
- Trên Railway, đảm bảo database service và API service cùng một project

### **Error: Table doesn't exist**

- Đây là warning bình thường khi reset database lần đầu
- Script sẽ tiếp tục chạy

### **Error: Admin already exists**

- Script sẽ bỏ qua việc tạo admin nếu đã tồn tại
- Để cập nhật password: `UPDATE_PASSWORD=true ADMIN_PASSWORD="newpass" railway run ...`

## 📚 Related Scripts

- `yarn db:create-admin-main-db` - Chỉ tạo admin, không reset database
- `yarn db:push:main` - Chỉ push schema, không reset
- `yarn db:generate:main` - Generate Prisma client cho Main DB

## 🎯 Quick Start

```bash
# 1. Setup Railway (nếu chưa làm)
railway login
railway link

# 2. Kiểm tra service name
railway status

# 3. Reset và setup Main DB trên Railway
#    Thử các cách sau cho đến khi tìm được service name đúng:
railway run yarn railway:reset-db
# Hoặc
railway run --service api yarn railway:reset-db
# Hoặc  
railway run --service apis yarn railway:reset-db

# 4. Kiểm tra admin đã được tạo
railway run node scripts/create-super-admin-main-db.js

# 5. Login với credentials mặc định:
#    Email: admin@rentalshop.com
#    Password: admin123
```

## 📞 Support

Nếu gặp vấn đề, kiểm tra:
1. Railway logs: `railway logs --service api`
2. Database connection: Kiểm tra `MAIN_DATABASE_URL`
3. Prisma schema: Đảm bảo `prisma/main/schema.prisma` đúng
4. Database permissions: Admin user phải có quyền CREATE/DROP DATABASE


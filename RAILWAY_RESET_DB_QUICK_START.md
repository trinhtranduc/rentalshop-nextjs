# 🚀 Railway Reset DB - Quick Start

Hướng dẫn nhanh để reset database trên Railway.

## ⚡ Quick Steps

### 1️⃣ **Link Railway Project** (Nếu chưa làm)

```bash
# Đăng nhập
railway login

# Link đến project
railway link
```

### 2️⃣ **Kiểm tra Service Name**

```bash
# Xem service hiện tại
railway status

# Nếu báo lỗi "Service not found", thử:
railway service
```

### 3️⃣ **Reset Database**

Thử các lệnh sau (một trong số này sẽ hoạt động):

```bash
# Cách 1: Không chỉ định service (khuyến nghị)
railway run node scripts/railway-reset-db.js

# Cách 2: Với service name "api"
railway run --service api node scripts/railway-reset-db.js

# Cách 3: Với service name "apis"
railway run --service apis node scripts/railway-reset-db.js

# Cách 4: Dùng yarn script
railway run yarn railway:reset-db
```

## ✅ Kết quả mong đợi

Script sẽ:
- ✅ Reset Main DB (xóa tất cả bảng)
- ✅ Tạo lại schema
- ✅ Tạo super admin với credentials:
  - Email: `admin@rentalshop.com`
  - Password: `admin123`

## 🔧 Troubleshooting

### Lỗi: "Service not found"

→ **Giải pháp:**
```bash
railway link          # Link lại project
railway status        # Kiểm tra services
railway run ...        # Không dùng --service
```

### Lỗi: "MAIN_DATABASE_URL not set"

→ **Giải pháp:**
```bash
# Kiểm tra variables
railway variables

# Thêm MAIN_DATABASE_URL qua Railway Dashboard:
# 1. Railway Dashboard → Project → Service
# 2. Tab Variables
# 3. Add MAIN_DATABASE_URL = (connection string từ PostgreSQL service)
```

### Lỗi: "getMainDb not found"

→ **Giải pháp:**
```bash
# Build database package trước
yarn workspace @rentalshop/database build

# Hoặc build tất cả
yarn build
```

## 📚 Xem thêm

Chi tiết đầy đủ: [RAILWAY_DB_RESET_GUIDE.md](./RAILWAY_DB_RESET_GUIDE.md)


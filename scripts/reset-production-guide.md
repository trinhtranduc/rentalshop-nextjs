# 🚀 Hướng Dẫn Reset Production Database

## ⚠️ QUAN TRỌNG TRƯỚC KHI RESET

1. **Backup database** (nếu có data quan trọng)
2. **Thông báo team** về việc reset
3. **Chọn thời điểm** ít traffic nhất
4. **Kiểm tra** script đã được test trên development

---

## 🎯 CÁCH 1: Railway Dashboard (KHUYẾN NGHỊ - An toàn nhất)

### Bước 1: Vào Railway Dashboard
1. Mở https://railway.app
2. Đăng nhập vào account
3. Chọn **production project**

### Bước 2: Chọn Production Service
1. Tìm và click vào **production service** (thường là `api` hoặc `backend`)
2. Vào tab **Settings**

### Bước 3: Cấu hình Deploy Command
1. Scroll xuống phần **Deploy**
2. Tìm **Deploy Command** hoặc **Start Command**
3. **Option A - Reset và Start Server (Recommended):**
   ```bash
   chmod +x scripts/reset-and-start.sh && scripts/reset-and-start.sh
   ```
   
   **Option B - Chỉ Reset (sau đó phải đổi lại start command):**
   ```bash
   yarn db:reset-railway
   ```
   ⚠️ **Lưu ý:** Với Option B, sau khi reset xong phải đổi lại start command về `yarn start` hoặc `cd apps/api && yarn start`
4. Click **Save**

### Bước 4: Trigger Deploy
1. Vào tab **Deployments**
2. Click **Redeploy** hoặc **Deploy**
3. Chọn **Deploy from GitHub** (nếu cần)

### Bước 5: Monitor Logs
1. Vào tab **Deployments**
2. Click vào deployment mới nhất
3. Xem **Logs** để theo dõi quá trình reset
4. Đợi đến khi thấy: `🎉 Railway database reset completed successfully!`

### Bước 6: Xóa/Đổi Deploy Command (Sau khi reset xong)
1. Vào lại **Settings** → **Deploy**
2. **Nếu dùng Option A:** Xóa command reset, để lại:
   ```bash
   cd apps/api && yarn start
   ```
   **Nếu dùng Option B:** Đổi command từ `yarn db:reset-railway` về:
   ```bash
   cd apps/api && yarn start
   ```
3. Click **Save**

### Bước 7: Verify
1. Test API endpoints
2. Đăng nhập với default credentials
3. Kiểm tra data đã được seed đúng

---

## 🎯 CÁCH 2: Railway CLI

### Prerequisites
```bash
# Install Railway CLI (nếu chưa có)
npm i -g @railway/cli

# Login
railway login
```

### Bước 1: Link Project
```bash
# Link đến production project
railway link

# Hoặc specify project ID
railway link --project <project-id>
```

### Bước 2: Chọn Service
```bash
# List services
railway service

# Select production service
railway service <service-name>
```

### Bước 3: Run Reset Script
```bash
# Run reset script
railway run yarn db:reset-railway
```

### Bước 4: Monitor Output
- Script sẽ hiển thị progress trong terminal
- Đợi đến khi thấy: `🎉 Railway database reset completed successfully!`

---

## 🎯 CÁCH 3: One-time Deploy (Không khuyến nghị)

⚠️ **Cảnh báo:** Cách này sẽ tự động reset mỗi khi deploy, chỉ dùng khi chắc chắn.

1. Thêm vào `railway.json` hoặc deploy settings:
   ```json
   {
     "deploy": {
       "startCommand": "yarn db:reset-railway && yarn start"
     }
   }
   ```

2. **NHỚ XÓA** sau khi reset xong!

---

## ✅ Verification Checklist

Sau khi reset, kiểm tra:

- [ ] Script chạy thành công (không có errors)
- [ ] Database có data mới (2 merchants, 120 orders, 11 users)
- [ ] API endpoints hoạt động
- [ ] Có thể đăng nhập với default credentials:
  - Super Admin: `admin@rentalshop.com` / `admin123`
  - Merchant 1: `merchant1@example.com` / `merchant123`
  - Merchant 2: `merchant2@example.com` / `merchant123`
- [ ] Enum types hoạt động đúng (không có type errors)

---

## 🔑 Default Login Credentials

Sau khi reset, sử dụng:

- **Super Admin:** `admin@rentalshop.com` / `admin123`
- **Merchant 1:** `merchant1@example.com` / `merchant123`
- **Merchant 2:** `merchant2@example.com` / `merchant123`

---

## 📊 Production Database Info

- **Host:** `metro.proxy.rlwy.net`
- **Port:** `39416`
- **Database:** `railway`
- **Access:** Railway network only

---

## 🆘 Troubleshooting

### Lỗi: "Authentication failed"
- Kiểm tra DATABASE_URL trong Railway environment variables
- Đảm bảo password đúng

### Lỗi: "Can't reach database server"
- Database chỉ accessible từ Railway network
- Đảm bảo script chạy trên Railway service, không phải local

### Lỗi: "Migration failed"
- Kiểm tra migrations đã được commit
- Chạy `yarn railway:generate` trước khi reset

### Script chạy nhưng không có data
- Kiểm tra logs để xem có errors trong seed script
- Verify DATABASE_URL đúng
- Kiểm tra Prisma Client đã được generate với enum types

---

## 📝 Notes

- **KHÔNG** reset production database thường xuyên
- **LUÔN** backup trước khi reset (nếu có data quan trọng)
- **TEST** script trên development trước
- **THÔNG BÁO** team trước khi reset
- **MONITOR** logs trong quá trình reset


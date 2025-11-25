# 🔧 Troubleshoot Railway Reset Error

## ❌ Lỗi: "Can't reach database server"

### Error Message
```
Error: P1001: Can't reach database server at `hopper.proxy.rlwy.net:41374`
```

### Nguyên nhân

1. **Chạy script trên Database Service (PostgreSQL)**
   - Service "tenant-database" có thể là Railway managed PostgreSQL
   - Database service không có Node.js runtime
   - Không thể chạy script reset trên database service

2. **Database URL không đúng**
   - URL hiện tại: `hopper.proxy.rlwy.net:41374`
   - Production URL mới: `maglev.proxy.rlwy.net:46280`
   - Có thể đang dùng URL cũ hoặc URL của service khác

3. **Database chỉ accessible từ Railway network**
   - Internal URLs (`railway.internal`) chỉ hoạt động trong Railway network
   - Public URLs có thể không accessible từ local

---

## ✅ Giải pháp

### Bước 1: Xác định Service Type

**Kiểm tra trong Railway Dashboard:**
1. Vào Railway Dashboard
2. Xem service "tenant-database"
3. Kiểm tra **Settings** → **Deploy** → **Start Command**

**Nếu là Database Service (PostgreSQL):**
- Không có Start Command hoặc Start Command trống
- Service type là "PostgreSQL" hoặc "Database"
- **KHÔNG chạy script reset trên service này**

**Nếu là API Service:**
- Có Start Command (ví dụ: `yarn start`, `next start`)
- Service type là "Web Service" hoặc "Application"
- **Có thể chạy script reset trên service này**

---

### Bước 2: Tìm API Service

**Trong Railway Dashboard:**
1. Xem danh sách services trong project
2. Tìm service có tên như:
   - `api`
   - `backend`
   - `server`
   - Hoặc service chạy Next.js/Node.js

**Kiểm tra Service:**
- Service phải có build logs
- Service phải có deploy logs
- Service phải có Start Command

---

### Bước 3: Chạy Reset trên API Service

**Option 1: Railway CLI**
```bash
# Link project
railway link

# List services
railway service

# Select API service (KHÔNG phải database service)
railway service <api-service-name>

# Run reset
railway run yarn db:reset-railway
```

**Option 2: Railway Dashboard**
1. Vào **API service** (không phải database service)
2. **Settings** → **Deploy** → **Start Command**
3. Thêm: `chmod +x scripts/reset-and-start.sh && scripts/reset-and-start.sh`
4. **Deployments** → **Redeploy**
5. Sau khi reset xong, đổi lại Start Command về: `cd apps/api && yarn start`

---

### Bước 4: Verify DATABASE_URL

**Kiểm tra Environment Variables:**
1. Vào **API service** (không phải database service)
2. **Settings** → **Variables**
3. Kiểm tra `DATABASE_URL`
4. Đảm bảo URL đúng:
   - Production: `maglev.proxy.rlwy.net:46280`
   - Development: `shuttle.proxy.rlwy.net:25662`

**Nếu URL sai:**
1. Update `DATABASE_URL` trong Variables
2. Redeploy service

---

## 🎯 Best Practices

1. **Tách riêng Services:**
   - Database Service: Railway managed PostgreSQL (không chạy code)
   - API Service: Next.js/Node.js application (chạy code và scripts)

2. **Reset Database:**
   - Chạy script reset trên **API service**
   - API service sẽ connect đến **Database service**
   - Không chạy script trên database service

3. **Environment Variables:**
   - DATABASE_URL phải được set trong **API service**
   - Database service tự động expose DATABASE_URL cho các services khác

---

## 🆘 Troubleshooting

### Lỗi: "Service not found"
- Kiểm tra service name đúng
- List services: `railway service`

### Lỗi: "Can't reach database server"
- Đảm bảo chạy trên API service, không phải database service
- Kiểm tra DATABASE_URL đúng
- Kiểm tra database service đang running

### Lỗi: "Authentication failed"
- Kiểm tra password trong DATABASE_URL
- Verify DATABASE_URL từ Railway Dashboard

### Service "tenant-database" là gì?
- Có thể là database service (PostgreSQL)
- Có thể là API service bị đặt tên nhầm
- Kiểm tra Settings → Deploy để xác định

---

## 📋 Checklist

- [ ] Xác định đúng service type (Database hay API)
- [ ] Tìm API service (không phải database service)
- [ ] Verify DATABASE_URL trong API service
- [ ] Chạy reset script trên API service
- [ ] Monitor logs để đảm bảo reset thành công
- [ ] Đổi lại Start Command sau khi reset xong


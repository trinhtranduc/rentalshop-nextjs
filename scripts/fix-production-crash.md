# 🔧 Fix Production Crash - "failed to exec pid1"

## ❌ Lỗi

```
ERROR (catatonit:2): failed to exec pid1: No such file or directory
```

Service đang ở trạng thái **CRASHED**.

---

## 🔍 Nguyên nhân

### Trường hợp 1: Database Service (PostgreSQL)
- Đây là Railway managed PostgreSQL service
- **KHÔNG cần** start command
- Lỗi có thể do:
  - Database service bị lỗi
  - Connection issues
  - Resource limits

### Trường hợp 2: API Service
- Start command không đúng hoặc không tồn tại
- Script reset chạy xong rồi exit (không có process chạy tiếp)
- Thiếu entrypoint hoặc start script

---

## ✅ Giải pháp

### Nếu là DATABASE SERVICE (PostgreSQL)

1. **Kiểm tra Database Service:**
   - Vào Railway Dashboard
   - Chọn **database** service
   - Kiểm tra **Settings** → **Resources**
   - Đảm bảo có đủ resources

2. **Restart Database:**
   - Vào **Settings** → **Danger Zone**
   - Click **Restart Service**
   - Hoặc delete và tạo lại database service

3. **Kiểm tra DATABASE_URL:**
   - Vào **API service** (không phải database service)
   - Kiểm tra **Variables** → **DATABASE_URL**
   - Đảm bảo URL đúng và accessible

4. **Verify Connection:**
   - Test connection từ API service
   - Kiểm tra logs của API service

---

### Nếu là API SERVICE (bị đặt tên nhầm)

1. **Kiểm tra Start Command:**
   - Vào Railway Dashboard
   - Chọn service (có thể tên là "database" nhưng thực chất là API)
   - Vào **Settings** → **Deploy**
   - Kiểm tra **Start Command**

2. **Fix Start Command:**

   **❌ SAI:**
   ```bash
   yarn db:reset-railway
   ```
   (Script này sẽ exit sau khi reset xong)

   **✅ ĐÚNG - Option 1 (Reset và Start):**
   ```bash
   chmod +x scripts/reset-and-start.sh && scripts/reset-and-start.sh
   ```

   **✅ ĐÚNG - Option 2 (Chỉ Start Server):**
   ```bash
   cd apps/api && yarn start
   ```
   Hoặc:
   ```bash
   cd apps/api && sh start.sh
   ```

3. **Nếu muốn Reset Database:**
   - **Bước 1:** Đổi Start Command thành:
     ```bash
     chmod +x scripts/reset-and-start.sh && scripts/reset-and-start.sh
     ```
   - **Bước 2:** Deploy
   - **Bước 3:** Sau khi reset xong, đổi lại Start Command về:
     ```bash
     cd apps/api && yarn start
     ```

---

## 🚀 Quick Fix Steps

### Step 1: Xác định Service Type
- Vào Railway Dashboard
- Kiểm tra service có tên "database"
- Xem **Settings** → **Deploy** → **Start Command**

### Step 2A: Nếu là Database Service (PostgreSQL)
1. Restart service
2. Kiểm tra resources
3. Verify DATABASE_URL trong API service

### Step 2B: Nếu là API Service
1. Vào **Settings** → **Deploy**
2. Đổi **Start Command** thành:
   ```bash
   cd apps/api && yarn start
   ```
3. Click **Save**
4. Vào **Deployments** → **Redeploy**

### Step 3: Verify
1. Kiểm tra logs
2. Service phải ở trạng thái **Running**
3. Test API endpoints

---

## 📋 Checklist

- [ ] Xác định đúng service type (Database hay API)
- [ ] Kiểm tra Start Command
- [ ] Đảm bảo có process chạy liên tục (cho API service)
- [ ] Verify DATABASE_URL (cho API service)
- [ ] Restart service nếu cần
- [ ] Monitor logs sau khi fix

---

## 🆘 Nếu vẫn lỗi

1. **Check Build Logs:**
   - Vào **Build Logs** tab
   - Kiểm tra có lỗi build không

2. **Check Environment Variables:**
   - Vào **Variables** tab
   - Đảm bảo DATABASE_URL đúng
   - Kiểm tra các env vars khác

3. **Check Resources:**
   - Vào **Settings** → **Resources**
   - Đảm bảo có đủ CPU/Memory

4. **Contact Support:**
   - Click **Get Help** button
   - Cung cấp logs và error message

---

## 💡 Best Practices

1. **Tách riêng Database và API services:**
   - Database: Railway managed PostgreSQL (không cần start command)
   - API: Next.js service (cần start command)

2. **Start Command cho API:**
   - Luôn đảm bảo có process chạy liên tục
   - Không dùng script reset làm start command (trừ khi dùng reset-and-start.sh)

3. **Reset Database:**
   - Dùng Railway CLI hoặc Dashboard
   - Sau khi reset xong, đổi lại start command về bình thường


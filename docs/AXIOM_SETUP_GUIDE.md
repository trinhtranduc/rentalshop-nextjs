# 🚀 Axiom Cloud Logging Setup Guide

## 📋 Tổng Quan

Axiom cung cấp:
- ✅ **500GB/month FREE** - Nhiều nhất trong các free tiers
- ✅ **Unlimited retention** - Giữ logs mãi mãi
- ✅ **No credit card** - Không cần thẻ
- ✅ **Fast query** - Tìm kiếm logs trong milliseconds
- ✅ **Modern UI** - Dashboard đẹp, dễ dùng

---

## 🎯 Bước 1: Sign Up Axiom (2 phút)

1. Truy cập: https://axiom.co
2. Click **"Sign Up"** (hoặc "Get Started")
3. Đăng ký bằng:
   - Email
   - GitHub account (khuyến nghị)
   - Google account
4. **Không cần credit card** ✅

---

## 🔑 Bước 2: Tạo API Token (3 phút)

1. Sau khi đăng nhập, vào **Settings** (icon bánh răng)
2. Chọn **API Tokens** trong menu bên trái
3. Click **"Create Token"**
4. Đặt tên: `rentalshop-api` (hoặc tên bạn muốn)
5. Chọn permissions:
   - ✅ **Ingest** (để gửi logs)
   - ✅ **Query** (để query logs - optional)
6. Click **"Create"**
7. **Copy token** ngay (chỉ hiện 1 lần!)

**Lưu token này** - bạn sẽ cần nó ở bước sau.

---

## 📊 Bước 3: Tạo Dataset (1 phút)

1. Vào **Datasets** trong menu bên trái
2. Click **"Create Dataset"**
3. Đặt tên: `rentalshop-logs` (hoặc tên bạn muốn)
4. Click **"Create"**

**Lưu tên dataset** - bạn sẽ cần nó ở bước sau.

---

## 🆔 Bước 4: Lấy Organization ID (1 phút)

1. Vào **Settings** → **Organization**
2. Tìm **Organization ID** (dạng: `org_xxxxx`)
3. **Copy Organization ID**

**Lưu Organization ID** - bạn sẽ cần nó ở bước sau.

---

## 💻 Bước 5: Cài Đặt Package (1 phút)

```bash
# Từ root directory
cd packages/utils
yarn install

# Hoặc từ root
yarn install
```

Package `@axiomhq/pino` đã được thêm vào `package.json`.

---

## ⚙️ Bước 6: Cấu Hình Environment Variables

### Local Development (.env.local)

Tạo hoặc cập nhật file `.env.local` trong root:

```env
# Axiom Configuration
AXIOM_TOKEN=your-axiom-api-token-here
AXIOM_DATASET=rentalshop-logs
AXIOM_ORG_ID=your-axiom-org-id-here
AXIOM_LOG_LEVEL=info  # info, warn, error
```

### Railway Development Environment

1. Vào Railway Dashboard
2. Chọn **development** environment
3. Chọn service **API**
4. Vào tab **Variables**
5. Thêm các variables:

```
AXIOM_TOKEN=your-axiom-api-token-here
AXIOM_DATASET=rentalshop-logs
AXIOM_ORG_ID=your-axiom-org-id-here
AXIOM_LOG_LEVEL=info
```

### Railway Production Environment

1. Vào Railway Dashboard
2. Chọn **production** environment
3. Chọn service **API**
4. Vào tab **Variables**
5. Thêm các variables:

```
AXIOM_TOKEN=your-axiom-api-token-here
AXIOM_DATASET=rentalshop-logs
AXIOM_ORG_ID=your-axiom-org-id-here
AXIOM_LOG_LEVEL=warn  # Chỉ gửi warnings và errors để tiết kiệm quota
```

**Lưu ý**: Dùng `warn` trong production để chỉ gửi warnings và errors (tiết kiệm quota).

---

## 🧪 Bước 7: Test và Verify

### Test Local

1. Start API server:
```bash
yarn dev:api
```

2. Tạo một log:
```typescript
import { logInfo, logError } from '@rentalshop/utils';

// Test info log
logInfo('Axiom test log', { 
  test: true,
  timestamp: new Date().toISOString() 
});

// Test error log
logError('Axiom test error', new Error('Test error'), {
  endpoint: '/test',
  userId: 123
});
```

3. Kiểm tra Axiom Dashboard:
   - Vào https://axiom.co
   - Chọn dataset `rentalshop-logs`
   - Bạn sẽ thấy logs xuất hiện trong vài giây!

### Test Query

Trong Axiom Dashboard, thử query:

```sql
-- Tìm tất cả errors
['level'] = 'error'

-- Tìm logs từ một endpoint cụ thể
['path'] = '/api/posts'

-- Tìm logs từ một user
['userId'] = 123

-- Tìm logs trong 1 giờ qua
['time'] > ago(1h)
```

---

## 📊 Sử Dụng Axiom Dashboard

### Xem Logs

1. Vào **Datasets** → Chọn `rentalshop-logs`
2. Logs sẽ hiển thị real-time
3. Click vào một log để xem chi tiết

### Query Logs

1. Vào **Query** tab
2. Viết query (SQL-like syntax):
```sql
-- Tất cả errors
['level'] = 'error'

-- API requests chậm (> 1s)
['type'] = 'api_request' AND ['duration'] > 1000

-- Errors từ một endpoint
['level'] = 'error' AND ['path'] = '/api/posts'

-- Logs từ user cụ thể
['userId'] = 123
```

### Tạo Alerts

1. Vào **Monitors** → **Create Monitor**
2. Đặt tên: `Error Rate Alert`
3. Query:
```sql
['level'] = 'error'
```
4. Condition: `count > 10` trong 5 phút
5. Notification: Email hoặc Slack
6. Click **"Create"**

---

## 🎯 Best Practices

### 1. Log Levels

- **Development**: `AXIOM_LOG_LEVEL=info` (gửi tất cả info+)
- **Production**: `AXIOM_LOG_LEVEL=warn` (chỉ warnings và errors)

**Lý do**: Tiết kiệm quota (500GB/month free)

### 2. Structured Logging

Luôn dùng structured data:

```typescript
// ✅ Good
logInfo('User logged in', { 
  userId: 123,
  email: 'user@example.com',
  ipAddress: '192.168.1.1'
});

// ❌ Bad
logInfo(`User ${userId} logged in from ${ip}`);
```

### 3. Không Log Sensitive Data

```typescript
// ❌ Never log
logInfo('User data', { 
  password: 'secret',  // ❌
  token: 'abc123',     // ❌
  apiKey: 'key'        // ❌
});

// ✅ Good
logInfo('User data', { 
  userId: 123,
  email: 'user@example.com'
});
```

### 4. Context trong Logs

Luôn thêm context:

```typescript
logError('Database error', error, {
  endpoint: '/api/posts',
  method: 'POST',
  userId: user.id,
  merchantId: user.merchantId,
  outletId: user.outletId,
  requestId: correlationId
});
```

---

## 🔍 Troubleshooting

### Logs không xuất hiện trong Axiom

1. **Check environment variables:**
```bash
# Local
cat .env.local | grep AXIOM

# Railway
railway variables --service api
```

2. **Check token:**
   - Token có đúng không?
   - Token có permission "Ingest" không?
   - Token có expired không?

3. **Check dataset:**
   - Dataset name có đúng không?
   - Dataset có tồn tại không?

4. **Check logs:**
```bash
# Xem logs local
tail -f apps/api/logs/combined.log

# Xem logs Railway
railway logs --service api
```

### Package không tìm thấy

```bash
# Reinstall
cd packages/utils
rm -rf node_modules
yarn install

# Rebuild
yarn build
```

### Quota exceeded

- Check usage: Axiom Dashboard → Settings → Usage
- Tăng `AXIOM_LOG_LEVEL` lên `warn` hoặc `error`
- Xóa old logs nếu cần

---

## 📈 Monitoring Quota

1. Vào **Settings** → **Usage**
2. Xem:
   - **Ingested**: Logs đã gửi (GB)
   - **Quota**: 500GB/month (free tier)
   - **Remaining**: Còn lại bao nhiêu

**Tip**: Nếu gần hết quota, tăng `AXIOM_LOG_LEVEL` lên `warn` hoặc `error`.

---

## ✅ Checklist

- [ ] Sign up Axiom account
- [ ] Tạo API token
- [ ] Tạo dataset
- [ ] Lấy Organization ID
- [ ] Cài đặt package (`yarn install`)
- [ ] Thêm environment variables (local)
- [ ] Thêm environment variables (Railway dev)
- [ ] Thêm environment variables (Railway prod)
- [ ] Test local logging
- [ ] Verify logs trong Axiom Dashboard
- [ ] Setup alerts (optional)

---

## 🎉 Hoàn Thành!

Bây giờ bạn có:
- ✅ Centralized logging từ tất cả services
- ✅ Fast query và search
- ✅ Unlimited retention
- ✅ 500GB/month free
- ✅ Alerts và monitoring

**Next Steps:**
- Setup alerts cho critical errors
- Tạo dashboards để monitor
- Query logs để analyze patterns

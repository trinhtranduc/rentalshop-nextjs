# Axiom Logging Setup Guide

## 📋 Tổng quan

Hệ thống logging đã được cấu hình với:
- ✅ **File logging**: `logs/combined.log`, `logs/error.log` (luôn bật)
- ✅ **Console logging**: stdout/stderr (luôn bật)
- ⚙️ **Axiom logging**: Cần cấu hình environment variables

## 🔧 Cấu hình Axiom trên Railway

### Bước 1: Lấy Axiom Credentials

1. Đăng nhập vào [Axiom Dashboard](https://app.axiom.co)
2. Vào **Settings** → **API Tokens**
3. Tạo token mới với quyền **Ingest** và **Query**
4. Copy **Token** và **Org ID**

### Bước 2: Set Environment Variables trên Railway

1. Vào Railway project → **Variables** tab
2. Thêm các biến sau:

```bash
# Required for Axiom logging
AXIOM_TOKEN=your-axiom-api-token-here
AXIOM_ORG_ID=your-axiom-org-id-here

# Optional (auto-detected if not set)
AXIOM_DATASET=anyrent-logs-prod  # or anyrent-logs-dev
AXIOM_LOG_LEVEL=warn  # or info, debug, error
LOG_LEVEL=warn  # General log level
```

### Bước 3: Tạo Dataset trên Axiom

1. Vào Axiom Dashboard → **Datasets**
2. Tạo dataset mới:
   - **Production**: `anyrent-logs-prod`
   - **Development**: `anyrent-logs-dev`
3. Dataset sẽ tự động được sử dụng dựa trên `NODE_ENV`

### Bước 4: Redeploy

Sau khi set environment variables:
1. Railway sẽ tự động redeploy
2. Hoặc manual redeploy từ Railway dashboard

## ✅ Kiểm tra Logging Status

### Cách 1: API Endpoint

```bash
# Check logging status (requires ADMIN role)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://your-api.railway.app/api/system/logging-status
```

Response sẽ cho biết:
- File logging status
- Console logging status
- Axiom logging status (configured/not_configured/error)
- Dataset và log level

### Cách 2: Kiểm tra Logs trên Railway

1. Vào Railway project → **Deployments**
2. Click vào deployment mới nhất
3. Xem **Logs** tab
4. Tìm log: `Axiom client initialization failed` (nếu có lỗi)

### Cách 3: Kiểm tra Logs trên Axiom

1. Vào [Axiom Dashboard](https://app.axiom.co)
2. Chọn dataset: `anyrent-logs-prod` hoặc `anyrent-logs-dev`
3. Query logs:
   ```apl
   ['level'] = 'info' or ['level'] = 'warn' or ['level'] = 'error'
   ```

## 🔍 Troubleshooting

### Không thấy logs trên Axiom

**Nguyên nhân 1: Environment variables chưa được set**
```bash
# Check trên Railway
# Variables tab → Verify AXIOM_TOKEN và AXIOM_ORG_ID có giá trị
```

**Nguyên nhân 2: Axiom client initialization failed**
```bash
# Check logs trên Railway
# Tìm: "Axiom client initialization failed"
# Có thể do:
# - @axiomhq/js package chưa được install
# - Token hoặc Org ID sai
```

**Nguyên nhân 3: Log level quá cao**
```bash
# Nếu AXIOM_LOG_LEVEL=warn
# Chỉ logs warn và error được gửi
# Thử set AXIOM_LOG_LEVEL=info để gửi tất cả logs
```

**Nguyên nhân 4: Dataset không tồn tại**
```bash
# Tạo dataset trên Axiom:
# - anyrent-logs-prod (cho production)
# - anyrent-logs-dev (cho development)
```

### Logs chỉ xuất hiện trên Railway, không có trên Axiom

1. **Check environment variables**:
   ```bash
   # Trên Railway, verify:
   AXIOM_TOKEN=xxx (có giá trị)
   AXIOM_ORG_ID=xxx (có giá trị)
   ```

2. **Check Axiom client status**:
   ```bash
   # Call API endpoint:
   GET /api/system/logging-status
   # Xem axiomLogging.status
   ```

3. **Check logs trên Railway**:
   ```bash
   # Tìm: "Failed to send log to Axiom"
   # Nếu có, sẽ có error message
   ```

### Logs không xuất hiện trên Railway

1. **Check file logging**:
   ```bash
   # Logs được ghi vào:
   # - logs/combined.log
   # - logs/error.log
   # - stdout/stderr (Railway logs)
   ```

2. **Check log level**:
   ```bash
   # Nếu LOG_LEVEL=warn
   # Chỉ warn và error được log
   # Thử set LOG_LEVEL=info
   ```

## 📊 Log Levels

### Axiom Log Level (`AXIOM_LOG_LEVEL`)

- `debug`: Tất cả logs (debug, info, warn, error)
- `info`: Info, warn, error (không có debug)
- `warn`: Warn và error (không có info, debug)
- `error`: Chỉ error

### General Log Level (`LOG_LEVEL`)

- `debug`: Tất cả logs
- `info`: Info, warn, error
- `warn`: Warn và error
- `error`: Chỉ error

## 🎯 Best Practices

1. **Production**: 
   - `AXIOM_LOG_LEVEL=warn` (chỉ gửi warnings và errors)
   - `LOG_LEVEL=warn`
   
2. **Development**:
   - `AXIOM_LOG_LEVEL=info` (gửi tất cả logs quan trọng)
   - `LOG_LEVEL=info`

3. **Debugging**:
   - `AXIOM_LOG_LEVEL=debug` (gửi tất cả logs)
   - `LOG_LEVEL=debug`

## 📝 Log Format

Logs được gửi đến Axiom với format:
```json
{
  "_time": "2025-01-31T14:00:00.000Z",
  "level": "info",
  "message": "API GET /api/posts - 200 (45ms)",
  "method": "GET",
  "path": "/api/posts",
  "statusCode": 200,
  "duration": 45,
  "correlationId": "req_20250131_abc123",
  "userId": "user_123",
  "merchantId": "merchant_456",
  "environment": "production"
}
```

## 🔗 Links

- [Axiom Dashboard](https://app.axiom.co)
- [Axiom Documentation](https://axiom.co/docs)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)

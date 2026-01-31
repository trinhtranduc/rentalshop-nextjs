# 🚀 Setup Logging với Pino (100% Free)

## ✅ Đã Hoàn Thành

1. ✅ **Pino logger** - Thư viện hiện đại nhất, nhanh nhất
2. ✅ **File logging** - Lưu logs vào file với rotation
3. ✅ **Pretty console** - Dễ đọc trong development
4. ✅ **JSON format** - Dễ parse và query
5. ✅ **Helper functions** - `logError`, `logInfo`, `logWarn`, `logDebug`

## 📦 Cài Đặt

```bash
# Cài đặt dependencies
cd packages/utils
yarn install

# Hoặc từ root
yarn install
```

## 🔧 Cấu Hình

### Environment Variables (Optional)

```env
# Log level (debug, info, warn, error)
LOG_LEVEL=info

# Node environment
NODE_ENV=production
```

### Log Files Location

Logs sẽ được lưu tại:
- `apps/api/logs/combined.log` - Tất cả logs
- `apps/api/logs/error.log` - Chỉ errors

Hoặc:
- `logs/combined.log` - Nếu chạy từ root
- `logs/error.log` - Nếu chạy từ root

## 💻 Sử Dụng

### Basic Usage

```typescript
import { logError, logInfo, logWarn, logDebug } from '@rentalshop/utils';

// Info log
logInfo('User logged in', { userId: 123, email: 'user@example.com' });

// Error log
logError('Database connection failed', error, { 
  endpoint: '/api/users',
  userId: 123 
});

// Warning log
logWarn('Rate limit approaching', { 
  currentRequests: 95,
  limit: 100 
});

// Debug log (chỉ hiện trong development)
logDebug('Processing request', { 
  method: 'POST',
  path: '/api/orders' 
});
```

### API Request Logging

```typescript
import { logApiRequest } from '@rentalshop/utils';

// Log API request
logApiRequest(
  'POST',
  '/api/posts',
  201,
  150, // duration in ms
  {
    userId: 123,
    merchantId: 1,
    outletId: 2,
    ipAddress: '192.168.1.1',
  }
);

// Log API error
logApiRequest(
  'POST',
  '/api/posts',
  500,
  2000,
  {
    userId: 123,
    error: new Error('Database error'),
  }
);
```

### Database Operation Logging

```typescript
import { logDatabaseOperation } from '@rentalshop/utils';

// Log successful operation
logDatabaseOperation(
  'create',
  'Post',
  50, // duration in ms
  {
    success: true,
    recordCount: 1,
  }
);

// Log failed operation
logDatabaseOperation(
  'create',
  'Post',
  100,
  {
    success: false,
    error: new Error('Unique constraint violation'),
  }
);
```

## 📊 Log Format

### Console Output (Development)
```
2024-01-15 10:30:45 [INFO]: User logged in
  userId: 123
  email: "user@example.com"
```

### File Output (JSON)
```json
{
  "level": 30,
  "time": "2024-01-15T10:30:45.123Z",
  "service": "rentalshop-api",
  "environment": "development",
  "userId": 123,
  "email": "user@example.com",
  "msg": "User logged in"
}
```

## 🎯 Best Practices

1. **Log Levels:**
   - `error` - Lỗi cần xử lý ngay
   - `warn` - Cảnh báo, cần chú ý
   - `info` - Thông tin quan trọng
   - `debug` - Chi tiết debug (chỉ development)

2. **Context:**
   - Luôn thêm context (userId, endpoint, etc.)
   - Không log sensitive data (passwords, tokens)
   - Sử dụng structured data (objects, not strings)

3. **Performance:**
   - Pino rất nhanh, nhưng vẫn nên log hợp lý
   - Không log trong tight loops
   - Sử dụng `debug` level cho verbose logs

## ☁️ Cloud Integration (Optional)

Xem [LOGGING_CLOUD_INTEGRATION.md](./LOGGING_CLOUD_INTEGRATION.md) để tích hợp:
- **Axiom** - 500GB/month free
- **Better Stack** - 1GB/month free
- **Datadog** - 1GB/day free

## 🔍 Xem Logs

### Local Files
```bash
# Xem combined logs
tail -f apps/api/logs/combined.log

# Xem error logs
tail -f apps/api/logs/error.log

# Search logs
grep "ERROR" apps/api/logs/combined.log

# Parse JSON logs
cat apps/api/logs/combined.log | jq '.'
```

### Development Console
Logs sẽ tự động hiển thị trong console với format đẹp.

## 📝 Migration từ console.log

Thay thế:
```typescript
// ❌ Old way
console.log('User logged in', userId);
console.error('Error:', error);

// ✅ New way
logInfo('User logged in', { userId });
logError('Error', error, { endpoint: '/api/users' });
```

## 🎉 Benefits

1. ✅ **Fast** - Pino nhanh hơn Winston 5-10x
2. ✅ **Structured** - JSON format, dễ parse
3. ✅ **Free** - 100% miễn phí
4. ✅ **Modern** - Được dùng bởi Fastify, NestJS
5. ✅ **Production-ready** - Sẵn sàng cho production

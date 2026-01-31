# ☁️ Cloud Logging Integration Guide (Optional - Free Tier)

## 🎯 Tại Sao Cần Cloud Logging?

- ✅ **Centralized**: Xem logs từ nhiều servers ở một nơi
- ✅ **Search**: Tìm kiếm logs nhanh chóng
- ✅ **Alerts**: Nhận thông báo khi có lỗi
- ✅ **Analytics**: Phân tích patterns và trends
- ✅ **Backup**: Logs được lưu trữ an toàn

## 🏆 Top 3 Cloud Logging Services (Free Tier)

### 1. **Axiom** ⭐ RECOMMENDED - Best Free Tier

**Free Tier:**
- ✅ **500GB/month** logs (rất nhiều!)
- ✅ **Unlimited retention** (giữ logs mãi mãi)
- ✅ **No credit card required**
- ✅ **Fast query** (milliseconds)

**Setup:**
```bash
# Install Axiom transport
yarn add @axiomhq/pino
```

```typescript
// packages/utils/src/core/logger.ts
import pino from 'pino';
import { createPinoAxiomTransport } from '@axiomhq/pino';

// Add Axiom transport (optional - only if AXIOM_TOKEN is set)
if (process.env.AXIOM_TOKEN && process.env.AXIOM_DATASET) {
  transports.push({
    target: '@axiomhq/pino',
    level: 'info',
    options: {
      token: process.env.AXIOM_TOKEN,
      dataset: process.env.AXIOM_DATASET,
      orgId: process.env.AXIOM_ORG_ID,
    },
  });
}
```

**Environment Variables:**
```env
AXIOM_TOKEN=your_token_here
AXIOM_DATASET=rentalshop-logs
AXIOM_ORG_ID=your_org_id
```

**Get Free Account:**
1. Sign up tại https://axiom.co (free)
2. Create dataset
3. Get API token
4. Add to `.env`

---

### 2. **Better Stack (Logtail)** - Beautiful UI

**Free Tier:**
- ✅ **1GB/month** logs
- ✅ **3 days retention**
- ✅ **Free alerts**
- ✅ **Beautiful dashboard**

**Setup:**
```bash
yarn add @logtail/pino
```

```typescript
import { Logtail } from '@logtail/pino';

if (process.env.LOGTAIL_TOKEN) {
  const logtail = new Logtail(process.env.LOGTAIL_TOKEN);
  transports.push({
    target: '@logtail/pino',
    level: 'info',
  });
}
```

**Get Free Account:**
1. Sign up tại https://betterstack.com (free)
2. Create source
3. Get token
4. Add to `.env`

---

### 3. **Datadog** - Enterprise Features

**Free Tier:**
- ✅ **1GB/day** logs
- ✅ **3 days retention**
- ⚠️ Credit card required

**Setup:**
```bash
yarn add dd-trace pino-datadog
```

```typescript
import pinoDatadog from 'pino-datadog';

if (process.env.DATADOG_API_KEY) {
  transports.push({
    target: 'pino-datadog',
    level: 'info',
    options: {
      apiKey: process.env.DATADOG_API_KEY,
      service: 'rentalshop-api',
    },
  });
}
```

---

## 📦 Implementation Steps

### Step 1: Choose Cloud Service
- **Axiom** - Best free tier (500GB/month)
- **Better Stack** - Beautiful UI (1GB/month)
- **Datadog** - Enterprise (1GB/day)

### Step 2: Install Transport Package
```bash
# For Axiom
yarn add @axiomhq/pino

# OR for Better Stack
yarn add @logtail/pino

# OR for Datadog
yarn add pino-datadog
```

### Step 3: Update Logger
Add cloud transport to `packages/utils/src/core/logger.ts` (see examples above)

### Step 4: Add Environment Variables
Add to `.env`:
```env
# Axiom
AXIOM_TOKEN=your_token
AXIOM_DATASET=rentalshop-logs
AXIOM_ORG_ID=your_org_id

# OR Better Stack
LOGTAIL_TOKEN=your_token

# OR Datadog
DATADOG_API_KEY=your_key
```

### Step 5: Test
```typescript
import { logInfo, logError } from '@rentalshop/utils';

logInfo('Test log message', { userId: 123 });
logError('Test error', new Error('Test'), { endpoint: '/test' });
```

## 🎯 Recommendation

**Cho dự án của bạn: Axiom**

**Lý do:**
1. ✅ **500GB/month FREE** - nhiều nhất
2. ✅ **Unlimited retention** - giữ logs mãi mãi
3. ✅ **No credit card** - không cần thẻ
4. ✅ **Fast query** - tìm kiếm nhanh
5. ✅ **Modern** - built for developers

**Khi nào cần upgrade:**
- Khi vượt quá 500GB/month
- Khi cần advanced analytics
- Khi cần team collaboration

## 💡 Best Practices

1. **Local + Cloud**: Luôn giữ local files làm backup
2. **Log Levels**: Chỉ gửi `info` và `error` lên cloud (tiết kiệm)
3. **Sanitize**: Không gửi sensitive data (passwords, tokens)
4. **Sampling**: Có thể sample logs nếu volume quá lớn

## 🔒 Security

- ✅ **Never log passwords, tokens, API keys**
- ✅ **Use environment variables** for cloud tokens
- ✅ **Add to .gitignore** - không commit tokens
- ✅ **Rotate tokens** định kỳ

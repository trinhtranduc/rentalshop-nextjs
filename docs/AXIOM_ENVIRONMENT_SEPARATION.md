# 🔀 Tách Logs Dev và Production trong Axiom

## 🎯 Tại Sao Cần Tách Logs?

1. ✅ **Dễ quản lý** - Không bị lẫn logs giữa dev và prod
2. ✅ **Bảo mật** - Production logs không bị dev team xem
3. ✅ **Performance** - Query nhanh hơn (ít data hơn)
4. ✅ **Retention** - Có thể set retention khác nhau
5. ✅ **Quota** - Dễ track usage từng environment

---

## 📊 Cách 1: Dataset Riêng Biệt (Recommended) ⭐

### Setup

**Tạo 2 datasets trong Axiom:**

1. **Development Dataset:**
   - Name: `rentalshop-logs-dev`
   - Description: "Development environment logs"

2. **Production Dataset:**
   - Name: `rentalshop-logs-prod`
   - Description: "Production environment logs"

### Cấu Hình Environment Variables

**Development (.env.local hoặc Railway Dev):**
```env
AXIOM_TOKEN=your-token-here
AXIOM_ORG_ID=your-org-id
# Không cần set AXIOM_DATASET - logger tự động dùng rentalshop-logs-dev
# Hoặc set explicitly:
AXIOM_DATASET=rentalshop-logs-dev
AXIOM_LOG_LEVEL=info
```

**Production (Railway Production):**
```env
AXIOM_TOKEN=your-token-here
AXIOM_ORG_ID=your-org-id
# Không cần set AXIOM_DATASET - logger tự động dùng rentalshop-logs-prod
# Hoặc set explicitly:
AXIOM_DATASET=rentalshop-logs-prod
AXIOM_LOG_LEVEL=warn  # Chỉ warnings và errors để tiết kiệm quota
```

### Auto-Detection Logic

Logger tự động detect environment và chọn dataset:

```typescript
// Nếu NODE_ENV=production → rentalshop-logs-prod
// Nếu NODE_ENV=development → rentalshop-logs-dev
// Nếu set AXIOM_DATASET explicitly → dùng giá trị đó
```

### Ưu Điểm

- ✅ **Tự động** - Không cần config thủ công
- ✅ **Tách biệt hoàn toàn** - Dev và prod logs riêng biệt
- ✅ **Dễ query** - Chỉ cần chọn dataset
- ✅ **Flexible** - Có thể override bằng AXIOM_DATASET

---

## 📊 Cách 2: Cùng Dataset, Dùng Field Filter

### Setup

**Tạo 1 dataset:**
- Name: `rentalshop-logs`
- Description: "All environment logs"

### Cấu Hình

**Tất cả environments dùng cùng dataset:**
```env
AXIOM_TOKEN=your-token-here
AXIOM_ORG_ID=your-org-id
AXIOM_DATASET=rentalshop-logs
```

Logger tự động thêm field `environment` vào mỗi log:
- `environment: 'development'` cho dev
- `environment: 'production'` cho prod

### Query Logs

**Xem chỉ production logs:**
```sql
['environment'] = 'production'
```

**Xem chỉ development logs:**
```sql
['environment'] = 'development'
```

**Xem errors từ production:**
```sql
['environment'] = 'production' AND ['level'] = 'error'
```

### Ưu Điểm

- ✅ **1 dataset** - Dễ quản lý
- ✅ **So sánh** - Dễ so sánh dev vs prod
- ✅ **Unified view** - Xem tất cả logs ở một nơi

### Nhược Điểm

- ❌ **Lẫn logs** - Dev và prod logs cùng dataset
- ❌ **Query chậm hơn** - Phải filter mỗi lần
- ❌ **Khó bảo mật** - Dev team có thể xem prod logs

---

## 🎯 Khuyến Nghị: Dataset Riêng Biệt

**Lý do:**
1. ✅ **Tách biệt hoàn toàn** - Không bị lẫn
2. ✅ **Bảo mật tốt hơn** - Prod logs riêng
3. ✅ **Query nhanh** - Ít data hơn
4. ✅ **Auto-detection** - Logger tự động chọn dataset

---

## 📋 Setup Checklist

### Bước 1: Tạo Datasets trong Axiom

1. Vào Axiom Dashboard
2. **Datasets** → **Create Dataset**
3. Tạo 2 datasets:
   - `rentalshop-logs-dev`
   - `rentalshop-logs-prod`

### Bước 2: Cấu Hình Railway

**Development Environment:**
```bash
railway variables --set AXIOM_TOKEN=your-token --environment development
railway variables --set AXIOM_ORG_ID=your-org-id --environment development
railway variables --set AXIOM_LOG_LEVEL=info --environment development
# AXIOM_DATASET không cần set - logger tự động dùng rentalshop-logs-dev
```

**Production Environment:**
```bash
railway variables --set AXIOM_TOKEN=your-token --environment production
railway variables --set AXIOM_ORG_ID=your-org-id --environment production
railway variables --set AXIOM_LOG_LEVEL=warn --environment production
# AXIOM_DATASET không cần set - logger tự động dùng rentalshop-logs-prod
```

### Bước 3: Verify

**Test Development:**
```typescript
import { logInfo } from '@rentalshop/utils';

logInfo('Dev test log', { environment: 'development' });
```

Kiểm tra Axiom → `rentalshop-logs-dev` → Logs xuất hiện ✅

**Test Production:**
```typescript
logInfo('Prod test log', { environment: 'production' });
```

Kiểm tra Axiom → `rentalshop-logs-prod` → Logs xuất hiện ✅

---

## 🔍 Query Logs

### Development Dataset

```sql
-- Tất cả errors
['level'] = 'error'

-- API requests chậm
['type'] = 'api_request' AND ['duration'] > 1000

-- Errors từ endpoint cụ thể
['level'] = 'error' AND ['path'] = '/api/posts'
```

### Production Dataset

```sql
-- Critical errors only
['level'] = 'error'

-- Slow API requests (> 2s)
['type'] = 'api_request' AND ['duration'] > 2000

-- Errors từ user cụ thể
['level'] = 'error' AND ['userId'] = 123
```

---

## 📊 Monitoring Quota

**Check usage từng dataset:**
1. Axiom Dashboard → **Datasets**
2. Click vào dataset
3. Xem **Usage** tab

**Total quota: 500GB/month** (shared across all datasets)

**Tip:** Production thường ít logs hơn (chỉ warn+error), dev có nhiều logs hơn (info+).

---

## 🎯 Best Practices

### 1. Log Levels

- **Development:** `AXIOM_LOG_LEVEL=info` (gửi tất cả info+)
- **Production:** `AXIOM_LOG_LEVEL=warn` (chỉ warnings và errors)

### 2. Dataset Naming

- ✅ `rentalshop-logs-dev` - Development
- ✅ `rentalshop-logs-prod` - Production
- ❌ `rentalshop-logs` - Không rõ environment

### 3. Retention

- **Development:** Có thể set retention ngắn hơn (7-30 ngày)
- **Production:** Giữ lâu hơn (90+ ngày) cho compliance

### 4. Access Control

- **Dev team:** Chỉ access `rentalshop-logs-dev`
- **Ops team:** Access cả 2 datasets
- **Management:** Chỉ access `rentalshop-logs-prod`

---

## ✅ Summary

**Recommended Setup:**
- ✅ **2 datasets riêng:** `rentalshop-logs-dev` và `rentalshop-logs-prod`
- ✅ **Auto-detection:** Logger tự động chọn dataset dựa trên NODE_ENV
- ✅ **Override:** Có thể set AXIOM_DATASET explicitly nếu cần
- ✅ **Log levels:** `info` cho dev, `warn` cho prod

**Result:**
- ✅ Logs tách biệt hoàn toàn
- ✅ Dễ quản lý và query
- ✅ Bảo mật tốt hơn
- ✅ Tiết kiệm quota (prod chỉ gửi warn+error)

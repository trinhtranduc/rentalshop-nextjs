# ⚡ Axiom Quick Start (5 phút)

## 🚀 Setup Nhanh

### 1. Sign Up Axiom (1 phút)
- Truy cập: https://axiom.co
- Sign up (không cần credit card)

### 2. Lấy Credentials (2 phút)

**API Token:**
1. Settings → API Tokens → Create Token
2. Name: `rentalshop-api`
3. Permissions: ✅ Ingest
4. **Copy token**

**Dataset:**
1. Datasets → Create Dataset
2. Name: `rentalshop-logs`
3. **Copy dataset name**

**Organization ID:**
1. Settings → Organization
2. **Copy Organization ID** (dạng: `org_xxxxx`)

### 3. Cấu Hình Environment Variables (2 phút)

**Local (.env.local):**
```env
AXIOM_TOKEN=your-token-here
AXIOM_DATASET=rentalshop-logs
AXIOM_ORG_ID=your-org-id-here
AXIOM_LOG_LEVEL=info
```

**Railway (Development & Production):**
1. Railway Dashboard → Service → Variables
2. Thêm 4 variables như trên
3. Production: Đặt `AXIOM_LOG_LEVEL=warn` (tiết kiệm quota)

### 4. Cài Đặt Package
```bash
yarn install
```

### 5. Test
```typescript
import { logInfo } from '@rentalshop/utils';

logInfo('Axiom test', { test: true });
```

Kiểm tra Axiom Dashboard → Datasets → `rentalshop-logs` → Logs sẽ xuất hiện!

---

## ✅ Done!

Xem [AXIOM_SETUP_GUIDE.md](./AXIOM_SETUP_GUIDE.md) để biết chi tiết.

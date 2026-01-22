# Railway Verify Commands - Quick Reference

## Chạy Verification Script

### Option 1: Dùng yarn (Recommended)

```bash
railway run --service apis yarn verify:railway-setup
```

**Nếu command không tìm thấy:**
- Chạy `yarn install` trước để update package.json
- Hoặc dùng Option 2

### Option 2: Dùng tsx trực tiếp

```bash
railway run --service apis npx tsx scripts/verify-railway-setup.ts
```

### Option 3: Dùng node với tsx

```bash
railway run --service apis node --loader tsx scripts/verify-railway-setup.ts
```

---

## Alternative: Test Connection Đơn Giản

Nếu script có vấn đề, bạn có thể test connection đơn giản:

```bash
# Test Qdrant connection
railway run --service apis node -e "
const { QdrantClient } = require('@qdrant/js-client-rest');
const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});
client.getCollections().then(cols => {
  console.log('✅ Qdrant connected!');
  console.log('Collections:', cols);
}).catch(err => {
  console.error('❌ Error:', err.message);
});
"
```

---

## Check Environment Variables

```bash
# Check env vars trên Railway
railway variables

# Hoặc check trong logs
railway logs --service apis | grep QDRANT
```

---

## Manual Test Steps

Nếu script không chạy được, bạn có thể test manual:

### 1. Check Environment Variables

```bash
railway variables
```

Verify:
- `QDRANT_URL` is set
- `QDRANT_API_KEY` is set

### 2. Test Connection từ API

Tạo product với images trên Railway dev, sau đó check logs:

```bash
railway logs --service apis -f
```

Look for:
- `🔄 Generating embeddings for product...`
- `✅ Generated and stored X embedding(s)`

### 3. Check Qdrant Cloud Dashboard

1. Mở: https://cloud.qdrant.io
2. Vào cluster
3. Check Collections → `product-images`
4. Verify points count

---

**Last Updated:** 2025-01-22

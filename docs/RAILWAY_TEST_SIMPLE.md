# Railway Test - Simple Steps

## ✅ Environment Variables Verified

Từ `railway variables`, tôi thấy:
- ✅ `QDRANT_URL` = `https://6b2f953d-75c4-4ce5-bc1d-a479bfc4a397.europe-west3-0.gcp.cloud.qdrant.io`
- ✅ `QDRANT_API_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

**Environment variables đã được set đúng!**

---

## Next Steps: Test Thực Tế

Vì script có vấn đề với imports, cách tốt nhất là **test thực tế** bằng cách tạo product với images.

### Step 1: Tạo Product với Images

**Via Admin Dashboard:**
1. Mở: https://dev-admin.anyrent.shop
2. Login với credentials
3. Vào Products → Create New
4. Upload images khi tạo product
5. Save product

**Via API:**
```bash
# Login để lấy token
curl -X POST https://dev-api.anyrent.shop/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rentalshop.com","password":"admin123"}'

# Tạo product với images (thay YOUR_TOKEN)
curl -X POST https://dev-api.anyrent.shop/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "data={\"name\":\"Test Product\",\"merchantId\":1,\"rentPrice\":100}" \
  -F "images=@test-image1.jpg" \
  -F "images=@test-image2.jpg"
```

### Step 2: Check Logs

```bash
railway logs --service apis -f
```

**Look for:**
```
🔄 Generating embeddings for product 123 (2 image(s))...
✅ Generated and stored 2 embedding(s) for product 123
```

### Step 3: Verify trong Qdrant Cloud

1. Mở: https://cloud.qdrant.io
2. Vào cluster của bạn
3. Vào Collections → `product-images`
4. Verify:
   - ✅ Collection exists
   - ✅ Points count increases (1 point per image)
   - ✅ Storage usage increases (~2.5KB per point)

### Step 4: Test Image Search

```bash
# Test image search API
curl -X POST https://dev-api.anyrent.shop/api/products/search-by-image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@test-images/product1.jpg" \
  -F "limit=10"
```

---

## Alternative: Simple Connection Test

Nếu muốn test connection đơn giản, tạo file test:

**File: `test-qdrant-simple.js`**
```javascript
const { QdrantClient } = require('@qdrant/js-client-rest');

const client = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY
});

client.getCollections()
  .then(cols => {
    console.log('✅ Qdrant connected!');
    console.log('Collections:', cols.collections.map(c => c.name));
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
```

**Run:**
```bash
railway run --service apis node test-qdrant-simple.js
```

---

## Quick Verification Checklist

- [x] Environment variables set trên Railway
- [ ] Collection `product-images` exists (sẽ tự tạo khi có embedding đầu tiên)
- [ ] Test tạo product với images
- [ ] Verify embedding generation trong logs
- [ ] Verify points trong Qdrant Cloud dashboard
- [ ] Test image search API

---

**Status:** Environment variables đã set đúng. Bạn có thể test bằng cách tạo product với images!

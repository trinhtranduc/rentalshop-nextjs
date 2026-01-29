# Qdrant Cloud Setup Guide - Railway Development

## Tổng Quan

Hướng dẫn setup Qdrant Cloud Free Tier cho Railway development environment. Qdrant Cloud cung cấp 1GB storage miễn phí, fully managed, high availability.

---

## Prerequisites

- ✅ Qdrant Cloud account (đã có)
- ✅ Cluster đã được tạo (đã có)
- ✅ API key đã được lấy (đã có)
- ✅ Railway development project đã setup

---

## Step 1: Environment Variables Setup

### 1.1 Railway Dashboard

1. Vào Railway dashboard: https://railway.app
2. Chọn **Development project**
3. Chọn **API service**
4. Vào tab **Variables**
5. Add/Update các variables sau:

```bash
QDRANT_URL=https://6b2f953d-75c4-4ce5-bc1d-a479bfc4a397.europe-west3-0.gcp.cloud.qdrant.io
QDRANT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.rUuiTtqvpzKWQIbFV6IoL4wmw2Is_6lVy3A8t7OqEVo
```

### 1.2 Local Development (Optional)

Nếu muốn test local với Qdrant Cloud:

**File: `.env.development` hoặc `.env.local`**
```bash
QDRANT_URL=https://6b2f953d-75c4-4ce5-bc1d-a479bfc4a397.europe-west3-0.gcp.cloud.qdrant.io
QDRANT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.rUuiTtqvpzKWQIbFV6IoL4wmw2Is_6lVy3A8t7OqEVo
```

---

## Step 2: Test Connection

### 2.1 Test từ Local (Nếu có .env.development)

```bash
# Test connection
yarn test:qdrant
```

**Expected Output:**
```
🔍 Testing Qdrant connection...

📊 Configuration:
   QDRANT_URL: https://6b2f953d-75c4-4ce5-bc1d-a479bfc4a397.europe-west3-0.gcp.cloud.qdrant.io
   QDRANT_API_KEY: ***SET***

🔄 Initializing vector store...
✅ Vector store initialized

🔍 Testing connection to Qdrant...
✅ Successfully connected to Qdrant!

📊 Collection Info:
   Name: product-images
   Vector size: 512
   Distance: Cosine
   Points count: 0
   Status: green

✅ All tests passed!
🎯 Qdrant is ready to use for image search!
```

### 2.2 Test từ Railway

Sau khi set environment variables trên Railway:

1. **Redeploy API service** (Railway tự động redeploy khi env vars thay đổi)
2. **Check logs:**
   ```bash
   railway logs --service apis -f
   ```
3. **Verify connection** - Collection sẽ tự động được tạo khi:
   - Tạo product mới (auto-generate embedding)
   - Hoặc chạy setup script

---

## Step 3: Initialize Collection (Optional)

Collection `product-images` sẽ tự động được tạo khi:
- ✅ Tạo product mới với images (auto-generate embedding)
- ✅ Chạy `yarn setup:image-search`
- ✅ Chạy `yarn generate:embeddings-only`

**Manual initialization (nếu cần):**

```bash
# Chạy setup script (sẽ tạo collection nếu chưa có)
yarn setup:image-search
```

---

## Step 4: Verify Setup

### 4.1 Check Qdrant Cloud Dashboard

1. Mở: https://cloud.qdrant.io
2. Vào cluster của bạn
3. Check:
   - ✅ Cluster status: **Active**
   - ✅ Storage usage: **0 MB / 1 GB** (ban đầu)
   - ✅ Collections: **product-images** (sau khi tạo product)

### 4.2 Test Auto-Generate Embedding

1. **Tạo product mới** trên Railway dev:
   - Login vào admin dashboard
   - Tạo product với images
   - Check logs để verify embedding generation

2. **Check Qdrant Cloud dashboard:**
   - Vào Collections → `product-images`
   - Points count should increase
   - Storage usage should increase (~2.5KB per point)

### 4.3 Test Image Search

```bash
# Test image search API
curl -X POST https://dev-api.anyrent.shop/api/products/search-by-image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@test-images/product1.jpg" \
  -F "limit=10" \
  -F "minSimilarity=0.7"
```

---

## Troubleshooting

### Connection Failed

**Error: `ECONNREFUSED` hoặc `ENOTFOUND`**

**Solutions:**
1. Check `QDRANT_URL` is correct
2. Check `QDRANT_API_KEY` is correct
3. Verify cluster is running in Qdrant Cloud dashboard
4. Check network connectivity from Railway

### Authentication Failed

**Error: `401 Unauthorized`**

**Solutions:**
1. Check `QDRANT_API_KEY` is correct
2. Verify API key in Qdrant Cloud dashboard
3. Make sure API key has proper permissions
4. Regenerate API key if needed

### Permission Denied

**Error: `403 Forbidden`**

**Solutions:**
1. Check API key permissions in Qdrant Cloud
2. Verify cluster access settings
3. Check if cluster is in correct organization

### Collection Not Found

**Error: Collection does not exist**

**Solutions:**
1. Collection will be auto-created when:
   - Creating first product with images
   - Running `yarn setup:image-search`
2. Or create manually via Qdrant Cloud dashboard

---

## Monitoring

### Storage Usage

**Check trong Qdrant Cloud Dashboard:**
- Vào cluster → Overview
- Xem "Storage Used" vs "Storage Limit" (1GB)
- Set alert khi đạt 80% (nếu có)

**Calculation:**
- ~2.5KB per embedding point
- 1GB = ~400,000 points
- ~200,000 products (nếu mỗi product có 2 images)

### Upgrade Trigger

**Khi nào upgrade:**
- Storage usage > 80% (~320,000 points)
- Số products > 200,000
- Cần dedicated resources
- Cần premium support

**Upgrade path:**
- Free → Starter ($25/month) → Professional ($100+/month)

---

## Environment Variables Reference

### Railway Development

```bash
QDRANT_URL=https://6b2f953d-75c4-4ce5-bc1d-a479bfc4a397.europe-west3-0.gcp.cloud.qdrant.io
QDRANT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.rUuiTtqvpzKWQIbFV6IoL4wmw2Is_6lVy3A8t7OqEVo
```

### Local Development (Optional)

```bash
# Use Qdrant Cloud for local testing
QDRANT_URL=https://6b2f953d-75c4-4ce5-bc1d-a479bfc4a397.europe-west3-0.gcp.cloud.qdrant.io
QDRANT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.rUuiTtqvpzKWQIbFV6IoL4wmw2Is_6lVy3A8t7OqEVo

# Or use local Qdrant
# QDRANT_URL=http://localhost:6333
# QDRANT_API_KEY=
```

---

## Quick Commands

```bash
# Test connection
yarn test:qdrant

# Setup image search (initialize collection + generate embeddings)
yarn setup:image-search

# Generate embeddings only (skip initialization)
yarn generate:embeddings-only

# Test image search
yarn test:image-search test-images/product1.jpg
```

---

## Next Steps

1. ✅ **Environment variables set** trên Railway
2. ⏳ **Test connection** - `yarn test:qdrant` (nếu test local)
3. ⏳ **Create product** với images trên Railway dev
4. ⏳ **Verify embedding** trong Qdrant Cloud dashboard
5. ⏳ **Test image search** API endpoint

---

## Support

- **Qdrant Cloud Dashboard:** https://cloud.qdrant.io
- **Qdrant Documentation:** https://qdrant.tech/documentation/
- **Cluster URL:** https://6b2f953d-75c4-4ce5-bc1d-a479bfc4a397.europe-west3-0.gcp.cloud.qdrant.io

---

**Last Updated:** 2025-01-22  
**Status:** Ready for Railway deployment

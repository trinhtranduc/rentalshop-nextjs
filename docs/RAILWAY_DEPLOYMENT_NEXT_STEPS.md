# Railway Deployment - Next Steps

## ✅ Completed

- [x] Qdrant Cloud cluster created
- [x] Environment variables set on Railway:
  - `QDRANT_URL`
  - `QDRANT_API_KEY`

---

## Step 1: Verify Setup

### Option A: Run Verification Script (Recommended)

```bash
# Run on Railway
railway run --service apis yarn verify:railway-setup

# Or if using tsx directly
railway run --service apis tsx scripts/verify-railway-setup.ts
```

**Expected Output:**
```
🚀 Verifying Railway setup for Image Search...

📊 Step 1: Checking environment variables...
✅ QDRANT_URL: Qdrant Cloud
✅ QDRANT_API_KEY: ***SET***

🔍 Step 2: Testing Qdrant connection...
✅ Qdrant connection successful!
✅ Collection "product-images" exists
   Vector size: 512
   Distance: Cosine
   Points count: 0

📦 Step 3: Checking products with images...
✅ Found X product(s) with images in database

✅ Railway setup verification completed!
```

### Option B: Check Railway Logs

```bash
# Monitor logs
railway logs --service apis -f

# Look for:
# ✅ Qdrant is connected
# ✅ Collection product-images initialized
```

---

## Step 2: Initialize Collection (If Needed)

Collection sẽ tự động được tạo khi:
- ✅ Tạo product mới với images (auto-generate embedding)
- ✅ Hoặc chạy setup script

**Manual initialization (optional):**
```bash
railway run --service apis yarn setup:image-search
```

**Expected Output:**
```
🚀 Setting up image search system...

🔍 Checking Qdrant connection...
✅ Qdrant is connected

📦 Initializing vector store...
✅ Collection product-images initialized

🎨 Generating product embeddings...
✅ Setup completed!
```

---

## Step 3: Test Auto-Generate Embedding

### Create Product với Images

**Via Admin Dashboard:**
1. Login vào admin dashboard trên Railway dev
2. Vào Products → Create New
3. Upload images khi tạo product
4. Save product

**Via API:**
```bash
# Create product with images
curl -X POST https://dev-api.anyrent.shop/api/products \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "data={\"name\":\"Test Product\",\"merchantId\":1,\"rentPrice\":100}" \
  -F "images=@test-image1.jpg" \
  -F "images=@test-image2.jpg"
```

### Verify Embedding Generation

**Check Railway Logs:**
```bash
railway logs --service apis -f

# Look for:
# 🔄 Generating embeddings for product 123 (2 image(s))...
# ✅ Generated and stored 2 embedding(s) for product 123
```

**Check Qdrant Cloud Dashboard:**
1. Mở: https://cloud.qdrant.io
2. Vào cluster của bạn
3. Vào Collections → `product-images`
4. Verify:
   - Points count increases (1 point per image)
   - Storage usage increases (~2.5KB per point)
   - Payload contains merchantId

---

## Step 4: Test Image Search

### Test API Endpoint

```bash
# Test image search
curl -X POST https://dev-api.anyrent.shop/api/products/search-by-image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@test-images/product1.jpg" \
  -F "limit=10" \
  -F "minSimilarity=0.7"
```

**Expected Response:**
```json
{
  "success": true,
  "code": "PRODUCTS_FOUND",
  "data": {
    "products": [
      {
        "id": 123,
        "name": "Product Name",
        "similarity": 0.95,
        "_debug": {
          "imageUrl": "https://cdn.example.com/image1.jpg",
          "similarityScore": 0.95
        }
      }
    ],
    "total": 1,
    "queryImage": "https://cdn.example.com/temp/search/..."
  }
}
```

### Verify Merchant-Based Filtering

**Test với Merchant 1:**
```bash
# Login as Merchant 1 user
# Search should only return Merchant 1 products
```

**Test với Merchant 2:**
```bash
# Login as Merchant 2 user
# Search should only return Merchant 2 products
# Should NOT see Merchant 1 products
```

**Test với Admin:**
```bash
# Login as Admin
# Search should return products from all merchants
```

---

## Step 5: Generate Embeddings for Existing Products (Optional)

Nếu bạn có products cũ cần generate embeddings:

```bash
# Generate embeddings for all products with images
railway run --service apis yarn generate:embeddings-only

# Or filter by merchant
# (Update script to support merchantId filter if needed)
```

**Expected Output:**
```
🚀 Starting batch embedding generation...

📊 Found 100 products
📊 Found 80 products with images

📦 Processing batch 1/8 (10 products)...
✅ Processed 10 products (10/80 total)

...

✅ Batch embedding generation completed!
📊 Summary: 80 processed, 0 errors
```

**Monitor Progress:**
- Check Railway logs for progress
- Check Qdrant Cloud dashboard for points count
- Storage usage should increase

---

## Troubleshooting

### Connection Failed

**Error:** `ECONNREFUSED` hoặc `ENOTFOUND`

**Solutions:**
1. Verify `QDRANT_URL` is correct
2. Verify `QDRANT_API_KEY` is correct
3. Check Qdrant Cloud dashboard - cluster is running
4. Check network connectivity from Railway

### Collection Not Found

**Error:** Collection does not exist

**Solutions:**
1. Collection will auto-create on first embedding
2. Or run: `railway run --service apis yarn setup:image-search`
3. Or run: `railway run --service apis yarn verify:railway-setup`

### Embedding Generation Failed

**Error:** Embedding generation errors in logs

**Solutions:**
1. Check image URLs are accessible (CloudFront working)
2. Check FashionCLIP model download (first time ~500MB)
3. Check Railway memory limits (model needs ~500MB RAM)
4. Check logs for specific error messages

### Search Returns No Results

**Error:** Search returns empty array

**Solutions:**
1. Verify embeddings exist in Qdrant (check dashboard)
2. Check merchantId filter is correct
3. Try lower minSimilarity (default 0.7)
4. Verify query image is similar to product images

---

## Verification Checklist

### Connection
- [ ] Qdrant Cloud connection successful
- [ ] Collection `product-images` exists
- [ ] Indexes created (merchantId, categoryId, outletId)

### Embedding Generation
- [ ] Product creation triggers embedding generation
- [ ] Embeddings stored in Qdrant
- [ ] Metadata includes merchantId
- [ ] Multiple images create multiple points

### Image Search
- [ ] Search API returns results
- [ ] Merchant-based filtering works
- [ ] Similarity scores are correct
- [ ] Results sorted by similarity

### Merchant Isolation
- [ ] Merchant 1 only sees Merchant 1 products
- [ ] Merchant 2 only sees Merchant 2 products
- [ ] Admin can see all products
- [ ] Filter cannot be bypassed

---

## Quick Commands Reference

```bash
# Verify setup
railway run --service apis yarn verify:railway-setup

# Test connection
railway run --service apis yarn test:qdrant

# Initialize collection
railway run --service apis yarn setup:image-search

# Generate embeddings for existing products
railway run --service apis yarn generate:embeddings-only

# View logs
railway logs --service apis -f
```

---

## Next Steps After Verification

1. **Monitor Storage Usage**
   - Check Qdrant Cloud dashboard
   - Monitor storage usage (1GB free tier)
   - Plan upgrade when approaching 80%

2. **Generate Embeddings for Existing Products**
   - Run batch script if needed
   - Monitor progress
   - Verify all products have embeddings

3. **Performance Monitoring**
   - Monitor embedding generation time
   - Monitor search query performance
   - Optimize if needed

4. **Error Monitoring**
   - Check logs for embedding generation errors
   - Monitor Qdrant connection issues
   - Set up alerts if needed

---

**Last Updated:** 2025-01-22  
**Status:** Ready for testing

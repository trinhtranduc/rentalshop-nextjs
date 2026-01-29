# Image Search Implementation Checklist

## Pre-Deployment Checklist

### ✅ Completed

- [x] **Qdrant Cloud Setup**
  - [x] Qdrant Cloud account created
  - [x] Free tier cluster created
  - [x] API key obtained
  - [x] Cluster URL: `https://6b2f953d-75c4-4ce5-bc1d-a479bfc4a397.europe-west3-0.gcp.cloud.qdrant.io`

- [x] **Configuration Files**
  - [x] `env.example` updated with Qdrant Cloud example
  - [x] Environment variables documented

- [x] **Documentation**
  - [x] `docs/QDRANT_CLOUD_SETUP_GUIDE.md` - Setup guide
  - [x] `docs/QDRANT_CLOUD_FREE_TIER_ANALYSIS.md` - Cost analysis
  - [x] `docs/IMAGE_SEARCH_EMBEDDING_STRATEGY.md` - Strategy
  - [x] `docs/IMAGE_UPLOAD_TO_EMBEDDING_FLOW.md` - Complete flow
  - [x] `docs/EMBEDDING_GENERATION_AND_STORAGE_DETAILED.md` - Detailed steps

- [x] **Test Scripts**
  - [x] `scripts/test-qdrant-connection.ts` - Connection test
  - [x] `package.json` - Added `test:qdrant` command

- [x] **Code Implementation**
  - [x] Auto-generate embedding when creating product
  - [x] Background job implementation
  - [x] Merchant-based filtering
  - [x] Qdrant integration
  - [x] Image search API endpoint

### ⏳ Pending (Railway Setup)

- [ ] **Railway Environment Variables**
  - [ ] Set `QDRANT_URL` on Railway
  - [ ] Set `QDRANT_API_KEY` on Railway
  - [ ] Verify variables are set correctly

- [ ] **Collection Initialization**
  - [ ] Collection `product-images` will be auto-created on first embedding
  - [ ] Or run `yarn setup:image-search` to initialize manually
  - [ ] Verify indexes are created (merchantId, categoryId, outletId)

- [ ] **Testing**
  - [ ] Test connection from Railway API
  - [ ] Test auto-generate embedding (create product with images)
  - [ ] Test image search API endpoint
  - [ ] Verify merchant-based filtering works

### 🔍 Potential Issues to Check

1. **Collection Auto-Initialization**
   - Current: Collection created on first `upsert` if doesn't exist
   - Issue: Qdrant may throw error if collection doesn't exist
   - Solution: Add `initialize()` call before storing embeddings

2. **Error Handling**
   - Background job errors are logged but don't fail product creation
   - Need to verify error handling is robust

3. **Model Download**
   - FashionCLIP model (~500MB) downloaded on first use
   - May cause timeout on Railway if not cached
   - Solution: Pre-download model or handle timeout gracefully

---

## Implementation Fixes Needed

### Fix 1: Auto-Initialize Collection

**Issue:** `generateProductEmbedding` doesn't call `initialize()` before storing embeddings.

**Fix:** Add initialization check before storing.

**File:** `packages/database/src/jobs/generate-product-embeddings.ts`

**Change:**
```typescript
// Initialize services
const embeddingService = getEmbeddingService();
const vectorStore = getVectorStore();

// Initialize collection if needed
await vectorStore.initialize();
```

---

## Deployment Steps

### Step 1: Set Railway Environment Variables

1. Vào Railway dashboard
2. Development project → API service → Variables
3. Add:
   ```
   QDRANT_URL=https://6b2f953d-75c4-4ce5-bc1d-a479bfc4a397.europe-west3-0.gcp.cloud.qdrant.io
   QDRANT_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.rUuiTtqvpzKWQIbFV6IoL4wmw2Is_6lVy3A8t7OqEVo
   ```

### Step 2: Deploy/Redeploy API Service

- Railway sẽ tự động redeploy khi env vars thay đổi
- Hoặc manual redeploy nếu cần

### Step 3: Initialize Collection (Optional)

**Option A: Auto-create (Recommended)**
- Collection sẽ tự động được tạo khi có embedding đầu tiên
- Chỉ cần tạo product với images

**Option B: Manual Initialize**
```bash
# Run on Railway
railway run --service apis yarn setup:image-search
```

### Step 4: Test Connection

```bash
# Test from Railway logs
railway logs --service apis -f

# Look for:
# ✅ Qdrant is connected
# ✅ Collection product-images initialized
```

### Step 5: Test Auto-Generate Embedding

1. Create product với images trên Railway dev
2. Check logs for:
   ```
   🔄 Generating embeddings for product 123 (2 image(s))...
   ✅ Generated and stored 2 embedding(s) for product 123
   ```
3. Check Qdrant Cloud dashboard:
   - Collection `product-images` exists
   - Points count increases

### Step 6: Test Image Search

```bash
# Test API endpoint
curl -X POST https://dev-api.anyrent.shop/api/products/search-by-image \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "image=@test-images/product1.jpg" \
  -F "limit=10"
```

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

## Next Steps After Deployment

1. **Monitor Storage Usage**
   - Check Qdrant Cloud dashboard
   - Monitor storage usage (1GB free tier)
   - Plan upgrade when approaching 80%

2. **Generate Embeddings for Existing Products**
   - Run batch script: `yarn generate:embeddings-only`
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
**Status:** Ready for Railway deployment (pending env vars setup)

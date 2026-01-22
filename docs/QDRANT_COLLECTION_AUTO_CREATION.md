# Qdrant Collection Auto-Creation

## Câu Hỏi: Có Cần Tạo Collection `product-images` Thủ Công?

**Trả lời: KHÔNG CẦN** - Collection sẽ tự động được tạo khi có embedding đầu tiên.

---

## Cơ Chế Tự Động Tạo Collection

### 1. Auto-Creation khi Store Embedding

**File:** `packages/database/src/ml/vector-store.ts` (line 335-350)

**Process:**
1. Khi store embedding, Qdrant sẽ check collection có tồn tại không
2. Nếu collection không tồn tại (404 error), sẽ tự động initialize
3. Retry store embedding sau khi collection được tạo

**Code:**
```typescript
try {
  await this.client.upsert(this.collectionName, {
    points
  });
} catch (error: any) {
  // If collection doesn't exist, try to initialize and retry
  if (error?.status === 404 || error?.message?.includes('not found')) {
    console.log('⚠️ Collection not found, initializing...');
    await this.initialize(); // Tạo collection + indexes
    // Retry upsert after initialization
    await this.client.upsert(this.collectionName, { points });
  }
}
```

### 2. Auto-Initialization trong Background Job

**File:** `packages/database/src/jobs/generate-product-embeddings.ts` (line 57-63)

**Process:**
1. Khi generate embedding, sẽ gọi `vectorStore.initialize()` trước
2. `initialize()` sẽ check collection có tồn tại không
3. Nếu chưa có, sẽ tạo collection + indexes

**Code:**
```typescript
// Initialize services
const embeddingService = getEmbeddingService();
const vectorStore = getVectorStore();

// Initialize collection if needed (creates collection and indexes)
try {
  await vectorStore.initialize();
} catch (error) {
  console.error(`⚠️ Failed to initialize Qdrant collection:`, error);
  // Continue anyway - collection might already exist
}
```

---

## Khi Nào Collection Được Tạo?

### Scenario 1: Tạo Product Mới với Images (Recommended)

**Flow:**
1. User tạo product với images
2. Product được lưu vào database
3. Background job `generateProductEmbedding()` được trigger
4. `vectorStore.initialize()` được gọi → Tạo collection nếu chưa có
5. Embeddings được generate và store

**Result:** Collection tự động được tạo với:
- Name: `product-images`
- Vector size: 512
- Distance: Cosine
- Indexes: merchantId, categoryId, outletId

### Scenario 2: Store Embedding Trực Tiếp

**Flow:**
1. Code gọi `vectorStore.storeProductImagesEmbeddings()`
2. Qdrant trả về 404 (collection không tồn tại)
3. Code tự động gọi `initialize()` → Tạo collection
4. Retry store embedding

**Result:** Collection tự động được tạo

---

## Initialize Function Details

**File:** `packages/database/src/ml/vector-store.ts` (line 52-101)

**Process:**
1. Check collection có tồn tại không
2. Nếu có → Skip
3. Nếu không → Tạo collection với config:
   - Vector size: 512 (CLIP standard)
   - Distance: Cosine similarity
   - Optimizers config
   - Replication factor: 1

4. Tạo indexes:
   - `merchantId` (keyword) - **QUAN TRỌNG cho filtering**
   - `categoryId` (keyword)
   - `outletId` (keyword)

**Code:**
```typescript
async initialize(): Promise<void> {
  try {
    const collection = await this.client.getCollection(this.collectionName);
    console.log(`✅ Collection ${this.collectionName} already exists`);
    return;
  } catch {
    // Collection không tồn tại, tạo mới
  }

  await this.client.createCollection(this.collectionName, {
    vectors: {
      size: 512, // CLIP embedding dimension
      distance: 'Cosine' // Cosine similarity
    },
    optimizers_config: {
      default_segment_number: 2
    },
    replication_factor: 1
  });

  // Create indexes cho filtering
  await this.client.createPayloadIndex(this.collectionName, {
    field_name: 'merchantId',
    field_schema: 'keyword'
  });
  // ... other indexes
}
```

---

## Manual Creation (Optional)

Nếu bạn muốn tạo collection thủ công để verify setup trước:

### Option 1: Run Setup Script

```bash
railway run --service apis yarn setup:image-search
```

Script sẽ:
1. Check Qdrant connection
2. Initialize collection (tạo nếu chưa có)
3. Generate embeddings cho tất cả products (optional)

### Option 2: Via Qdrant Cloud Dashboard

1. Mở: https://cloud.qdrant.io
2. Vào cluster của bạn
3. Vào Collections → Create Collection
4. Config:
   - **Name:** `product-images`
   - **Vector size:** `512`
   - **Distance:** `Cosine`
5. Create indexes manually (optional):
   - `merchantId` (keyword)
   - `categoryId` (keyword)
   - `outletId` (keyword)

---

## Recommendation

### ✅ **Không Cần Tạo Thủ Công**

**Lý do:**
1. Collection sẽ tự động được tạo khi có embedding đầu tiên
2. Indexes sẽ tự động được tạo
3. Đơn giản hơn, ít steps hơn

**Khi nào cần tạo thủ công:**
- Muốn verify setup trước khi tạo product
- Muốn test connection và collection config
- Debugging issues

### Workflow Recommended

1. **Tạo product với images** → Collection tự động được tạo
2. **Check Qdrant Cloud dashboard** → Verify collection và points
3. **Test image search** → Verify hoạt động đúng

---

## Verification Steps

### After Creating Product với Images

1. **Check Railway Logs:**
   ```bash
   railway logs --service apis -f
   ```
   Look for:
   - `🔄 Generating embeddings for product...`
   - `✅ Generated and stored X embedding(s)`
   - `✅ Collection product-images initialized` (nếu collection mới được tạo)

2. **Check Qdrant Cloud Dashboard:**
   - Vào: https://cloud.qdrant.io
   - Cluster → Collections → `product-images`
   - Verify:
     - ✅ Collection exists
     - ✅ Vector size: 512
     - ✅ Distance: Cosine
     - ✅ Points count > 0
     - ✅ Indexes: merchantId, categoryId, outletId

3. **Test Image Search:**
   ```bash
   curl -X POST https://dev-api.anyrent.shop/api/products/search-by-image \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -F "image=@test-image.jpg"
   ```

---

## Summary

| Question | Answer |
|----------|--------|
| **Có cần tạo collection thủ công?** | ❌ **KHÔNG** - Tự động tạo |
| **Khi nào collection được tạo?** | Khi có embedding đầu tiên |
| **Indexes có tự động tạo không?** | ✅ **CÓ** - merchantId, categoryId, outletId |
| **Có thể tạo thủ công không?** | ✅ **CÓ** - Nếu muốn verify setup trước |

---

## Next Steps

1. ✅ **Environment variables đã set** trên Railway
2. ⏳ **Tạo product với images** → Collection sẽ tự động được tạo
3. ⏳ **Verify trong Qdrant Cloud dashboard**
4. ⏳ **Test image search**

---

**Last Updated:** 2025-01-22  
**Status:** Collection auto-creation is working

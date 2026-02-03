# 🔄 Embedding Sync Flow - Chi Tiết

## 📋 Tổng Quan

Flow đồng bộ embeddings từ **Database (PostgreSQL)** → **S3 (Images)** → **Python API (Embeddings)** → **Qdrant (Vector Database)**.

---

## 🎯 Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  STEP 1: Fetch Products from Database                          │
│  ─────────────────────────────────────────────────────────────  │
│  PostgreSQL Database                                            │
│    ↓                                                            │
│  Query: SELECT * FROM Product                                   │
│    WHERE images IS NOT NULL                                     │
│    AND isActive = true                                          │
│    [AND merchantId = ?] (if --merchant-id specified)           │
│    ↓                                                            │
│  Result: Array<Product> với images field                        │
│    ↓                                                            │
│  Parse images: ["url1", "url2"] hoặc "url1,url2"               │
│    ↓                                                            │
│  Filter: Chỉ lấy products có ít nhất 1 image                  │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 2: Compare Database vs Qdrant (Incremental Mode)         │
│  ─────────────────────────────────────────────────────────────  │
│  IF --force:                                                    │
│    → Skip comparison, sync tất cả products                      │
│                                                                  │
│  ELSE (Incremental):                                            │
│    ↓                                                            │
│  Fetch all Qdrant points:                                       │
│    Qdrant.scroll(collection, { limit: 100, ... })               │
│    → Map<productId, QdrantPoint>                                │
│    ↓                                                            │
│  Compare:                                                       │
│    FOR each product:                                            │
│      IF product.id NOT in Qdrant:                              │
│        → Missing (cần sync)                                     │
│      ELSE IF product.updatedAt > Qdrant.updatedAt:             │
│        → Outdated (cần sync)                                    │
│      ELSE:                                                      │
│        → Up to date (skip)                                      │
│    ↓                                                            │
│  Result: productsToSync = [missing, outdated]                   │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 3: Generate Embeddings (Batch Processing)                 │
│  ─────────────────────────────────────────────────────────────  │
│  Split productsToSync into batches (default: 50 products/batch) │
│    ↓                                                            │
│  FOR each batch (parallel với workers):                         │
│    ↓                                                            │
│    3.1 Extract S3 Keys:                                         │
│      FOR each product:                                          │
│        Parse images → Get first image URL                       │
│        Extract S3 key: "products/merchant-{id}/image.jpg"       │
│        → batchData = [{product, imageUrl, s3Key}, ...]         │
│    ↓                                                            │
│    3.2 Call Python API /embed/s3-batch:                        │
│      FormData:                                                  │
│        - s3_keys: JSON.stringify([s3Key1, s3Key2, ...])        │
│        - bucket_name: "anyrent-images-pro"                     │
│        - region: "ap-southeast-1"                               │
│        - aws_access_key_id: "AKIARZ4U..."                      │
│        - aws_secret_access_key: "qPQ99Wfd..."                   │
│      ↓                                                          │
│      Python API:                                                │
│        1. Download images từ S3 (direct access)                 │
│        2. Load images vào CLIP model                            │
│        3. Generate embeddings (512-dim vectors)                 │
│        4. Return: { embeddings: [[...], [...], ...] }          │
│    ↓                                                            │
│    3.3 Create Qdrant Points:                                   │
│      FOR each embedding:                                        │
│        point = {                                                │
│          id: randomUUID(),                                      │
│          vector: embedding (512 dimensions),                   │
│          payload: {                                             │
│            productId: product.id (CUID),                        │
│            imageUrl: imageUrl,                                  │
│            merchantId: product.merchantId,                      │
│            categoryId: product.categoryId,                       │
│            productName: product.name,                           │
│            updatedAt: new Date().toISOString()                  │
│          }                                                      │
│        }                                                        │
│    ↓                                                            │
│    3.4 Store in Qdrant:                                        │
│      Qdrant.upsert(collection, { points: [...] })              │
│      → Embeddings được lưu vào Qdrant                          │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│  STEP 4: Summary & Report                                      │
│  ─────────────────────────────────────────────────────────────  │
│  Calculate:                                                     │
│    - Total products: X                                          │
│    - Up to date: Y                                              │
│    - Synced: Z                                                  │
│    - Errors: E                                                  │
│    - Duration: D minutes                                        │
│    - Speed: Z/D products/minute                                 │
│    ↓                                                            │
│  Display summary report                                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 Chi Tiết Từng Bước

### **STEP 1: Fetch Products from Database**

**Code:** `scripts/sync-embeddings-incremental.ts` (line 447-450)

```typescript
// Query database
const products = await prisma.product.findMany({
  where: {
    images: { not: Prisma.JsonNull },
    isActive: true,
    // merchantId filter nếu có --merchant-id
  },
  select: {
    id: true,           // CUID
    name: true,
    images: true,       // JSON hoặc string
    merchantId: true,
    categoryId: true,
    updatedAt: true
  },
  orderBy: { updatedAt: 'desc' }
});

// Filter products có images
const productsWithImages = products.filter(p => {
  const images = parseProductImages(p.images);
  return images.length > 0;
});
```

**Output:**
- Array of products với images
- Mỗi product có: `id`, `name`, `images`, `merchantId`, `categoryId`, `updatedAt`

---

### **STEP 2: Compare Database vs Qdrant**

**Code:** `scripts/sync-embeddings-incremental.ts` (line 473-499)

**Incremental Mode (default):**

```typescript
// Fetch all Qdrant points
const qdrantPoints = await getAllQdrantPoints(vectorStore);
// Result: Map<productId, QdrantPoint>

// Compare
const comparison = findMissingAndOutdated(products, qdrantPoints);
// Result: {
//   missing: Product[],      // Không có trong Qdrant
//   outdated: Product[],     // Đã update sau khi tạo embedding
//   upToDate: Product[]      // Không cần sync
// }

productsToSync = [...comparison.missing, ...comparison.outdated];
```

**Force Mode (`--force`):**

```typescript
// Skip comparison, sync tất cả
productsToSync = products;
```

**Comparison Logic:**

```typescript
for (const product of products) {
  const qdrantPoint = qdrantPoints.get(product.id);
  
  if (!qdrantPoint) {
    // Missing - cần sync
    missing.push(product);
  } else {
    const qdrantUpdatedAt = new Date(qdrantPoint.payload?.updatedAt);
    if (product.updatedAt > qdrantUpdatedAt) {
      // Outdated - cần sync
      outdated.push(product);
    } else {
      // Up to date - skip
      upToDate.push(product);
    }
  }
}
```

---

### **STEP 3: Generate Embeddings**

**Code:** `scripts/sync-embeddings-incremental.ts` (line 253-331)

#### **3.1 Extract S3 Keys**

```typescript
for (const product of products) {
  const images = parseProductImages(product.images);
  const imageUrl = images[0]; // Use first image
  
  if (imageUrl) {
    const s3Key = extractKeyFromImageUrl(imageUrl);
    // Example: "https://anyrent-images-pro.s3.../products/merchant-1/image.jpg"
    // → s3Key: "products/merchant-1/image.jpg"
    
    if (s3Key) {
      batchData.push({ product, imageUrl, s3Key });
    }
  }
}
```

#### **3.2 Call Python API**

**Code:** `packages/database/src/ml/image-embeddings.ts` (line 375-460)

```typescript
// Create form data
const formData = new FormData();
formData.append('s3_keys', JSON.stringify(s3Keys));
formData.append('bucket_name', bucketName);
formData.append('region', awsRegion);
formData.append('aws_access_key_id', awsAccessKeyId);
formData.append('aws_secret_access_key', awsSecretAccessKey);

// Call Python API
const response = await fetch(`${apiUrl}/embed/s3-batch`, {
  method: 'POST',
  body: formData
});

const data = await response.json();
// Result: { success: true, embeddings: [[...], [...], ...] }
```

**Python API Process:**

```python
# python-embedding-service/app/main.py
@app.post("/embed/s3-batch")
async def generate_embeddings_from_s3(
    s3_keys: str = Form(...),
    bucket_name: str = Form(...),
    region: str = Form("ap-southeast-1"),
    aws_access_key_id: str = Form(...),
    aws_secret_access_key: str = Form(...)
):
    # 1. Parse S3 keys
    s3_keys_list = json.loads(s3_keys)
    
    # 2. Download images từ S3 (direct access)
    s3_client = boto3.client('s3', ...)
    image_bytes_list = []
    for s3_key in s3_keys_list:
        response = s3_client.get_object(Bucket=bucket_name, Key=s3_key)
        image_bytes = response['Body'].read()
        image_bytes_list.append(image_bytes)
    
    # 3. Generate embeddings với CLIP model
    embeddings = await model.generate_embeddings_batch(image_bytes_list)
    # Result: List of 512-dim vectors
    
    return { success: True, embeddings: embeddings }
```

#### **3.3 Create Qdrant Points**

```typescript
const results = [];
for (let i = 0; i < embeddings.length && i < batchData.length; i++) {
  const { product, imageUrl } = batchData[i];
  
  results.push({
    imageId: randomUUID(),        // Unique ID cho mỗi image
    embedding: embeddings[i],     // 512-dim vector
    metadata: {
      productId: String(product.id),      // CUID
      imageUrl: imageUrl,
      merchantId: String(product.merchantId),
      categoryId: product.categoryId ? String(product.categoryId) : undefined,
      productName: product.name,
      updatedAt: new Date().toISOString()
    }
  });
}
```

#### **3.4 Store in Qdrant**

**Code:** `packages/database/src/ml/vector-store.ts` (line 395-430)

```typescript
// Store embeddings
await vectorStore.storeProductImagesEmbeddings(results);

// Process:
// 1. Sanitize strings (remove Unicode issues)
// 2. Create Qdrant points:
//    points = results.map(r => ({
//      id: r.imageId,              // UUID
//      vector: r.embedding,        // 512-dim vector
//      payload: {
//        productId: r.metadata.productId,
//        imageUrl: r.metadata.imageUrl,
//        merchantId: r.metadata.merchantId,
//        categoryId: r.metadata.categoryId,
//        productName: r.metadata.productName,
//        updatedAt: r.metadata.updatedAt
//      }
//    }))
// 3. Upsert to Qdrant:
//    Qdrant.upsert(collection, { points })
```

---

## ⚡ Parallel Processing

**Code:** `scripts/sync-embeddings-incremental.ts` (line 336-381)

```typescript
// Split products into batches
const batches = [];
for (let i = 0; i < products.length; i += batchSize) {
  batches.push(products.slice(i, i + batchSize));
}

// Process batches with parallel workers
const workerPromises = [];
for (let i = 0; i < Math.min(workers, batches.length); i++) {
  const batch = batches[i];
  workerPromises.push(processBatch(batch, ...));
}

// Wait for all workers
await Promise.all(workerPromises);
```

**Example với 5 workers:**
```
Batch 1  → Worker 1 → Python API → Qdrant
Batch 2  → Worker 2 → Python API → Qdrant
Batch 3  → Worker 3 → Python API → Qdrant
Batch 4  → Worker 4 → Python API → Qdrant
Batch 5  → Worker 5 → Python API → Qdrant
Batch 6  → Worker 1 → Python API → Qdrant (reuse)
...
```

---

## 📊 Data Flow Summary

```
PostgreSQL (Products)
    ↓
[Extract S3 Keys]
    ↓
Python API (S3 Direct Access)
    ↓
[Generate Embeddings - CLIP Model]
    ↓
[Create Qdrant Points]
    ↓
Qdrant (Vector Database)
```

**Key Points:**
- ✅ **S3 Direct Access**: Không download images về local
- ✅ **Batch Processing**: Xử lý nhiều images cùng lúc
- ✅ **Parallel Workers**: Tăng tốc với multiple workers
- ✅ **Incremental Sync**: Chỉ sync missing/outdated
- ✅ **Error Handling**: Retry và error tracking

---

## 🎯 Performance

**Incremental Sync (1.5k images):**
- Missing: 50 products → **30 giây - 2 phút**
- Force (all): 1500 products → **5-10 phút**

**Full Sync (1.5k images):**
- Reset + Force: **5-10 phút**

**Speed:**
- **60-450 products/minute** (tùy vào số lượng missing và network)

---

## 🔧 Configuration

**Environment Variables:**
- `QDRANT_COLLECTION_ENV`: `development` hoặc `production`
- `AWS_ACCESS_KEY_ID`: AWS credentials
- `AWS_SECRET_ACCESS_KEY`: AWS credentials
- `PYTHON_EMBEDDING_API_URL`: Python API URL

**Command Options:**
- `--yes`: Skip confirmation
- `--force`: Force regenerate all
- `--merchant-id=123`: Sync specific merchant
- `--batch-size=50`: Batch size (default: 50)
- `--workers=5`: Number of workers (default: 5)

---

## ✅ Kết Luận

Flow sync embeddings được tối ưu với:
1. **Incremental sync** - Chỉ sync missing/outdated
2. **S3 direct access** - Không download/upload
3. **Batch processing** - Xử lý nhiều images cùng lúc
4. **Parallel workers** - Tăng tốc với concurrent processing
5. **Error handling** - Robust error handling và retry

**KHUYẾN NGHỊ:** Dùng incremental sync cho sync định kỳ, force mode cho reset toàn bộ.

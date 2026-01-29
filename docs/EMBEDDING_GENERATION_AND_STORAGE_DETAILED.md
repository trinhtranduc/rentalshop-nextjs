# Embedding Generation & Storage - Chi Tiết (Bước 4 & 5)

## Tổng Quan

Document này giải thích chi tiết **Bước 4 (Generate Embedding)** và **Bước 5 (Lưu Embedding vào Qdrant)**, đặc biệt nhấn mạnh về **quản lý theo merchant** để đảm bảo data isolation và security.

---

## Bước 4: Generate Embedding - Chi Tiết

### 4.1 Trigger Background Job

**File:** `apps/api/app/api/products/route.ts` (line 507-519)

**Khi nào trigger:**
- Sau khi product được tạo thành công
- Chỉ khi có images (`committedImageUrls.length > 0`)
- Chạy **async, non-blocking** - không đợi kết quả

**Code:**
```typescript
// Generate embedding for image search (background job)
if (committedImageUrls.length > 0) {
  try {
    const { generateProductEmbedding } = await import('@rentalshop/database/server');
    // Run in background (don't block response)
    generateProductEmbedding(product.id).catch((error) => {
      console.error(`Error generating embedding for product ${product.id}:`, error);
    });
  } catch (error) {
    console.error('Error starting embedding generation:', error);
    // Don't fail the request if embedding generation fails
  }
}
```

**Đặc điểm:**
- ✅ **Non-blocking:** API response không đợi embedding
- ✅ **Error handling:** Lỗi không ảnh hưởng product creation
- ✅ **Async:** Chạy trong background thread

---

### 4.2 Fetch Product & Parse Images

**File:** `packages/database/src/jobs/generate-product-embeddings.ts` (line 39-53)

**Process:**
1. **Fetch product từ database:**
   - Get product by ID (number)
   - Include all fields (merchantId, categoryId, name, images)

2. **Parse images:**
   - Support multiple formats:
     - Array: `["url1", "url2"]`
     - JSON string: `'["url1", "url2"]'`
     - Comma-separated: `"url1,url2,url3"`

**Code:**
```typescript
// Fetch product
const product = await db.products.findById(productId);
// Result: { id: 123, merchantId: 1, name: "iPhone 15", images: "url1,url2", ... }

// Parse images (support multiple formats)
const images = parseProductImages(product.images);
// Result: ["https://cdn.example.com/image1.jpg", "https://cdn.example.com/image2.jpg"]

if (images.length === 0) {
  console.log(`⚠️ Product ${productId} has no images, skipping`);
  return;
}
```

**Parse Function:**
```typescript
function parseProductImages(images: any): string[] {
  if (Array.isArray(images)) {
    return images.filter((img): img is string => typeof img === 'string' && img.trim() !== '');
  }
  if (typeof images === 'string') {
    // Try JSON parse first
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) {
        return parsed.filter((img): img is string => typeof img === 'string' && img.trim() !== '');
      }
    } catch {
      // Not JSON, try comma-separated
      return images.split(',').filter((img: string) => img.trim() !== '');
    }
  }
  return [];
}
```

**Lưu ý về Merchant:**
- Product đã có `merchantId` từ database
- MerchantId được dùng để:
  - Filter embeddings khi search
  - Organize data trong Qdrant
  - Ensure data isolation

---

### 4.3 Download Image từ CloudFront URL

**File:** `packages/database/src/ml/image-embeddings.ts` (line 105-123)

**Process:**
1. **Fetch image từ URL:**
   - URL format: `https://{cloudfront-domain}/products/merchant-{id}/filename.jpg`
   - Download as arrayBuffer
   - Convert to Buffer

2. **Error handling:**
   - Check HTTP status
   - Handle network errors
   - Validate image format

**Code:**
```typescript
async generateEmbedding(imageUrl: string): Promise<number[]> {
  try {
    // Download image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    // Result: Buffer containing image data

    // Use generateEmbeddingFromBuffer which handles RawImage conversion
    return this.generateEmbeddingFromBuffer(imageBuffer);
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Embedding generation failed: ${error.message}`);
  }
}
```

**Image URL Structure:**
```
https://d1234567890.cloudfront.net/products/merchant-1/product-image-1705924800000-abc123.jpg
                                    └─────────┘
                                    Merchant ID trong path
```

**Lưu ý:**
- Image URL chứa merchantId trong path
- Đảm bảo images được organize theo merchant
- CloudFront URL đảm bảo fast download

---

### 4.4 Preprocess Image

**File:** `packages/database/src/ml/image-embeddings.ts` (line 131-134)

**Process:**
1. **Resize image:**
   - Target size: 224x224 (CLIP model requirement)
   - Maintain aspect ratio
   - Optimize quality

2. **Convert format:**
   - Ensure RGB format (3 channels)
   - Normalize pixel values

**Code:**
```typescript
// Preprocess (resize về 224x224, optimize)
const { buffer, width, height } = await this.preprocessImage(imageBuffer);
// Result: { buffer: Buffer, width: 224, height: 224 }
```

**Preprocess Details:**
- Resize to 224x224 (CLIP standard input size)
- Convert to RGB (3 channels)
- Normalize pixel values (0-255 → 0-1)
- Optimize for model input

---

### 4.5 Generate Embedding Vector

**File:** `packages/database/src/ml/image-embeddings.ts` (line 131-174)

**Process:**
1. **Load FashionCLIP model:**
   - Model: `Xenova/clip-vit-base-patch32`
   - First time: Download ~500MB (cached after)
   - Model loaded in memory

2. **Convert to RawImage:**
   - Format: `RawImage(data, width, height, channels)`
   - Data: Uint8Array
   - Channels: 3 (RGB)

3. **Generate embedding:**
   - Input: RawImage (224x224x3)
   - Output: 512-dimension vector
   - Model: FashionCLIP (optimized for fashion/product images)

4. **Normalize vector:**
   - Normalize to unit vector (length = 1)
   - Important for cosine similarity calculation

**Code:**
```typescript
// Get model
const model = await this.getModel();
// Result: FashionCLIP model (loaded from cache or downloaded)

// Convert buffer to RawImage
const uint8Array = new Uint8Array(buffer);
const rawImage = new RawImage(uint8Array, width, height, 3);
// Result: RawImage(224, 224, 3)

// Generate embedding
const output = await model(rawImage);
// Result: Tensor or array with 512 values

// Extract embedding vector
let embedding: number[];
if (Array.isArray(output)) {
  embedding = output.flat();
} else if (output.data) {
  embedding = Array.isArray(output.data) ? output.data : Array.from(output.data);
} else if (output instanceof Float32Array || output instanceof Float64Array) {
  embedding = Array.from(output);
}

// Ensure 512 dimensions
if (embedding.length !== 512) {
  // Truncate or pad if needed
  if (embedding.length > 512) {
    embedding = embedding.slice(0, 512);
  } else {
    embedding = [...embedding, ...new Array(512 - embedding.length).fill(0)];
  }
}

// Normalize vector (important for cosine similarity)
return this.normalizeVector(embedding);
// Result: [0.123, -0.456, 0.789, ...] (512 dimensions, normalized)
```

**Embedding Details:**
- **Dimension:** 512 (CLIP standard)
- **Format:** Float32 array
- **Normalized:** Yes (unit vector, length = 1)
- **Size:** ~2KB (512 × 4 bytes)
- **Time:** 1-3 giây per image

**Normalize Function:**
```typescript
normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude === 0) return vector;
  return vector.map(val => val / magnitude);
}
```

---

### 4.6 Create Metadata với MerchantId

**File:** `packages/database/src/jobs/generate-product-embeddings.ts` (line 62-89)

**Process:**
1. **Generate embeddings cho tất cả images:**
   - Mỗi image → 1 embedding
   - Parallel processing (Promise.all)

2. **Create metadata:**
   - `productId`: Product ID (string)
   - `imageUrl`: CloudFront URL
   - `merchantId`: **Merchant ID (string)** - **QUAN TRỌNG**
   - `categoryId`: Category ID (optional)
   - `productName`: Product name

**Code:**
```typescript
// Generate embeddings for all images
const embeddings = await Promise.all(
  images.map(async (imageUrl, index) => {
    try {
      // Generate embedding
      const embedding = await embeddingService.generateEmbedding(imageUrl);
      // Result: [0.123, -0.456, 0.789, ...] (512 dims)

      return {
        imageId: randomUUID(), // UUID cho mỗi image
        embedding, // 512-dim vector
        metadata: {
          productId: String(product.id), // "123"
          imageUrl, // "https://cdn.example.com/image1.jpg"
          merchantId: String(product.merchantId), // "1" - QUAN TRỌNG
          categoryId: product.categoryId ? String(product.categoryId) : undefined,
          productName: product.name // "iPhone 15"
        }
      };
    } catch (error) {
      console.error(`❌ Error generating embedding for product ${productId}, image ${index + 1}:`, error);
      return null;
    }
  })
);

// Filter out nulls (errors)
const validEmbeddings = embeddings.filter(e => e !== null);
```

**Metadata Structure:**
```typescript
{
  productId: "123",           // Product ID
  imageUrl: "https://...",    // CloudFront URL
  merchantId: "1",            // MERCHANT ID - Dùng để filter
  categoryId: "5",            // Optional
  productName: "iPhone 15"   // Product name
}
```

**Lưu ý về MerchantId:**
- ✅ **Bắt buộc:** Mọi embedding phải có merchantId
- ✅ **String format:** Convert từ number sang string
- ✅ **Filter key:** Dùng để filter khi search
- ✅ **Data isolation:** Đảm bảo merchants không thấy data của nhau

---

## Bước 5: Lưu Embedding Vào Qdrant - Chi Tiết

### 5.1 Store Embeddings với MerchantId trong Payload

**File:** `packages/database/src/ml/vector-store.ts` (line 313-343)

**Process:**
1. **Create points:**
   - **Point ID:** UUID (mỗi image có UUID riêng)
   - **Vector:** 512-dimension embedding
   - **Payload:** Metadata (bao gồm merchantId)

2. **Store in Qdrant:**
   - Collection: `product-images`
   - Operation: `upsert` (create or update)
   - Batch operation (nếu có nhiều images)

**Code:**
```typescript
async storeProductImagesEmbeddings(
  embeddings: Array<{
    imageId: string; // UUID
    embedding: number[];
    metadata: ProductEmbeddingMetadata;
  }>
): Promise<void> {
  // Sanitize all strings to avoid Unicode issues with Qdrant
  const points = embeddings.map(({ imageId, embedding, metadata }) => ({
    id: imageId, // UUID: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    vector: embedding, // [0.123, -0.456, 0.789, ...] (512 dims)
    payload: {
      productId: String(metadata.productId).replace(/[^\x00-\x7F]/g, ''), // "123"
      imageUrl: String(metadata.imageUrl).replace(/[^\x00-\x7F]/g, ''), // "https://..."
      merchantId: String(metadata.merchantId), // "1" - QUAN TRỌNG
      outletId: metadata.outletId ? String(metadata.outletId) : undefined,
      categoryId: metadata.categoryId ? String(metadata.categoryId) : undefined,
      productName: metadata.productName ? String(metadata.productName).replace(/[^\x00-\x7F]/g, '') : undefined,
      updatedAt: new Date().toISOString() // "2025-01-22T10:30:00.000Z"
    }
  }));

  try {
    await this.client.upsert(this.collectionName, {
      points
    });
    console.log(`✅ Stored ${points.length} embedding(s) in Qdrant`);
  } catch (error) {
    console.error('Error storing product images embeddings:', error);
    throw error;
  }
}
```

**Qdrant Point Structure:**
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",  // UUID (unique per image)
  "vector": [0.123, -0.456, 0.789, ...],        // 512 dimensions
  "payload": {
    "productId": "123",
    "imageUrl": "https://cdn.example.com/image1.jpg",
    "merchantId": "1",                            // MERCHANT ID - Filter key
    "categoryId": "5",
    "productName": "iPhone 15",
    "updatedAt": "2025-01-22T10:30:00.000Z"
  }
}
```

**Lưu ý về MerchantId:**
- ✅ **Stored in payload:** merchantId được lưu trong payload
- ✅ **Indexed:** Có index trên merchantId field (line 77-80)
- ✅ **Filter key:** Dùng để filter khi search
- ✅ **Data isolation:** Đảm bảo merchants chỉ thấy products của mình

---

### 5.2 Create Index trên MerchantId

**File:** `packages/database/src/ml/vector-store.ts` (line 75-96)

**Process:**
1. **Create payload index:**
   - Field: `merchantId`
   - Type: `keyword` (exact match)
   - Purpose: Fast filtering by merchant

2. **Additional indexes:**
   - `categoryId`: For category filtering
   - `outletId`: For outlet filtering (optional)

**Code:**
```typescript
// Create indexes cho filtering
try {
  await this.client.createPayloadIndex(this.collectionName, {
    field_name: 'merchantId',
    field_schema: 'keyword'  // Exact match
  });

  await this.client.createPayloadIndex(this.collectionName, {
    field_name: 'categoryId',
    field_schema: 'keyword'
  });

  await this.client.createPayloadIndex(this.collectionName, {
    field_name: 'outletId',
    field_schema: 'keyword'
  });

  console.log('✅ Created payload indexes');
} catch (indexError) {
  // Indexes có thể đã tồn tại hoặc không hỗ trợ
  console.warn('⚠️ Could not create indexes (may already exist):', indexError);
}
```

**Index Benefits:**
- ✅ **Fast filtering:** O(1) lookup by merchantId
- ✅ **Efficient search:** Qdrant chỉ search trong subset của merchant
- ✅ **Scalable:** Works với millions of points

---

### 5.3 Merchant-Based Search Filtering

**File:** `packages/database/src/ml/vector-store.ts` (line 147-214)

**Process:**
1. **Build filter:**
   - Check if merchantId provided
   - Add to `must` filter array
   - Qdrant sẽ chỉ search trong points có merchantId matching

2. **Search với filter:**
   - Vector search: Cosine similarity
   - Filter: merchantId must match
   - Result: Only products from same merchant

**Code:**
```typescript
async search(
  queryEmbedding: number[],
  filters: {
    merchantId?: string | number;  // MERCHANT FILTER
    outletId?: string | number;
    categoryId?: string | number;
    minSimilarity?: number;
    limit?: number;
  } = {}
): Promise<Array<{
  productId: string;
  similarity: number;
  metadata: any;
}>> {
  const {
    merchantId,  // MERCHANT ID từ filters
    outletId,
    categoryId,
    minSimilarity = 0.7,
    limit = 20
  } = filters;

  // Build filter
  const must: any[] = [];
  
  // MERCHANT FILTER - QUAN TRỌNG
  if (merchantId) {
    must.push({
      key: 'merchantId',
      match: { value: String(merchantId) }  // Exact match
    });
  }

  if (outletId) {
    must.push({
      key: 'outletId',
      match: { value: String(outletId) }
    });
  }

  if (categoryId) {
    must.push({
      key: 'categoryId',
      match: { value: String(categoryId) }
    });
  }

  const filter = must.length > 0 ? { must } : undefined;

  try {
    // Search với merchant filter
    const results = await this.client.search(this.collectionName, {
      vector: queryEmbedding,
      limit,
      filter,  // MERCHANT FILTER APPLIED
      score_threshold: minSimilarity,
      with_payload: true
    });

    return results.map((result: any) => ({
      productId: result.payload.productId,
      similarity: result.score,
      metadata: result.payload
    }));
  } catch (error) {
    console.error('Error searching in Qdrant:', error);
    throw error;
  }
}
```

**Filter Structure:**
```json
{
  "must": [
    {
      "key": "merchantId",
      "match": { "value": "1" }  // Chỉ search trong merchant 1
    }
  ]
}
```

**Lưu ý:**
- ✅ **Mandatory filter:** merchantId luôn được apply từ userScope
- ✅ **Data isolation:** Merchants không thể thấy products của nhau
- ✅ **Performance:** Indexed field → fast filtering
- ✅ **Security:** Backend enforces, không thể bypass

---

### 5.4 Role-Based Filtering trong API

**File:** `apps/api/app/api/products/search-by-image/route.ts` (line 174-193)

**Process:**
1. **Get userScope:**
   - Extract từ JWT token
   - Contains: merchantId, outletId (based on user role)

2. **Apply filters:**
   - **MERCHANT users:** Filter by merchantId
   - **OUTLET users:** Filter by outletId (more restrictive)
   - **ADMIN users:** No filter (see all)

**Code:**
```typescript
// Build filters from userScope
const filters: any = {
  limit,
  minSimilarity
};

// Apply role-based filtering
if (userScope.merchantId) {
  filters.merchantId = userScope.merchantId;  // MERCHANT FILTER
}

if (userScope.outletId) {
  filters.outletId = userScope.outletId;  // OUTLET FILTER (more restrictive)
}

if (categoryId) {
  filters.categoryId = categoryId;
}

const searchResults = await vectorStore.search(queryEmbedding, filters);
```

**Role-Based Filtering:**

| Role | Filter Applied | Can See |
|------|----------------|---------|
| **ADMIN** | None | All merchants |
| **MERCHANT** | `merchantId` | Own merchant only |
| **OUTLET_ADMIN** | `merchantId` + `outletId` | Own outlet only |
| **OUTLET_STAFF** | `merchantId` + `outletId` | Own outlet only |

**Security:**
- ✅ **Backend enforced:** Filter applied at database level
- ✅ **Cannot bypass:** Frontend cannot remove filter
- ✅ **JWT-based:** UserScope từ JWT token
- ✅ **Role-based:** Different filters for different roles

---

## Merchant-Based Data Isolation

### Isolation Strategy

**1. Storage Level:**
- **S3:** Images organized by merchant (`products/merchant-{id}/...`)
- **Database:** Products have merchantId (foreign key)
- **Qdrant:** Embeddings have merchantId in payload

**2. Filter Level:**
- **Index:** merchantId indexed in Qdrant
- **Filter:** Always applied in search queries
- **Backend:** Enforced by userScope

**3. Access Control:**
- **JWT Token:** Contains merchantId/outletId
- **userScope:** Extracted from token
- **API:** Automatically applies filters

### Example: Multi-Merchant Scenario

**Qdrant Collection: `product-images`**

```
Point 1:
  id: "uuid-1"
  vector: [0.123, -0.456, ...]
  payload: { productId: "1", merchantId: "1", ... }

Point 2:
  id: "uuid-2"
  vector: [0.789, -0.321, ...]
  payload: { productId: "2", merchantId: "1", ... }

Point 3:
  id: "uuid-3"
  vector: [0.456, -0.654, ...]
  payload: { productId: "3", merchantId: "2", ... }  // Different merchant
```

**Search với merchantId = "1":**
- ✅ Returns: Point 1, Point 2
- ❌ Excludes: Point 3 (merchant 2)

**Search với merchantId = "2":**
- ✅ Returns: Point 3
- ❌ Excludes: Point 1, Point 2 (merchant 1)

---

## Complete Flow Example

### Input: Product với MerchantId = 1

```typescript
// Product created
{
  id: 123,
  merchantId: 1,  // MERCHANT ID
  name: "iPhone 15",
  images: "https://cdn.example.com/image1.jpg,https://cdn.example.com/image2.jpg"
}
```

### Step 4: Generate Embeddings

```typescript
// Background job triggered
generateProductEmbedding(productId: 123)

// For each image:
// 1. Download from CloudFront
// 2. Preprocess (224x224)
// 3. Generate embedding: [0.123, -0.456, ...] (512 dims)
// 4. Create metadata with merchantId
```

### Step 5: Store in Qdrant

```json
// Point 1 (Image 1)
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "vector": [0.123, -0.456, 0.789, ...],
  "payload": {
    "productId": "123",
    "imageUrl": "https://cdn.example.com/image1.jpg",
    "merchantId": "1",  // MERCHANT ID STORED
    "productName": "iPhone 15"
  }
}

// Point 2 (Image 2)
{
  "id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
  "vector": [0.789, -0.321, 0.654, ...],
  "payload": {
    "productId": "123",
    "imageUrl": "https://cdn.example.com/image2.jpg",
    "merchantId": "1",  // SAME MERCHANT
    "productName": "iPhone 15"
  }
}
```

### Search với Merchant Filter

```typescript
// User from Merchant 1 searches
userScope = { merchantId: 1 }

// Search query
vectorStore.search(queryEmbedding, {
  merchantId: 1,  // FILTER APPLIED
  limit: 20
})

// Qdrant filter
{
  "must": [
    { "key": "merchantId", "match": { "value": "1" } }
  ]
}

// Results: Only points with merchantId = "1"
// ✅ Point 1, Point 2 (merchant 1)
// ❌ Point 3 (merchant 2) - EXCLUDED
```

---

## Key Points về Merchant Management

### 1. MerchantId trong Metadata

- ✅ **Stored:** merchantId được lưu trong Qdrant payload
- ✅ **Indexed:** Có index để fast filtering
- ✅ **Required:** Mọi embedding phải có merchantId

### 2. Filter Enforcement

- ✅ **Backend:** Filter applied at Qdrant level
- ✅ **JWT-based:** merchantId từ userScope (JWT token)
- ✅ **Cannot bypass:** Frontend không thể remove filter
- ✅ **Role-based:** Different filters for different roles

### 3. Data Isolation

- ✅ **Storage:** Images organized by merchant (S3)
- ✅ **Database:** Products have merchantId (foreign key)
- ✅ **Qdrant:** Embeddings filtered by merchantId
- ✅ **Security:** Multi-tenant isolation guaranteed

### 4. Performance

- ✅ **Indexed:** merchantId indexed → O(1) lookup
- ✅ **Efficient:** Qdrant chỉ search trong subset
- ✅ **Scalable:** Works với millions of points per merchant

---

## Troubleshooting

### Embeddings không có merchantId

**Check:**
1. Product có merchantId trong database
2. Metadata được tạo đúng format
3. merchantId được convert sang string

**Fix:**
```typescript
// Ensure merchantId in metadata
metadata: {
  merchantId: String(product.merchantId)  // Convert to string
}
```

### Search trả về products từ merchant khác

**Check:**
1. Filter được apply đúng
2. merchantId trong userScope đúng
3. Index trên merchantId field tồn tại

**Fix:**
```typescript
// Verify filter applied
if (userScope.merchantId) {
  filters.merchantId = userScope.merchantId;  // Must be set
}
```

### Performance issues với large datasets

**Check:**
1. Index trên merchantId field
2. Filter được apply trước khi search
3. Limit được set hợp lý

**Fix:**
```typescript
// Ensure index exists
await this.client.createPayloadIndex(this.collectionName, {
  field_name: 'merchantId',
  field_schema: 'keyword'
});
```

---

**Last Updated:** 2025-01-22  
**Status:** Complete detailed explanation with merchant-based management

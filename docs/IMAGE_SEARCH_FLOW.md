# Image Search Flow - Complete Documentation

## 📋 Overview

This document describes the complete flow of the image search feature, from user interaction to displaying results.

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND LAYER                                 │
└─────────────────────────────────────────────────────────────────────────┘

1. User Interaction
   └─> ImageSearchFloatingButton (packages/ui/src/components/features/Products/components/ImageSearchFloatingButton.tsx)
       └─> Opens ImageSearchDialog

2. Image Selection
   └─> ImageSearchDialog (packages/ui/src/components/features/Products/components/ImageSearchDialog.tsx)
       ├─> User uploads/selects image file
       ├─> File validation (type, size)
       └─> Preview image shown

3. Search Trigger
   └─> User clicks "Search" button
       └─> Calls searchProductsByImage() function

4. API Call
   └─> searchProductsByImage() (packages/utils/src/api/products.ts)
       ├─> Creates FormData with:
       │   ├─> image: File
       │   ├─> limit: number (default: 20)
       │   ├─> minSimilarity: number (default: 0.7)
       │   └─> categoryId: number (optional)
       └─> POST /api/products/searchByImage

┌─────────────────────────────────────────────────────────────────────────┐
│                           API LAYER                                      │
└─────────────────────────────────────────────────────────────────────────┘

5. API Route Handler
   └─> POST /api/products/searchByImage (apps/api/app/api/products/searchByImage/route.ts)
       ├─> Authentication: withPermissions(['products.view'])
       ├─> Parse FormData
       ├─> Validate image file:
       │   ├─> File type (jpg, jpeg, png, webp)
       │   ├─> File size (max 5MB)
       │   └─> File not corrupted
       └─> Validate parameters:
           ├─> limit: 1-100
           └─> minSimilarity: 0-1

6. Image Processing
   └─> Step 1: Upload to S3 (temp folder)
       ├─> Compress image to 1MB
       ├─> Generate unique filename
       ├─> Upload to: temp/search/{folder}/{filename}
       └─> Get image URL

7. Generate Embedding
   └─> Step 2: Generate embedding vector
       ├─> Lazy load: getEmbeddingService() from @rentalshop/database/server
       ├─> FashionImageEmbedding.generateEmbedding(imageUrl)
       │   ├─> Download image from S3 URL
       │   ├─> Preprocess (resize to 224x224, normalize)
       │   ├─> Load CLIP model (Xenova/clip-vit-base-patch32)
       │   ├─> Generate 512-dimensional embedding vector
       │   └─> Normalize vector (for cosine similarity)
       └─> Returns: number[] (512 dimensions)

8. Vector Search
   └─> Step 3: Search in Qdrant
       ├─> Lazy load: getVectorStore() from @rentalshop/database/server
       ├─> ProductVectorStore.search(queryEmbedding, filters)
       │   ├─> Build filters from userScope:
       │   │   ├─> merchantId (if user is merchant/outlet user)
       │   │   ├─> outletId (if user is outlet user)
       │   │   └─> categoryId (if provided)
       │   ├─> QdrantClient.search():
       │   │   ├─> Collection: product-images-dev (dev) or product-images-pro (prod)
       │   │   ├─> Vector: queryEmbedding (512 dimensions)
       │   │   ├─> Filter: merchantId, outletId, categoryId
       │   │   ├─> Limit: limit * 3 (get more results to filter)
       │   │   └─> Distance: Cosine similarity
       │   ├─> Filter by minSimilarity threshold
       │   └─> Return top N results with similarity scores
       └─> Returns: Array<{ productId, similarity, metadata }>

9. Fetch Product Details
   └─> Step 4: Get product details from database
       ├─> Extract productIds from search results
       ├─> Fetch products in parallel: db.products.findById(id)
       ├─> Combine with similarity scores
       └─> Sort by similarity (highest first)

10. Return Results
    └─> Step 5: Return response
        ├─> ResponseBuilder.success('PRODUCTS_FOUND', {
        │   ├─> products: Product[] (with similarity scores)
        │   ├─> total: number
        │   └─> queryImage: string (S3 URL)
        └─> HTTP 200

┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND LAYER (Response)                      │
└─────────────────────────────────────────────────────────────────────────┘

11. Display Results
    └─> ImageSearchDialog receives response
        ├─> Update searchResults state
        ├─> Show products in grid layout
        ├─> Display similarity badges
        └─> Call onSearchResult(products) callback

12. Update Products Page
    └─> ProductsPage.handleImageSearchResult()
        ├─> Set imageSearchResults state
        ├─> Clear text search filters
        └─> Products component displays image search results

```

## 📁 Key Files & Components

### Frontend Components

1. **ImageSearchFloatingButton** (`packages/ui/src/components/features/Products/components/ImageSearchFloatingButton.tsx`)
   - Floating action button with AI icon
   - Opens ImageSearchDialog

2. **ImageSearchDialog** (`packages/ui/src/components/features/Products/components/ImageSearchDialog.tsx`)
   - File upload/selection UI
   - Drag & drop support
   - Preview image
   - Search button
   - Results display

3. **ProductsPage** (`apps/client/app/products/page.tsx`)
   - Main products page
   - Handles image search results
   - Updates product list with search results

### API Client

4. **searchProductsByImage** (`packages/utils/src/api/products.ts`)
   - Creates FormData from File
   - Calls POST /api/products/searchByImage
   - Returns typed response

### API Route

5. **POST /api/products/searchByImage** (`apps/api/app/api/products/searchByImage/route.ts`)
   - Validates image file
   - Uploads to S3
   - Generates embedding
   - Searches Qdrant
   - Returns products

### Services

6. **FashionImageEmbedding** (`packages/database/src/ml/image-embeddings.ts`)
   - Generates 512-dimensional embeddings
   - Uses CLIP model (Xenova/clip-vit-base-patch32)
   - Normalizes vectors

7. **ProductVectorStore** (`packages/database/src/ml/vector-store.ts`)
   - Manages Qdrant connection
   - Searches similar products
   - Filters by merchantId, outletId, categoryId
   - Returns similarity scores

## 🔍 Detailed Step-by-Step Flow

### Step 1: User Uploads Image

```typescript
// ImageSearchDialog.tsx
const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  // Validate file type and size
  setSelectedFile(file);
  setPreviewUrl(URL.createObjectURL(file));
};
```

### Step 2: User Clicks Search

```typescript
// ImageSearchDialog.tsx
const handleSearch = async () => {
  const response = await searchProductsByImage(selectedFile, {
    limit: 20,
    minSimilarity: 0.7,
    categoryId,
  });
  // Handle response...
};
```

### Step 3: API Client Creates Request

```typescript
// packages/utils/src/api/products.ts
export async function searchProductsByImage(imageFile: File, options) {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('limit', options.limit.toString());
  formData.append('minSimilarity', options.minSimilarity.toString());
  if (options.categoryId) {
    formData.append('categoryId', options.categoryId.toString());
  }
  return productsApi.searchByImage(formData);
}
```

### Step 4: API Route Validates & Processes

```typescript
// apps/api/app/api/products/searchByImage/route.ts
export const POST = withPermissions(['products.view'])(
  async (request, { user, userScope }) => {
    // 1. Parse FormData
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    // 2. Validate image
    validateImage(file);
    
    // 3. Upload to S3
    const buffer = await compressImageTo1MB(Buffer.from(bytes));
    const uploadResult = await uploadToS3(buffer, {
      folder: `temp/search/${folder}`,
      fileName: finalFileName,
    });
    
    // 4. Generate embedding
    const embeddingService = getEmbeddingService();
    const queryEmbedding = await embeddingService.generateEmbedding(imageUrl);
    
    // 5. Search Qdrant
    const vectorStore = getVectorStore();
    const searchResults = await vectorStore.search(queryEmbedding, {
      merchantId: userScope.merchantId,
      outletId: userScope.outletId,
      categoryId,
      limit,
      minSimilarity,
    });
    
    // 6. Fetch product details
    const products = await Promise.all(
      searchResults.map(r => db.products.findById(parseInt(r.productId)))
    );
    
    // 7. Return results
    return NextResponse.json(
      ResponseBuilder.success('PRODUCTS_FOUND', {
        products: productsWithSimilarity,
        total: productsWithSimilarity.length,
        queryImage: imageUrl,
      })
    );
  }
);
```

### Step 5: Embedding Generation

```typescript
// packages/database/src/ml/image-embeddings.ts
async generateEmbedding(imageUrl: string): Promise<number[]> {
  // 1. Download image from S3
  const response = await fetch(imageUrl);
  const buffer = await response.arrayBuffer();
  
  // 2. Preprocess image
  const { buffer: processedBuffer, width, height } = 
    await this.preprocessImage(Buffer.from(buffer));
  
  // 3. Load model (lazy)
  const model = await this.getModel();
  
  // 4. Generate embedding
  const rawImage = new RawImage(uint8Array, width, height, 3);
  const output = await model(rawImage);
  
  // 5. Extract and normalize vector
  const embedding = Array.from(output.data);
  return this.normalizeVector(embedding); // 512 dimensions
}
```

### Step 6: Vector Search

```typescript
// packages/database/src/ml/vector-store.ts
async search(queryEmbedding: number[], filters) {
  // 1. Build Qdrant filter
  const must = [];
  if (filters.merchantId) {
    must.push({ key: 'merchantId', match: { value: String(filters.merchantId) } });
  }
  if (filters.outletId) {
    must.push({ key: 'outletId', match: { value: String(filters.outletId) } });
  }
  if (filters.categoryId) {
    must.push({ key: 'categoryId', match: { value: String(filters.categoryId) } });
  }
  
  // 2. Search Qdrant
  const results = await this.client.search(this.collectionName, {
    vector: queryEmbedding,
    limit: filters.limit * 3, // Get more to filter
    filter: must.length > 0 ? { must } : undefined,
    with_payload: true,
  });
  
  // 3. Filter by similarity threshold
  const filteredResults = results
    .filter(r => r.score >= filters.minSimilarity)
    .slice(0, filters.limit)
    .map(r => ({
      productId: r.payload.productId,
      similarity: r.score,
      metadata: r.payload,
    }));
  
  return filteredResults;
}
```

### Step 7: Display Results

```typescript
// ImageSearchDialog.tsx
if (response.success && response.data) {
  const products = response.data.products || [];
  setSearchResults(products);
  setQueryImageUrl(response.data.queryImage);
  
  // Call callback to update products page
  onSearchResult(products);
}
```

## 🔐 Security & Authorization

### Role-Based Access Control

- **Permission Required**: `products.view`
- **Role-Based Filtering**:
  - `ADMIN`: No restrictions (can see all products)
  - `MERCHANT`: Filtered by `merchantId`
  - `OUTLET_ADMIN` / `OUTLET_STAFF`: Filtered by `outletId`

### Data Isolation

- Qdrant filters automatically apply based on user role
- Users can only see products within their scope
- Filters are applied at the database level (secure)

## 📊 Performance Considerations

### Optimization Strategies

1. **Lazy Loading**: Embedding service and vector store are lazy-loaded to avoid build-time issues
2. **Image Compression**: Images are compressed to 1MB before processing
3. **Batch Fetching**: Product details are fetched in parallel
4. **Similarity Filtering**: Get more results from Qdrant, filter by threshold in code
5. **Caching**: Model is cached after first load

### Performance Metrics

- **Image Upload**: ~1-2 seconds
- **Embedding Generation**: ~2-5 seconds (first time: ~10-15s for model download)
- **Qdrant Search**: ~100-500ms
- **Product Fetching**: ~200-500ms
- **Total**: ~3-8 seconds (first time: ~12-20s)

## 🐛 Error Handling

### Common Errors

1. **NO_IMAGE_FILE**: No image provided
2. **IMAGE_VALIDATION_FAILED**: Invalid file type or size
3. **IMAGE_UPLOAD_FAILED**: S3 upload failed
4. **INVALID_LIMIT**: Limit out of range (1-100)
5. **INVALID_MIN_SIMILARITY**: Similarity out of range (0-1)
6. **NO_PRODUCTS_FOUND**: No products match the search

### Error Flow

```typescript
try {
  // Process search...
} catch (error) {
  console.error('Error in image search:', error);
  const { response, statusCode } = handleApiError(error);
  return NextResponse.json(response, { status: statusCode });
}
```

## 🔧 Configuration

### Environment Variables

```bash
# Qdrant Configuration
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your-api-key

# Image Search Configuration
IMAGE_SEARCH_MODEL=Xenova/clip-vit-base-patch32
IMAGE_SEARCH_MIN_SIMILARITY=0.5

# S3 Configuration (for image upload)
AWS_S3_BUCKET=your-bucket
AWS_S3_REGION=us-east-1
```

### Collection Names

- **Development**: `product-images-dev`
- **Production**: `product-images-pro`

## 📝 Testing

### Manual Testing

1. **Test Script**: `scripts/test-image-search.ts`
   ```bash
   yarn test:image-search
   ```

2. **Qdrant Search Test**: `scripts/test-qdrant-search.ts`
   ```bash
   yarn test:qdrant-search
   ```

### Test Flow

1. Login to get auth token
2. Upload test image
3. Call searchByImage API
4. Verify results
5. Check similarity scores

## 🎯 Key Points

1. **Security**: All filtering happens at the backend/database level
2. **Performance**: Lazy loading, compression, and parallel fetching
3. **User Experience**: Real-time preview, loading indicators, error messages
4. **Scalability**: Qdrant handles millions of vectors efficiently
5. **Accuracy**: CLIP model provides high-quality similarity matching

## 🔄 Related Flows

- **Product Creation Flow**: Generates embeddings when products are created
- **Product Update Flow**: Updates embeddings when product images change
- **Product Deletion Flow**: Removes embeddings when products are deleted

See also:
- `docs/IMAGE_SEARCH_IMPLEMENTATION.md`
- `docs/IMAGE_SEARCH_SETUP_AND_TEST.md`
- `docs/IMAGE_UPLOAD_TO_EMBEDDING_FLOW.md`

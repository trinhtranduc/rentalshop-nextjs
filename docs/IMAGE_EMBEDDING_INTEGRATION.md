# 🎯 Hướng Dẫn Tích Hợp Image Embedding vào Product Creation Flow

## 📋 Tổng Quan

Khi tạo hoặc cập nhật sản phẩm, system sẽ tự động:
1. ✅ Upload images lên S3
2. ✅ Generate embeddings cho **TẤT CẢ images** (không chỉ image đầu tiên)
3. ✅ Lưu embeddings vào Qdrant với UUID riêng cho mỗi image
4. ✅ Enable image search ngay sau khi tạo sản phẩm

## 🔄 Flow Tích Hợp

### **1. POST /api/products - Tạo Sản Phẩm Mới**

**Location:** `apps/api/app/api/products/route.ts`

**Flow:**
```
1. Upload images → S3 staging
2. Commit images → S3 production
3. Create product trong database
4. Generate embeddings (background job) ← TỰ ĐỘNG
   └─ Generate embedding cho TẤT CẢ images
   └─ Mỗi image có UUID riêng trong Qdrant
```

**Code hiện tại (đã tích hợp):**
```typescript
// Line 507-519
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

**✅ Đã hoàn thành:** Code đã tích hợp sẵn, tự động generate embeddings cho tất cả images.

---

### **2. PUT /api/products/[id] - Cập Nhật Sản Phẩm**

**Location:** `apps/api/app/api/products/[id]/route.ts`

**Flow:**
```
1. Update product trong database
2. Nếu images thay đổi:
   └─ Xóa old embeddings (background)
   └─ Generate new embeddings (background)
```

**Code hiện tại (đã tích hợp):**
```typescript
// Line 568-590
// Regenerate embeddings for image search if images were updated (background job)
// Delete old embeddings first, then generate new ones
if (imageFiles.length > 0 || productUpdateData.images !== undefined) {
  try {
    const { generateProductEmbedding, getVectorStore } = await import('@rentalshop/database/server');
    
    // Delete old embeddings first (run in background)
    const vectorStore = getVectorStore();
    vectorStore.deleteProductEmbeddings(productId).catch((error: any) => {
      console.error(`Error deleting old embeddings for product ${productId}:`, error);
    });
    
    // Generate new embeddings (run in background, don't block response)
    generateProductEmbedding(productId).catch((error) => {
      console.error(`Error generating embedding for product ${productId}:`, error);
    });
  } catch (error) {
    console.error('Error starting embedding regeneration:', error);
    // Don't fail the request if embedding generation fails
  }
}
```

**✅ Đã hoàn thành:** Code đã tích hợp sẵn, tự động regenerate embeddings khi images thay đổi.

---

### **3. DELETE /api/products/[id] - Xóa Sản Phẩm**

**Location:** `apps/api/app/api/products/[id]/route.ts`

**Flow:**
```
1. Delete images từ S3
2. Xóa embeddings từ Qdrant (background)
3. Soft delete product (isActive = false)
```

**Code hiện tại (đã tích hợp):**
```typescript
// Line 765-774
// Delete embeddings from Qdrant (background job)
try {
  const { getVectorStore } = await import('@rentalshop/database/server');
  const vectorStore = getVectorStore();
  vectorStore.deleteProductEmbeddings(productId).catch((error: any) => {
    console.error(`Error deleting embeddings for product ${productId}:`, error);
  });
} catch (error) {
  console.error('Error starting embedding deletion:', error);
  // Don't fail the request if embedding deletion fails
}
```

**✅ Đã hoàn thành:** Code đã tích hợp sẵn, tự động xóa embeddings khi product bị xóa.

---

## 🔧 Core Functions

### **1. generateProductEmbedding(productId: number)**

**Location:** `packages/database/src/jobs/generate-product-embeddings.ts`

**Chức năng:**
- Generate embeddings cho **TẤT CẢ images** của product
- Mỗi image có UUID riêng trong Qdrant
- Tự động parse images từ nhiều formats (JSON array, comma-separated, etc.)

**Usage:**
```typescript
import { generateProductEmbedding } from '@rentalshop/database/server';

// Generate embeddings cho product (background job)
generateProductEmbedding(productId).catch((error) => {
  console.error('Error:', error);
});
```

---

### **2. storeProductImagesEmbeddings(embeddings)**

**Location:** `packages/database/src/ml/vector-store.ts`

**Chức năng:**
- Store nhiều images embeddings cùng lúc
- Mỗi image có UUID riêng
- Tự động sanitize Unicode trong metadata

**Usage:**
```typescript
import { getVectorStore } from '@rentalshop/database/server';

const vectorStore = getVectorStore();
await vectorStore.storeProductImagesEmbeddings([
  {
    imageId: randomUUID(),
    embedding: [0.1, 0.2, ...], // 512 dimensions
    metadata: {
      productId: "123",
      imageUrl: "https://...",
      merchantId: "1",
      productName: "Product Name"
    }
  }
]);
```

---

### **3. deleteProductEmbeddings(productId)**

**Location:** `packages/database/src/ml/vector-store.ts`

**Chức năng:**
- Xóa TẤT CẢ embeddings của một product
- Dùng filter theo `productId` trong payload
- Hỗ trợ products có nhiều images

**Usage:**
```typescript
import { getVectorStore } from '@rentalshop/database/server';

const vectorStore = getVectorStore();
await vectorStore.deleteProductEmbeddings(productId);
```

---

## 📊 Data Flow

### **Product Creation Flow:**

```
┌─────────────────┐
│  POST /products │
└────────┬─────────┘
         │
         ▼
┌─────────────────────┐
│ Upload Images → S3 │
└────────┬────────────┘
         │
         ▼
┌──────────────────────┐
│ Commit Images → S3   │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Create Product (DB)  │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Generate Embeddings          │
│ (Background Job)             │
│ └─ For EACH image:           │
│    ├─ Generate embedding     │
│    ├─ Create UUID            │
│    └─ Store in Qdrant        │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────┐
│ Return Product       │
│ (with images)        │
└──────────────────────┘
```

### **Product Update Flow:**

```
┌──────────────────┐
│ PUT /products/id │
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│ Update Product (DB)   │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Images Changed?               │
└────────┬─────────────────────┘
         │ YES
         ▼
┌──────────────────────────────┐
│ Delete Old Embeddings         │
│ (Background Job)             │
│ └─ Filter by productId        │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ Generate New Embeddings      │
│ (Background Job)             │
│ └─ For EACH new image:       │
│    ├─ Generate embedding     │
│    ├─ Create UUID            │
│    └─ Store in Qdrant        │
└──────────────────────────────┘
```

---

## 🎯 Key Features

### **✅ Multiple Images Support**
- Mỗi product có thể có nhiều images
- Mỗi image có embedding riêng với UUID riêng
- Tất cả images đều searchable

### **✅ Background Processing**
- Embedding generation không block API response
- Chạy async trong background
- Errors không làm fail product creation

### **✅ Automatic Cleanup**
- Tự động xóa old embeddings khi update
- Tự động xóa embeddings khi delete product
- Tránh orphaned data trong Qdrant

### **✅ Unicode Safety**
- Tự động sanitize Unicode trong metadata
- Tất cả strings được normalize trước khi lưu Qdrant
- Tránh lỗi "Unsupported input type"

---

## 🔍 Testing

### **Test Product Creation với Images:**

```bash
# 1. Tạo product với images qua API
curl -X POST http://localhost:3002/api/products \
  -H "Authorization: Bearer <token>" \
  -F "data={\"name\":\"Test Product\",\"images\":[]}" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg"

# 2. Check embeddings đã được tạo
# (Sẽ tự động generate trong background)
```

### **Test Image Search:**

```bash
# Search với hình ảnh
curl -X POST http://localhost:3002/api/products/search-by-image \
  -H "Authorization: Bearer <token>" \
  -F "image=@test-image.jpg" \
  -F "limit=10" \
  -F "minSimilarity=0.7"
```

### **Test Local (không cần API server):**

```bash
# Test với script local
yarn test:image-search-local "path/to/image.jpg"
```

---

## 📝 Checklist Tích Hợp

### **✅ Đã Hoàn Thành:**

- [x] **POST /api/products** - Tự động generate embeddings khi tạo product
- [x] **PUT /api/products/[id]** - Tự động regenerate embeddings khi update images
- [x] **DELETE /api/products/[id]** - Tự động xóa embeddings khi delete product
- [x] **generateProductEmbedding** - Support multiple images với UUID
- [x] **storeProductImagesEmbeddings** - Store nhiều images cùng lúc
- [x] **deleteProductEmbeddings** - Xóa tất cả embeddings của product
- [x] **Unicode sanitization** - Tự động sanitize metadata
- [x] **Background processing** - Không block API response

### **🔧 Cần Kiểm Tra:**

- [ ] Test với products có nhiều images (3+ images)
- [ ] Test với products không có images
- [ ] Test với images có Unicode characters
- [ ] Test performance với batch products
- [ ] Monitor Qdrant storage usage

---

## 🚀 Next Steps

1. **Monitor & Optimize:**
   - Monitor embedding generation time
   - Check Qdrant storage usage
   - Optimize batch processing nếu cần

2. **Error Handling:**
   - Add retry logic cho failed embeddings
   - Add monitoring/alerting cho embedding failures
   - Add admin dashboard để regenerate embeddings

3. **Performance:**
   - Consider caching embeddings
   - Optimize batch size cho large products
   - Add rate limiting nếu cần

---

## 📚 Related Documentation

- [Image Search Implementation](./IMAGE_SEARCH_IMPLEMENTATION.md)
- [Image Search Model Comparison](./IMAGE_SEARCH_MODEL_COMPARISON.md)
- [Test with Local Images](./TEST_WITH_LOCAL_IMAGES.md)

---

## ✅ Summary

**Tất cả đã được tích hợp tự động!**

Khi bạn:
- ✅ **Tạo product** → Embeddings tự động generate
- ✅ **Update product images** → Old embeddings xóa, new embeddings generate
- ✅ **Delete product** → Embeddings tự động xóa

**Không cần làm gì thêm** - system đã tự động xử lý tất cả! 🎉

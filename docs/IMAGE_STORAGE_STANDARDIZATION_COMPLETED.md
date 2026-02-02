# ✅ Image Storage Standardization - Completed

## 📋 **Summary**

Đã chuẩn hóa cách lưu product images vào database: **Luôn lưu dưới dạng JSON array** `["url1", "url2"]` thay vì comma-separated string hoặc JSON stringified.

---

## ✅ **Changes Made**

### **1. apps/api/app/api/products/route.ts (POST)**

**Before:**
```typescript
// ❌ Lưu comma-separated string
const imagesValue = committedImageUrls.length > 0 
  ? committedImageUrls.join(',')  // "url1,url2"
  : '';
images: imagesValue,
```

**After:**
```typescript
// ✅ Lưu array, Prisma sẽ tự động serialize thành JSON
const imagesValue = committedImageUrls.length > 0 
  ? committedImageUrls  // ["url1", "url2"]
  : [];  // Empty array
images: imagesValue,
```

**Impact:** Tất cả products mới được tạo sẽ có images dưới dạng array.

---

### **2. apps/api/app/api/merchants/[id]/products/route.ts (POST)**

**Before:**
```typescript
// ❌ Lưu JSON stringified
images: JSON.stringify(Array.isArray(images) ? images : images ? [images] : []),
// "[\"url1\",\"url2\"]"
```

**After:**
```typescript
// ✅ Lưu array trực tiếp
images: Array.isArray(images) ? images : images ? [images] : [],
// ["url1", "url2"]
```

**Impact:** Products tạo qua merchant endpoint sẽ có format chuẩn.

---

### **3. apps/api/app/api/merchants/[id]/products/[productId]/route.ts (PUT)**

**Before:**
```typescript
// ❌ Lưu JSON stringified
images: JSON.stringify(Array.isArray(images) ? images : images ? [images] : []),
```

**After:**
```typescript
// ✅ Lưu array trực tiếp
images: Array.isArray(images) ? images : images ? [images] : [],
```

**Impact:** Products update qua merchant endpoint sẽ có format chuẩn.

---

### **4. apps/api/app/api/products/[id]/route.ts (PUT)**

**Status:** ✅ **Already correct**

Code đã normalize images thành array trước khi lưu:
```typescript
// Line 412: Already normalizes to array
if (productUpdateData.images !== undefined) {
  productUpdateData.images = normalizeImagesInput(productUpdateData.images);
}
// normalizeImagesInput() returns string[]
```

**Impact:** Products update qua main endpoint đã đúng format.

---

### **5. apps/api/app/api/admin/import-data/route.ts**

**Status:** ✅ **Already correct**

Code đã lưu array:
```typescript
// Line 494: Already stores as array
if (uploadedImageUrls.length > 0) {
  productData.images = uploadedImageUrls;  // Array
} else if (!productData.images) {
  productData.images = [];  // Empty array
}
```

**Impact:** Imported products đã đúng format.

---

## 📊 **Database Format**

### **Before Standardization:**
- ❌ Comma-separated string: `"url1,url2"`
- ❌ JSON stringified: `"[\"url1\",\"url2\"]"`
- ✅ Array (một số nơi): `["url1", "url2"]`

### **After Standardization:**
- ✅ **Always array**: `["url1", "url2"]`
- ✅ **Empty array**: `[]` (thay vì empty string `""`)

---

## 🔄 **Backward Compatibility**

Function `parseProductImages()` trong `packages/utils/src/utils/product-image-helpers.ts` vẫn hỗ trợ parse các format cũ để đảm bảo backward compatibility với legacy data:

- ✅ Array: `["url1", "url2"]` → Returns array
- ✅ JSON string: `"[\"url1\",\"url2\"]"` → Parses and returns array
- ✅ Comma-separated: `"url1,url2"` → Splits and returns array
- ✅ Quoted string: `"\"url1\""` → Parses and returns array

**Note:** Sau khi migration legacy data, có thể simplify `parseProductImages()` function.

---

## 📝 **Next Steps (Optional)**

### **Phase 1: Migration Script (Recommended)**

Tạo migration script để convert existing data từ các format cũ sang array:

```sql
-- Convert comma-separated strings to arrays
UPDATE "Product" 
SET images = CASE 
  WHEN images::text LIKE '%,%' THEN 
    jsonb_build_array(images::text)
  WHEN images::text LIKE '"%"' THEN 
    jsonb_build_array(images::text::text)
  ELSE images
END
WHERE images IS NOT NULL 
  AND images::text NOT LIKE '[%';  -- Not already an array
```

### **Phase 2: Simplify parseProductImages()**

Sau khi migration, có thể simplify function từ 90+ dòng xuống ~30 dòng vì chỉ cần handle array format.

---

## ✅ **Testing Checklist**

- [x] New products created via POST `/api/products` → Images stored as array
- [x] New products created via POST `/api/merchants/[id]/products` → Images stored as array
- [x] Products updated via PUT `/api/products/[id]` → Images stored as array
- [x] Products updated via PUT `/api/merchants/[id]/products/[productId]` → Images stored as array
- [x] Imported products → Images stored as array
- [x] API responses parse correctly with `parseProductImages()`
- [x] Backward compatibility maintained for legacy data

---

## 🎯 **Benefits**

1. ✅ **Consistent format** - Tất cả products có cùng format
2. ✅ **Type-safe** - TypeScript types match database format
3. ✅ **Better performance** - Không cần parse phức tạp
4. ✅ **Easier maintenance** - Một format duy nhất
5. ✅ **PostgreSQL JSON** - Hoạt động đúng với JSON type

---

## 📅 **Completed Date**

**2026-02-02** - Standardization completed for all product creation/update endpoints.

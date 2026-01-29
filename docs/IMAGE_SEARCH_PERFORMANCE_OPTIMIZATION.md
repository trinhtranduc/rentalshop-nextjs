# Image Search Performance Optimization

## 🐌 Performance Issues Analysis

### Current Performance Bottlenecks

1. **Image Upload Size** (Potential ~2-5 seconds)
   - ❌ No compression before sending to Python API
   - ❌ Full-size images (~2-10MB) sent directly
   - ❌ Network bandwidth waste

2. **Python API Processing** (~500-2000ms)
   - CLIP model inference (~300-800ms)
   - Qdrant vector search (~100-300ms)
   - PostgreSQL query (~100-200ms)
   - Image decompression/preprocessing (~100-500ms)

3. **Network Latency** (~200-500ms each way)
   - Railway hosting location
   - CDN not utilized for API
   - No caching strategy

4. **UI/UX Issues**
   - No loading indicators with progress
   - No cancellation support
   - Dialog blocks entire screen during search

**Total Estimated Time:** 3-8 seconds (too slow! 🐌)

---

## ⚡ Optimization Strategy

### 1. Client-Side Image Compression (Highest Impact) ✨

**Problem:** Sending 5MB images when 100KB is enough.

**Solution:** Compress images before sending to Python API.

```typescript
// packages/utils/src/api/products.ts

export async function searchProductsByImage(
  imageFile: File,
  options: {
    limit?: number;
    minSimilarity?: number;
    categoryId?: number;
  } = {}
): Promise<ApiResponse<{
  products: Array<Product & { similarity: number; _debug?: any }>;
  total: number;
  queryImage: string;
}>> {
  // ✨ NEW: Compress image before sending
  console.time('⏱️ Image compression');
  const compressedFile = await compressImage(imageFile, {
    maxSizeMB: 0.1,          // 100KB max (enough for CLIP)
    maxWidthOrHeight: 512,   // CLIP uses 224x224, so 512 is safe
    useWebWorker: true,      // Don't block UI
    quality: 0.8            // Good quality
  });
  console.timeEnd('⏱️ Image compression');
  
  console.log(`📊 Compression: ${(imageFile.size/1024).toFixed(1)}KB → ${(compressedFile.size/1024).toFixed(1)}KB (${Math.round((1-compressedFile.size/imageFile.size)*100)}% reduction)`);

  const formData = new FormData();
  formData.append('image', compressedFile); // Use compressed image
  
  if (options.limit) {
    formData.append('limit', options.limit.toString());
  }
  
  if (options.minSimilarity) {
    formData.append('minSimilarity', options.minSimilarity.toString());
  }
  
  if (options.categoryId) {
    formData.append('categoryId', options.categoryId.toString());
  }

  return productsApi.searchByImage(formData);
}
```

**Expected Improvement:** 
- **Before:** 5MB upload = ~2-5 seconds
- **After:** 100KB upload = ~200-500ms
- **Savings:** ~2-4 seconds ⚡

---

### 2. Progressive Loading & Better UX

#### A. Show Progress Indicators

```typescript
// ImageSearchDialog.tsx

const [searchProgress, setSearchProgress] = useState<{
  stage: 'compressing' | 'uploading' | 'searching' | 'loading';
  percentage: number;
}>({ stage: 'compressing', percentage: 0 });

const handleSearch = async () => {
  setIsSearching(true);
  setSearchProgress({ stage: 'compressing', percentage: 0 });
  
  try {
    // Stage 1: Compression (0-30%)
    setSearchProgress({ stage: 'compressing', percentage: 0 });
    const compressed = await compressImage(selectedFile, {
      onProgress: (p) => setSearchProgress({ 
        stage: 'compressing', 
        percentage: Math.round(p * 0.3) 
      })
    });
    
    // Stage 2: Uploading (30-60%)
    setSearchProgress({ stage: 'uploading', percentage: 30 });
    
    // Stage 3: Searching (60-90%)
    setSearchProgress({ stage: 'searching', percentage: 60 });
    const response = await searchProductsByImage(compressed, options);
    
    // Stage 4: Loading results (90-100%)
    setSearchProgress({ stage: 'loading', percentage: 90 });
    
    setSearchResults(response.data.products);
    setSearchProgress({ stage: 'loading', percentage: 100 });
  } catch (error) {
    // Handle error
  } finally {
    setIsSearching(false);
  }
};
```

#### B. Loading States UI

```tsx
{isSearching && (
  <div className="space-y-3">
    <div className="flex items-center gap-3">
      <Loader2 className="w-5 h-5 animate-spin" />
      <div className="flex-1">
        <div className="text-sm font-medium mb-1">
          {searchProgress.stage === 'compressing' && 'Compressing image...'}
          {searchProgress.stage === 'uploading' && 'Uploading...'}
          {searchProgress.stage === 'searching' && 'Searching similar products...'}
          {searchProgress.stage === 'loading' && 'Loading results...'}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${searchProgress.percentage}%` }}
          />
        </div>
      </div>
    </div>
    <p className="text-xs text-text-tertiary">
      This may take a few seconds...
    </p>
  </div>
)}
```

---

### 3. Python API Optimizations

#### A. Model Warm-up & Caching

```python
# python-embedding-service/app/models.py

class EmbeddingModel:
    def __init__(self):
        self.model = None
        self.processor = None
        self.model_loaded = False
        self._embedding_cache = {}  # Cache recent embeddings
        self._cache_size = 100      # Keep last 100 embeddings
    
    async def generate_embedding(self, image_bytes: bytes) -> list:
        # Cache by image hash
        image_hash = hashlib.md5(image_bytes).hexdigest()
        
        if image_hash in self._embedding_cache:
            print(f"✅ Cache hit for image {image_hash[:8]}")
            return self._embedding_cache[image_hash]
        
        # Generate embedding
        embedding = await self._generate(image_bytes)
        
        # Cache result
        self._embedding_cache[image_hash] = embedding
        
        # Limit cache size
        if len(self._embedding_cache) > self._cache_size:
            # Remove oldest entry
            oldest = next(iter(self._embedding_cache))
            del self._embedding_cache[oldest]
        
        return embedding
```

#### B. Batch Database Queries

```python
# python-embedding-service/app/search_service.py

async def search_products(self, embedding, filters, limit, min_similarity):
    # Qdrant search
    search_results = self.qdrant_client.search(...)
    
    product_ids = [r.payload["productId"] for r in search_results]
    
    # ✅ OPTIMIZED: Single batch query instead of N queries
    query = """
        SELECT 
            p.id, p.name, p.description, p."rentPrice",
            p.images, p."totalStock", p.renting, p.available,
            c.id as "categoryId", c.name as "categoryName",
            m.id as "merchantId", m.name as "merchantName",
            json_agg(
                json_build_object(
                    'outletId', os."outletId",
                    'stock', os.stock,
                    'outlet', json_build_object('name', o.name)
                )
            ) as "outletStock"
        FROM "Product" p
        LEFT JOIN "Category" c ON p."categoryId" = c.id
        LEFT JOIN "Merchant" m ON p."merchantId" = m.id
        LEFT JOIN "OutletStock" os ON p.id = os."productId"
        LEFT JOIN "Outlet" o ON os."outletId" = o.id
        WHERE p.id = ANY($1::text[])
        GROUP BY p.id, c.id, m.id
        ORDER BY array_position($1::text[], p.id::text)
    """
    
    # Single query with all JOINs
    products = await self.db_pool.fetch(query, product_ids)
```

**Expected Improvement:** ~100-200ms saved

---

### 4. Response Caching Strategy

#### A. Cache Search Results

```typescript
// packages/hooks/src/hooks/useImageSearch.ts

import { useState, useCallback, useRef } from 'react';
import { searchProductsByImage } from '@rentalshop/utils';

interface CacheEntry {
  imageHash: string;
  results: any;
  timestamp: number;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useImageSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  const search = useCallback(async (imageFile: File, options: any) => {
    // Generate image hash
    const arrayBuffer = await imageFile.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const imageHash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Check cache
    const cached = cacheRef.current.get(imageHash);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('✅ Using cached search results');
      setResults(cached.results);
      return cached.results;
    }

    // Perform search
    setIsSearching(true);
    try {
      const response = await searchProductsByImage(imageFile, options);
      const products = response.data?.products || [];
      
      // Cache results
      cacheRef.current.set(imageHash, {
        imageHash,
        results: products,
        timestamp: Date.now()
      });

      // Limit cache size
      if (cacheRef.current.size > 10) {
        const firstKey = cacheRef.current.keys().next().value;
        cacheRef.current.delete(firstKey);
      }

      setResults(products);
      return products;
    } finally {
      setIsSearching(false);
    }
  }, []);

  return { search, isSearching, results };
}
```

---

### 5. UI Layout Optimization

#### Match Products Page Layout

```tsx
// ImageSearchDialog.tsx - Use same layout as Products page

<DialogContent className="max-w-7xl max-h-[90vh]">
  {/* Search Controls */}
  <div className="space-y-4 mb-4">
    {/* Upload area */}
  </div>

  {/* Results Grid - Same as ProductGrid */}
  {searchResults && searchResults.length > 0 && (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Found {searchResults.length} similar products
        </h3>
        <Button variant="outline" size="sm" onClick={handleClear}>
          Search Another
        </Button>
      </div>

      {/* ✅ Same grid as ProductGrid component */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {searchResults.map((product) => (
          <div key={product.id} className="relative">
            {/* Similarity badge */}
            <div className="absolute -top-2 -right-2 z-10">
              <Badge className="bg-primary text-white font-bold">
                {Math.round(product.similarity * 100)}%
              </Badge>
            </div>
            
            {/* Use standard ProductCard */}
            <ProductCard
              {...product}
              onRent={onAddToCart}
              onView={onViewProduct}
              onEdit={onEditProduct}
              variant="admin"
            />
          </div>
        ))}
      </div>
    </div>
  )}
</DialogContent>
```

---

## 📊 Expected Performance Improvements

| Optimization | Before | After | Savings |
|-------------|--------|-------|---------|
| Image Upload | 2-5s | 0.2-0.5s | ~3-4s ⚡ |
| Compression UI | Blocking | Non-blocking | Better UX ✨ |
| Cache Hits | N/A | <100ms | ~3-5s ⚡ |
| Database Query | N queries | 1 query | ~100-200ms ⚡ |
| **Total** | **3-8s** | **0.5-2s** | **~70% faster** 🚀 |

---

## 🚀 Implementation Priority

### Phase 1: Critical (Implement Now) ⚡
1. ✅ Client-side image compression (biggest impact)
2. ✅ Progressive loading UI
3. ✅ Match Products page layout

### Phase 2: High Priority
1. Response caching
2. Search cancellation support
3. Python API cache warming

### Phase 3: Nice to Have
1. Batch database queries optimization
2. Model embedding cache
3. CDN for Python API (if possible)

---

## 📝 Implementation Checklist

- [ ] Add `compressImage` to `searchProductsByImage` function
- [ ] Add progress indicators to `ImageSearchDialog`
- [ ] Implement `useImageSearch` hook with caching
- [ ] Match ProductGrid layout in search results
- [ ] Add search cancellation (AbortController)
- [ ] Add timing logs for debugging
- [ ] Test with various image sizes (1MB, 5MB, 10MB)
- [ ] Monitor performance metrics on Railway

---

## 🔍 Monitoring & Debugging

### Add Performance Logging

```typescript
// packages/utils/src/api/products.ts

export async function searchProductsByImage(
  imageFile: File,
  options: any = {}
): Promise<any> {
  const perfStart = performance.now();
  
  console.log('📊 Image Search Performance:');
  console.log(`  Original size: ${(imageFile.size/1024).toFixed(1)}KB`);
  
  // Compression
  const compStart = performance.now();
  const compressed = await compressImage(imageFile, {...});
  const compDuration = performance.now() - compStart;
  console.log(`  Compression: ${compDuration.toFixed(0)}ms (${(compressed.size/1024).toFixed(1)}KB)`);
  
  // API call
  const apiStart = performance.now();
  const response = await productsApi.searchByImage(formData);
  const apiDuration = performance.now() - apiStart;
  console.log(`  API call: ${apiDuration.toFixed(0)}ms`);
  
  const totalDuration = performance.now() - perfStart;
  console.log(`  Total: ${totalDuration.toFixed(0)}ms`);
  
  return response;
}
```

---

**Updated:** 2026-01-29
**Status:** Ready for Implementation
**Priority:** Critical ⚡

# Qdrant + Next.js Integration - Best Practices

Dựa trên [Qdrant demo repo](https://github.com/qdrant/demo-midlibrary-explorer-nextjs) và implementation hiện tại.

## ✅ Cách tích hợp Qdrant với Next.js (Đúng chuẩn)

### 1. **Qdrant Client Initialization**

**✅ ĐÚNG - Lazy loading trong API routes:**
```typescript
// apps/api/app/api/products/searchByImage/route.ts
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export const POST = async (request: NextRequest) => {
  // Lazy load để tránh load trong build time
  const { getVectorStore } = await import('@rentalshop/database/server');
  const vectorStore = getVectorStore();
  
  // Use vectorStore...
};
```

**✅ ĐÚNG - Singleton pattern:**
```typescript
// packages/database/src/ml/vector-store.ts
let vectorStore: ProductVectorStore | null = null;

export function getVectorStore(): ProductVectorStore {
  if (!vectorStore) {
    vectorStore = new ProductVectorStore();
  }
  return vectorStore;
}
```

**✅ ĐÚNG - Environment-based configuration:**
```typescript
constructor() {
  const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
  const qdrantApiKey = process.env.QDRANT_API_KEY;
  
  this.client = new QdrantClient({
    url: qdrantUrl,
    apiKey: qdrantApiKey
  });
}
```

### 2. **Next.js Configuration**

**✅ ĐÚNG - Force dynamic rendering:**
```typescript
// Prevent Next.js from pre-rendering routes that use Qdrant
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
```

**✅ ĐÚNG - External packages:**
```javascript
// apps/api/next.config.js
experimental: {
  serverComponentsExternalPackages: [
    '@qdrant/js-client-rest', // Externalize Qdrant client
  ],
}
```

### 3. **Error Handling**

**✅ ĐÚNG - Proper error handling:**
```typescript
try {
  const searchResults = await vectorStore.search(queryEmbedding, filters);
} catch (error) {
  // Handle Qdrant connection errors
  if (error.message?.includes('ECONNREFUSED')) {
    return NextResponse.json(
      ResponseBuilder.error('SERVICE_UNAVAILABLE'),
      { status: 503 }
    );
  }
  throw error;
}
```

## 📋 So sánh với Demo Repo

### Giống nhau:
- ✅ Dùng `@qdrant/js-client-rest`
- ✅ Lazy load trong API routes
- ✅ Environment variables cho connection
- ✅ Singleton pattern cho client

### Khác biệt:
- **Demo repo**: Có thể dùng client-side components (nếu public API)
- **Our implementation**: Server-side only (secure, với authentication)

## 🎯 Best Practices từ Demo

1. **Lazy Loading**: Luôn lazy load Qdrant client trong API routes
2. **Error Handling**: Handle connection errors gracefully
3. **Environment Variables**: Use env vars cho flexibility
4. **Singleton**: Reuse client instance để tối ưu performance

## ✅ Implementation hiện tại đã đúng chuẩn!

Codebase hiện tại đã follow best practices:
- ✅ Lazy loading trong API routes
- ✅ Singleton pattern
- ✅ Environment-based config
- ✅ Proper error handling
- ✅ Force dynamic rendering

Không cần thay đổi gì thêm!

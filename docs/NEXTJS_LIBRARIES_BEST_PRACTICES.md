# Next.js + Qdrant + Transformers.js - Best Practices Guide

Dựa trên official documentation, demo repos, và implementation hiện tại.

## 📚 Table of Contents

1. [Qdrant Integration](#qdrant-integration)
2. [Transformers.js Integration](#transformersjs-integration)
3. [Next.js Configuration](#nextjs-configuration)
4. [Docker Deployment](#docker-deployment)
5. [Common Issues & Solutions](#common-issues--solutions)

---

## 🔷 Qdrant Integration

### ✅ Best Practices

#### 1. **Lazy Loading trong API Routes**

**✅ ĐÚNG - Lazy load để tránh build-time errors:**
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

**❌ SAI - Import ở top level:**
```typescript
// ❌ DON'T DO THIS
import { getVectorStore } from '@rentalshop/database/server';

export const POST = async (request: NextRequest) => {
  const vectorStore = getVectorStore(); // May fail at build time
};
```

#### 2. **Singleton Pattern**

**✅ ĐÚNG - Reuse client instance:**
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

**Lợi ích:**
- Tối ưu performance (không tạo client mới mỗi request)
- Giảm connection overhead
- Thread-safe trong Next.js serverless environment

#### 3. **Environment-Based Configuration**

**✅ ĐÚNG - Use environment variables:**
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

**Environment Variables:**
```bash
# Production (Qdrant Cloud)
QDRANT_URL=https://your-cluster-id.region.cloud.qdrant.io
QDRANT_API_KEY=your-api-key-here

# Railway (Private Networking)
QDRANT_URL=http://qdrant:6333
QDRANT_API_KEY=  # Optional

# Local Development
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=  # Not needed
```

#### 4. **Error Handling**

**✅ ĐÚNG - Handle connection errors:**
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

---

## 🤖 Transformers.js Integration

### ✅ Best Practices

#### 1. **Force Dynamic Rendering**

**✅ ĐÚNG - Prevent static generation:**
```typescript
// apps/api/app/api/products/searchByImage/route.ts
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
```

**Lý do:**
- Transformers.js cần Node.js runtime
- ML models không thể pre-render
- WASM files cần runtime access

#### 2. **Externalize Packages**

**✅ ĐÚNG - Externalize trong next.config.js:**
```javascript
// apps/api/next.config.js
experimental: {
  serverComponentsExternalPackages: [
    '@xenova/transformers', // Externalize transformers
    'onnxruntime-node',      // Externalize ONNX runtime
  ],
}
```

**Lý do:**
- Next.js không bundle native modules
- WASM files cần runtime access
- Prevent build-time errors

#### 3. **WASM Backend Configuration**

**✅ ĐÚNG - Force WASM mode trong Docker/Alpine:**
```typescript
// packages/database/src/ml/image-embeddings.ts
if (shouldUseWebAssembly()) {
  process.env.USE_ONNXRUNTIME = 'false';
  process.env.USE_BROWSER = 'true';
  process.env.ONNXRUNTIME_NODE_DISABLE = 'true';
  
  // Configure transformers module
  transformersModule.env.useBrowser = true;
  transformersModule.env.useOnnxruntime = false;
}
```

**Lý do:**
- `onnxruntime-node` không work trên Alpine Linux (musl libc)
- WASM backend là fallback an toàn
- Works trên mọi platform

#### 4. **Singleton Pattern cho Model**

**✅ ĐÚNG - Reuse model instance:**
```typescript
export class FashionImageEmbedding {
  private model: any = null;
  
  private async getModel(): Promise<any> {
    if (!this.model) {
      this.model = await pipeline('image-feature-extraction', this.modelName);
    }
    return this.model;
  }
}
```

**Lợi ích:**
- Model loading rất chậm (30-90 seconds)
- Reuse model instance giảm latency
- Memory efficient

#### 5. **Cache Directory Configuration**

**✅ ĐÚNG - Configure writable cache:**
```typescript
if (useWebAssembly && transformersModule && transformersModule.env) {
  const cacheDir = process.env.TRANSFORMERS_CACHE_DIR || '/tmp/transformers-cache';
  
  // Ensure cache directory exists
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  
  transformersModule.env.cacheDir = cacheDir;
  transformersModule.env.useFSCache = true;
  transformersModule.env.useBrowserCache = false;
}
```

**Lý do:**
- Model files rất lớn (hundreds of MB)
- Cache giúp tái sử dụng models
- `/tmp` là writable trong Docker containers

---

## ⚙️ Next.js Configuration

### ✅ Best Practices

#### 1. **Output File Tracing**

**✅ ĐÚNG - Include WASM files:**
```javascript
// apps/api/next.config.js
outputFileTracingIncludes: {
  '/api/**': [
    // Include transformers WASM files
    '../../node_modules/@xenova/transformers/**/*',
    '../../node_modules/@xenova/transformers/dist/**/*.wasm',
    '../../node_modules/@xenova/transformers/dist/**/*.js',
    '../../node_modules/@xenova/transformers/.cache/**/*',
  ],
}
```

**Lý do:**
- Next.js standalone build cần explicit file tracing
- WASM files không được auto-detect
- Cache directory cần được include

#### 2. **Webpack Configuration**

**✅ ĐÚNG - Externalize và alias:**
```javascript
// apps/api/next.config.js
webpack: (config, { isServer }) => {
  if (isServer) {
    // Externalize onnxruntime-node
    config.externals = config.externals || [];
    config.externals.push('onnxruntime-node');
    
    // Alias to mock module
    config.resolve.alias = {
      ...config.resolve.alias,
      'onnxruntime-node': path.resolve(__dirname, 'lib/mock-onnxruntime-node.js'),
    };
  }
  return config;
}
```

---

## 🐳 Docker Deployment

### ✅ Best Practices

#### 1. **Copy WASM Files**

**✅ ĐÚNG - Explicitly copy WASM files:**
```dockerfile
# apps/api/Dockerfile
# Copy WASM files from builder to runner
COPY --from=builder --chown=nextjs:nodejs \
  /app/node_modules/@xenova/transformers/dist/*.wasm \
  ./node_modules/@xenova/transformers/dist/

# Copy entire transformers module
COPY --from=builder --chown=nextjs:nodejs \
  /app/node_modules/@xenova/transformers \
  ./node_modules/@xenova/transformers
```

#### 2. **Create Cache Directory**

**✅ ĐÚNG - Writable cache directory:**
```dockerfile
# Create writable cache directory
RUN mkdir -p /tmp/transformers-cache && \
    chown nextjs:nodejs /tmp/transformers-cache
```

#### 3. **Mock onnxruntime-node**

**✅ ĐÚNG - Create mock module:**
```dockerfile
# Create mock onnxruntime-node module
RUN mkdir -p node_modules/onnxruntime-node && \
    echo "module.exports = {" > node_modules/onnxruntime-node/index.js && \
    echo "  InferenceSession: { create: () => { throw new Error('onnxruntime-node is disabled'); } }," >> node_modules/onnxruntime-node/index.js && \
    echo "  create: () => { throw new Error('onnxruntime-node is disabled'); }" >> node_modules/onnxruntime-node/index.js && \
    echo "};" >> node_modules/onnxruntime-node/index.js
```

---

## 🔧 Common Issues & Solutions

### Issue 1: `ERR_DLOPEN_FAILED` với onnxruntime-node

**Nguyên nhân:**
- Alpine Linux (musl libc) không tương thích với native binaries
- `onnxruntime-node` cần glibc

**Giải pháp:**
```typescript
// Force WASM mode
process.env.USE_ONNXRUNTIME = 'false';
process.env.USE_BROWSER = 'true';
process.env.ONNXRUNTIME_NODE_DISABLE = 'true';
```

### Issue 2: WASM files not found

**Nguyên nhân:**
- Next.js standalone build không include WASM files
- File tracing không đầy đủ

**Giải pháp:**
```javascript
// next.config.js
outputFileTracingIncludes: {
  '/api/**': [
    '../../node_modules/@xenova/transformers/**/*',
  ],
}
```

### Issue 3: Model loading timeout

**Nguyên nhân:**
- Model files rất lớn (hundreds of MB)
- Network download chậm
- WASM backend initialization chậm

**Giải pháp:**
```typescript
// Increase timeout
const timeoutPromise = new Promise((_, reject) => {
  setTimeout(() => reject(new Error('Timeout')), 120000); // 120 seconds
});

const model = await Promise.race([pipelinePromise, timeoutPromise]);
```

### Issue 4: Qdrant connection refused

**Nguyên nhân:**
- Environment variables chưa set
- Network/firewall issues
- Qdrant service chưa start

**Giải pháp:**
```typescript
// Check environment variables
if (!process.env.QDRANT_URL) {
  throw new Error('QDRANT_URL is not set');
}

// Handle connection errors
try {
  await client.getCollections();
} catch (error) {
  if (error.message?.includes('ECONNREFUSED')) {
    // Qdrant service not available
  }
}
```

---

## 📋 Checklist

### Qdrant Integration
- [ ] Lazy load QdrantClient trong API routes
- [ ] Use singleton pattern
- [ ] Environment variables configured
- [ ] Error handling implemented
- [ ] Force dynamic rendering

### Transformers.js Integration
- [ ] Force dynamic rendering
- [ ] Externalize packages
- [ ] WASM backend configured
- [ ] Cache directory configured
- [ ] Singleton pattern cho model
- [ ] WASM files included in Docker

### Next.js Configuration
- [ ] `outputFileTracingIncludes` configured
- [ ] `serverComponentsExternalPackages` configured
- [ ] Webpack externals configured
- [ ] Mock onnxruntime-node created

### Docker Deployment
- [ ] WASM files copied
- [ ] Cache directory created
- [ ] Mock module created
- [ ] Environment variables set

---

## 🎯 Summary

**Best Practices:**
1. ✅ **Lazy loading** - Tránh build-time errors
2. ✅ **Singleton pattern** - Tối ưu performance
3. ✅ **Environment-based config** - Flexibility
4. ✅ **Force dynamic rendering** - Prevent static generation
5. ✅ **Externalize packages** - Prevent bundling issues
6. ✅ **WASM backend** - Cross-platform compatibility
7. ✅ **Error handling** - Graceful degradation
8. ✅ **File tracing** - Include necessary files

**Codebase hiện tại đã follow tất cả best practices!** ✅

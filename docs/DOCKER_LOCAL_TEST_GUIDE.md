# Hướng Dẫn Test Docker Local - Giả Lập Railway Environment

## 🎯 Mục Đích

Test Docker local để giả lập môi trường Railway và xác định nguyên nhân memory corruption "corrupted size vs. prev_size".

## 📋 Cách 1: Test Docker Local (Khuyến Nghị)

### Bước 1: Build Docker Image

```bash
cd apps/api
docker build -t rentalshop-api-test:latest .
cd ../..
```

### Bước 2: Test Embedding trong Docker

```bash
# Copy test image vào container và test
docker run --rm \
  -v "$(pwd)/test-images:/app/test-images:ro" \
  -v "$(pwd)/packages:/app/packages:ro" \
  -v "$(pwd)/node_modules:/app/node_modules:ro" \
  -v "$(pwd)/prisma:/app/prisma:ro" \
  rentalshop-api-test:latest \
  node -e "
    const fs = require('fs');
    const path = require('path');
    
    async function test() {
      try {
        console.log('🔄 Loading embedding service...');
        const { getEmbeddingService } = require('./packages/database/dist/ml/image-embeddings.js');
        const service = getEmbeddingService();
        
        console.log('🔄 Reading image...');
        const imagePath = '/app/test-images/IMG_8298 2.JPG';
        const buffer = fs.readFileSync(imagePath);
        console.log('   ✅ Buffer size:', buffer.length, 'bytes');
        
        console.log('🔄 Generating embedding...');
        const start = Date.now();
        const embedding = await service.generateEmbeddingFromBuffer(buffer);
        const time = Date.now() - start;
        
        console.log('✅ SUCCESS!');
        console.log('   - Dimension:', embedding.length);
        console.log('   - Time:', time + 'ms');
      } catch (error) {
        console.error('❌ ERROR:', error.message);
        console.error(error.stack);
        process.exit(1);
      }
    }
    
    test();
  "
```

### Bước 3: Sử dụng Script Tự Động

```bash
# Chạy script tự động
./scripts/test-docker-local.sh
```

## 📋 Cách 2: Test với Docker Compose (Đơn Giản Hơn)

Tạo `docker-compose.test.yml`:

```yaml
version: '3.8'
services:
  test:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    volumes:
      - ./test-images:/app/test-images:ro
      - ./packages:/app/packages:ro
      - ./node_modules:/app/node_modules:ro
      - ./prisma:/app/prisma:ro
    command: node -e "
      const fs = require('fs');
      const { getEmbeddingService } = require('./packages/database/dist/ml/image-embeddings.js');
      (async () => {
        const service = getEmbeddingService();
        const buffer = fs.readFileSync('/app/test-images/IMG_8298 2.JPG');
        const embedding = await service.generateEmbeddingFromBuffer(buffer);
        console.log('✅ SUCCESS:', embedding.length);
      })();
    "
```

Chạy:
```bash
docker-compose -f docker-compose.test.yml up --build
```

## 📋 Cách 3: Test với Script TypeScript

```bash
# Build project trước
yarn build

# Chạy test trong Docker
docker run --rm \
  -v "$(pwd):/app" \
  -w /app \
  node:18 \
  node packages/database/dist/ml/image-embeddings.js
```

## 🔍 Debug Tips

### 1. Check Memory Usage

```bash
docker stats <container-id>
```

### 2. Check Logs Chi Tiết

Thêm `console.log` vào code để xem:
- Buffer size
- ArrayBuffer size
- Uint8ClampedArray size
- Memory usage trước/sau

### 3. Test với Hình Nhỏ

Test với hình ảnh nhỏ hơn (100KB) để xem có phải do kích thước không.

## 🎯 Giải Pháp Đề Xuất

Dựa trên research, vấn đề "corrupted size vs. prev_size" thường do:

1. **Buffer sharing memory** - Buffer từ sharp có thể share memory với internal buffers
2. **ArrayBuffer alignment** - Uint8ClampedArray cần aligned memory
3. **Docker memory constraints** - Railway có thể có memory limits

### Giải Pháp:

1. **Copy data vào ArrayBuffer mới** (đã implement trong Strategy 1)
2. **Không dùng .rotate()** - có thể gây memory issues
3. **Dùng temp file** nếu Buffer approach fail (Strategy 2)

## 📚 References

- [transformers.js Documentation](https://huggingface.co/docs/transformers.js)
- [onnxruntime-node Issues](https://github.com/microsoft/onnxruntime/issues)
- [Sharp Memory Management](https://sharp.pixelplumbing.com/api-constructor)

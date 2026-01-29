# Image Embedding Alternatives for Next.js

## Vấn đề hiện tại
- `@xenova/transformers` gây memory corruption (`free(): invalid size`) trên Railway
- Docker local test thành công nhưng Railway vẫn fail
- Next.js standalone build có vấn đề với Buffer/Blob memory management

## Các giải pháp thay thế

### 1. **Hugging Face Inference API** ⭐ RECOMMENDED
**Ưu điểm:**
- ✅ Không cần chạy model locally → không có memory issues
- ✅ Stable, production-ready
- ✅ Auto-scaling
- ✅ Support CLIP models (clip-vit-base-patch32)
- ✅ Free tier: 1,000 requests/month
- ✅ Easy integration với Next.js

**Nhược điểm:**
- ❌ Cần internet connection
- ❌ Có latency (API call)
- ❌ Có cost nếu vượt free tier

**Implementation:**
```typescript
import { HfInference } from '@huggingface/inference';

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

async function generateEmbedding(imageBuffer: Buffer): Promise<number[]> {
  const response = await hf.featureExtraction({
    model: 'Xenova/clip-vit-base-patch32',
    inputs: imageBuffer,
  });
  return response;
}
```

**Cost:**
- Free: 1,000 requests/month
- Pay-as-you-go: $0.0001 per request (~$0.10 per 1,000 requests)

---

### 2. **Replicate API** ⭐ GOOD ALTERNATIVE
**Ưu điểm:**
- ✅ No memory issues (external service)
- ✅ Support many CLIP models
- ✅ Pay-per-use pricing
- ✅ Good documentation

**Nhược điểm:**
- ❌ Cần internet
- ❌ Có latency
- ❌ Có cost

**Implementation:**
```typescript
import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

async function generateEmbedding(imageBuffer: Buffer): Promise<number[]> {
  const output = await replicate.run(
    'stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b',
    {
      input: {
        image: imageBuffer,
      },
    }
  );
  return output;
}
```

---

### 3. **OpenAI CLIP API** (nếu có)
**Ưu điểm:**
- ✅ Stable, production-ready
- ✅ Good performance

**Nhược điểm:**
- ❌ Không có public CLIP API (chỉ có DALL-E)
- ❌ Cần tìm alternative

---

### 4. **TensorFlow.js** (@tensorflow/tfjs-node)
**Ưu điểm:**
- ✅ Chạy locally (no API calls)
- ✅ Better memory management than transformers.js
- ✅ Support CLIP models

**Nhược điểm:**
- ❌ Vẫn có thể có memory issues
- ❌ Cần convert model format
- ❌ More complex setup

**Implementation:**
```typescript
import * as tf from '@tensorflow/tfjs-node';
import { loadLayersModel } from '@tensorflow/tfjs-layers';

// Load CLIP model
const model = await loadLayersModel('path/to/clip-model.json');

// Generate embedding
const embedding = model.predict(imageTensor);
```

---

### 5. **Cohere Embed API**
**Ưu điểm:**
- ✅ Stable API
- ✅ Good for text embeddings
- ✅ Free tier available

**Nhược điểm:**
- ❌ Không support image embeddings (chỉ text)
- ❌ Không phù hợp cho use case này

---

## So sánh nhanh

| Solution | Memory Issues | Latency | Cost | Setup Complexity | Recommendation |
|----------|---------------|---------|------|------------------|----------------|
| **Hugging Face API** | ✅ None | ⚠️ API call | 💰 Free tier | ⭐ Easy | ⭐⭐⭐⭐⭐ |
| **Replicate API** | ✅ None | ⚠️ API call | 💰 Pay-per-use | ⭐ Easy | ⭐⭐⭐⭐ |
| **TensorFlow.js** | ⚠️ Possible | ✅ Fast | 💰 Free | ⭐⭐⭐ Complex | ⭐⭐⭐ |
| **transformers.js** | ❌ Current issue | ✅ Fast | 💰 Free | ⭐⭐ Medium | ❌ Not working |

---

## Khuyến nghị

### **Option 1: Hugging Face Inference API** (RECOMMENDED)
**Lý do:**
1. ✅ Giải quyết hoàn toàn memory corruption issue
2. ✅ Production-ready, stable
3. ✅ Free tier đủ cho development/testing
4. ✅ Easy migration từ transformers.js
5. ✅ Auto-scaling, không cần manage infrastructure

**Migration steps:**
1. Install: `yarn add @huggingface/inference`
2. Get API key từ https://huggingface.co/settings/tokens
3. Replace `generateEmbeddingFromBuffer()` với API call
4. Update environment variables

**Cost estimate:**
- Development: Free (1,000 requests/month)
- Production: ~$0.10 per 1,000 requests (very cheap)

---

### **Option 2: Hybrid Approach**
**Strategy:**
- Development: Dùng Hugging Face API (free, stable)
- Production: Có thể switch về local model nếu cần (sau khi fix memory issue)

**Benefits:**
- ✅ No memory issues trong development
- ✅ Flexibility cho production
- ✅ Can optimize cost later

---

## Next Steps

1. **Test Hugging Face API locally:**
   ```bash
   yarn add @huggingface/inference
   ```

2. **Create new implementation:**
   - File: `packages/database/src/ml/image-embeddings-api.ts`
   - Use Hugging Face Inference API
   - Keep same interface as current implementation

3. **A/B Test:**
   - Test API approach vs current transformers.js
   - Compare performance, cost, reliability

4. **Migrate gradually:**
   - Start with API approach
   - Monitor performance and cost
   - Consider local model later if needed

---

---

## 🆓 Các Giải Pháp HOÀN TOÀN MIỄN PHÍ

### **Option 1: ONNX Runtime Direct (Không qua transformers.js)** ⭐ FREE
**Ưu điểm:**
- ✅ **100% FREE** - không tốn phí gì
- ✅ Chạy locally (no API calls)
- ✅ Better memory management than transformers.js
- ✅ Direct control over memory allocation
- ✅ Support CLIP models (convert từ PyTorch)

**Nhược điểm:**
- ❌ Cần convert model format (PyTorch → ONNX)
- ❌ More complex setup
- ❌ Vẫn có thể có memory issues nếu không handle đúng

**Implementation:**
```typescript
import { InferenceSession, Tensor } from 'onnxruntime-node';

// Load ONNX model directly
const session = await InferenceSession.create('clip-vit-base-patch32.onnx');

// Process image with sharp
const imageData = await sharp(buffer).resize(224, 224).raw().toBuffer();
const tensor = new Tensor('float32', imageData, [1, 3, 224, 224]);

// Run inference
const results = await session.run({ input: tensor });
const embedding = Array.from(results.output.data);
```

**Setup:**
1. Convert CLIP model từ PyTorch sang ONNX
2. Install: `yarn add onnxruntime-node`
3. Load model và process image trực tiếp

---

### **Option 2: Self-Hosted Python API (FastAPI)** ⭐ FREE
**Ưu điểm:**
- ✅ **100% FREE** - chỉ tốn server cost (nếu có server rồi thì free)
- ✅ Full control over memory management
- ✅ Python ecosystem (transformers library stable)
- ✅ Có thể deploy trên Railway/Vercel (serverless function)
- ✅ No memory corruption issues (Python handles memory better)

**Nhược điểm:**
- ❌ Cần maintain Python service
- ❌ Cần deploy thêm service (hoặc dùng Railway/Vercel serverless)
- ❌ Có latency (HTTP call)

**Implementation:**
```python
# FastAPI service (deploy trên Railway/Vercel)
from fastapi import FastAPI, File
from transformers import CLIPProcessor, CLIPModel
import torch

app = FastAPI()
model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

@app.post("/embed")
async def generate_embedding(image: bytes = File(...)):
    inputs = processor(images=image, return_tensors="pt")
    with torch.no_grad():
        outputs = model.get_image_features(**inputs)
    return {"embedding": outputs[0].tolist()}
```

**Next.js call:**
```typescript
const response = await fetch('http://your-python-api/embed', {
  method: 'POST',
  body: formData,
});
const { embedding } = await response.json();
```

**Cost:**
- Railway/Vercel serverless: **FREE** (nếu trong free tier)
- Hoặc deploy trên server có sẵn: **FREE**

---

### **Option 3: Client-Side Embedding (Browser-based)** ⭐ FREE
**Ưu điểm:**
- ✅ **100% FREE** - chạy trên browser
- ✅ No server cost
- ✅ No memory issues (browser handles memory)
- ✅ Fast (no network latency)

**Nhược điểm:**
- ❌ Model size lớn (~100MB) → slow initial load
- ❌ User's device phải xử lý (có thể chậm)
- ❌ Privacy concerns (model chạy trên client)

**Implementation:**
```typescript
// Frontend: packages/ui/src/components/features/Products/
import { pipeline } from '@xenova/transformers';

const model = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32');
const embedding = await model(imageFile);
```

**Use case:**
- Chỉ dùng cho development/testing
- Hoặc cho users có device mạnh

---

### **Option 4: Fix transformers.js Memory Issue** ⭐ FREE
**Ưu điểm:**
- ✅ **100% FREE** - không cần thay đổi gì
- ✅ Chạy locally (no API calls)
- ✅ Fast (no network latency)

**Nhược điểm:**
- ❌ Đã thử nhiều lần nhưng vẫn fail
- ❌ Root cause: Next.js standalone build + Buffer/Blob memory sharing

**Possible fixes:**
1. **Use Worker Threads**: Chạy model trong separate worker thread
2. **Use Child Process**: Chạy model trong separate process
3. **Use Edge Runtime**: Thử Edge runtime thay vì Node.js runtime
4. **Memory Pool**: Pre-allocate memory pool để tránh fragmentation

**Implementation (Worker Thread):**
```typescript
// packages/database/src/ml/image-embeddings-worker.ts
import { Worker } from 'worker_threads';

async function generateEmbedding(imageBuffer: Buffer): Promise<number[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./embedding-worker.js', {
      workerData: { imageBuffer }
    });
    worker.on('message', resolve);
    worker.on('error', reject);
  });
}
```

---

## So sánh các giải pháp FREE

| Solution | Cost | Memory Issues | Setup | Latency | Recommendation |
|----------|------|---------------|-------|---------|----------------|
| **ONNX Runtime Direct** | 💰 FREE | ⚠️ Possible | ⭐⭐⭐ Complex | ✅ Fast | ⭐⭐⭐⭐ |
| **Self-Hosted Python API** | 💰 FREE* | ✅ None | ⭐⭐ Medium | ⚠️ API call | ⭐⭐⭐⭐⭐ |
| **Client-Side (Browser)** | 💰 FREE | ✅ None | ⭐ Easy | ✅ Fast | ⭐⭐⭐ |
| **Fix transformers.js** | 💰 FREE | ❌ Current issue | ⭐⭐ Medium | ✅ Fast | ⭐⭐ |
| **Hugging Face API** | 💰 Free tier | ✅ None | ⭐ Easy | ⚠️ API call | ⭐⭐⭐⭐⭐ |

*FREE nếu có server hoặc trong free tier

---

## 🎯 Khuyến nghị cho FREE Solution

### **Best FREE Option: Self-Hosted Python API** ⭐⭐⭐⭐⭐
**Lý do:**
1. ✅ **100% FREE** (nếu deploy trên Railway/Vercel free tier)
2. ✅ **No memory issues** (Python stable hơn Node.js cho ML)
3. ✅ **Production-ready** (FastAPI là industry standard)
4. ✅ **Easy to maintain** (Python transformers library mature)
5. ✅ **Flexible** (có thể optimize sau)

**Setup steps:**
1. Tạo Python FastAPI service
2. Deploy trên Railway (free tier) hoặc Vercel (serverless)
3. Call từ Next.js API route
4. **Total cost: $0**

---

## References
- [Hugging Face Inference API](https://huggingface.co/docs/api-inference/index)
- [Replicate API](https://replicate.com/docs)
- [TensorFlow.js](https://www.tensorflow.org/js)
- [ONNX Runtime](https://onnxruntime.ai/)
- [FastAPI](https://fastapi.tiangolo.com/)

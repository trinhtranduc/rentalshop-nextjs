# Self-Hosted Python API (FastAPI) - Hướng Dẫn Chi Tiết

## 📋 Tổng Quan

Giải pháp này tạo một **Python FastAPI service** riêng để generate image embeddings, deploy trên Railway (free tier), và call từ Next.js API route.

**Ưu điểm:**
- ✅ **100% FREE** (Railway free tier)
- ✅ **No memory issues** (Python stable hơn Node.js cho ML)
- ✅ **Production-ready** (FastAPI industry standard)
- ✅ **Easy to maintain**

---

## 🏗️ Architecture

```
┌─────────────────┐
│  Next.js API    │
│  (apps/api)     │
│                 │
│  POST /api/     │───HTTP───►┌─────────────────┐
│  products/      │           │  Python FastAPI │
│  searchByImage  │           │  Service        │
│                 │           │                 │
│                 │           │  POST /embed    │
│                 │           │  (CLIP model)   │
└─────────────────┘           └─────────────────┘
```

---

## 📁 Cấu Trúc Files

```
rentalshop-nextjs/
├── python-embedding-service/     # NEW: Python service
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py               # FastAPI app
│   │   ├── models.py             # CLIP model loading
│   │   └── utils.py              # Image processing
│   ├── requirements.txt          # Python dependencies
│   ├── Dockerfile                # Docker config
│   ├── railway.json              # Railway config
│   └── README.md
└── apps/api/
    └── app/api/products/
        └── searchByImage/
            └── route.ts          # Updated to call Python API
```

---

## 🚀 Step 1: Tạo Python FastAPI Service

### 1.1. Tạo thư mục và files

```bash
mkdir -p python-embedding-service/app
cd python-embedding-service
```

### 1.2. `requirements.txt`

```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
python-multipart==0.0.6
pillow==10.1.0
torch==2.1.0
transformers==4.35.0
numpy==1.24.3
```

### 1.3. `app/main.py`

```python
"""
FastAPI service for image embedding generation
Deploy on Railway: https://railway.app
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from app.models import EmbeddingModel

app = FastAPI(
    title="Image Embedding API",
    description="Generate CLIP embeddings for image search",
    version="1.0.0"
)

# CORS middleware (allow Next.js to call)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model instance (loaded once)
model: EmbeddingModel = None

@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    global model
    print("🔄 Loading CLIP model...")
    model = EmbeddingModel()
    await model.load()
    print("✅ Model loaded successfully")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": model is not None and model.is_loaded()
    }

@app.post("/embed")
async def generate_embedding(file: UploadFile = File(...)):
    """
    Generate embedding from uploaded image
    
    Args:
        file: Image file (JPEG, PNG, WebP)
    
    Returns:
        {
            "embedding": [float, ...],  # 512 dimensions
            "dimension": 512,
            "normalized": true
        }
    """
    try:
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Expected image file."
            )
        
        # Read image bytes
        image_bytes = await file.read()
        
        if len(image_bytes) == 0:
            raise HTTPException(
                status_code=400,
                detail="Empty file"
            )
        
        # Generate embedding
        embedding = await model.generate_embedding(image_bytes)
        
        return JSONResponse({
            "success": True,
            "embedding": embedding,
            "dimension": len(embedding),
            "normalized": True
        })
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error generating embedding: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Embedding generation failed: {str(e)}"
        )

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Image Embedding API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "embed": "/embed (POST)"
        }
    }

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=False
    )
```

### 1.4. `app/models.py`

```python
"""
CLIP model loading and inference
"""

import torch
from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import io
import numpy as np
from typing import List

class EmbeddingModel:
    """CLIP model wrapper for image embedding generation"""
    
    def __init__(self, model_name: str = "openai/clip-vit-base-patch32"):
        self.model_name = model_name
        self.model = None
        self.processor = None
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self._loaded = False
    
    async def load(self):
        """Load CLIP model and processor"""
        try:
            print(f"🔄 Loading model: {self.model_name} on {self.device}...")
            
            self.processor = CLIPProcessor.from_pretrained(self.model_name)
            self.model = CLIPModel.from_pretrained(self.model_name)
            self.model.to(self.device)
            self.model.eval()  # Set to evaluation mode
            
            self._loaded = True
            print(f"✅ Model loaded successfully on {self.device}")
        
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            raise
    
    def is_loaded(self) -> bool:
        """Check if model is loaded"""
        return self._loaded
    
    async def generate_embedding(self, image_bytes: bytes) -> List[float]:
        """
        Generate embedding from image bytes
        
        Args:
            image_bytes: Image file bytes
        
        Returns:
            Normalized embedding vector (512 dimensions)
        """
        if not self._loaded:
            raise RuntimeError("Model not loaded. Call load() first.")
        
        try:
            # Load image from bytes
            image = Image.open(io.BytesIO(image_bytes))
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Process image
            inputs = self.processor(images=image, return_tensors="pt")
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            # Generate embedding
            with torch.no_grad():
                outputs = self.model.get_image_features(**inputs)
                embedding = outputs[0].cpu().numpy()
            
            # Normalize embedding (for cosine similarity)
            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding = embedding / norm
            
            return embedding.tolist()
        
        except Exception as e:
            print(f"❌ Error generating embedding: {e}")
            raise
```

### 1.5. `app/__init__.py`

```python
# Empty file to make app a package
```

### 1.6. `Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 1.7. `railway.json`

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 1.8. `README.md`

```markdown
# Image Embedding API (Python FastAPI)

FastAPI service for generating CLIP image embeddings.

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn app.main:app --reload --port 8000
```

## Deploy on Railway

1. Connect GitHub repo to Railway
2. Select this directory as root
3. Railway will auto-detect Dockerfile
4. Set PORT environment variable (auto-set by Railway)

## API Endpoints

- `GET /health` - Health check
- `POST /embed` - Generate embedding from image file
```

---

## 🔧 Step 2: Update Next.js API Route

### 2.1. Update `apps/api/app/api/products/searchByImage/route.ts`

```typescript
// Add environment variable
const PYTHON_EMBEDDING_API_URL = process.env.PYTHON_EMBEDDING_API_URL || 'http://localhost:8000';

// In Step 3: Generate embedding
try {
  console.log('🔄 Step 3: Generating embedding via Python API...');
  
  // Create FormData for Python API
  const formData = new FormData();
  formData.append('file', new Blob([compressedBuffer]), 'image.png');
  
  // Call Python API
  const embeddingResponse = await fetch(`${PYTHON_EMBEDDING_API_URL}/embed`, {
    method: 'POST',
    body: formData,
  });
  
  if (!embeddingResponse.ok) {
    throw new Error(`Python API error: ${embeddingResponse.statusText}`);
  }
  
  const embeddingData = await embeddingResponse.json();
  queryEmbedding = embeddingData.embedding;
  
  console.log(`✅ Step 3: Embedding generated successfully (dimension: ${queryEmbedding.length})`);
} catch (error: any) {
  // Error handling...
}
```

---

## 🚂 Step 3: Deploy trên Railway

### 3.1. Tạo Service mới trên Railway

1. **Vào Railway Dashboard** → New Project
2. **Add Service** → GitHub Repo
3. **Select Directory**: `python-embedding-service`
4. **Railway sẽ auto-detect** Dockerfile
5. **Deploy**

### 3.2. Environment Variables

Railway sẽ tự động set:
- `PORT` (auto-set by Railway)

### 3.3. Get Service URL

Sau khi deploy, Railway sẽ cung cấp URL:
- Example: `https://python-embedding-service-production.up.railway.app`

### 3.4. Update Next.js Environment

Thêm vào `apps/api/.env` hoặc Railway environment:

```bash
PYTHON_EMBEDDING_API_URL=https://python-embedding-service-production.up.railway.app
```

---

## 🧪 Step 4: Test

### 4.1. Test Python API locally

```bash
cd python-embedding-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Test health
curl http://localhost:8000/health

# Test embedding
curl -X POST http://localhost:8000/embed \
  -F "file=@test-image.jpg"
```

### 4.2. Test từ Next.js

```typescript
// Test script: scripts/test-python-api.ts
const response = await fetch('http://localhost:8000/embed', {
  method: 'POST',
  body: formData,
});
const data = await response.json();
console.log('Embedding:', data.embedding.length); // Should be 512
```

---

## 💰 Cost Estimate

**Railway Free Tier:**
- **$5 credit/month** (enough for ~100 hours of runtime)
- **512MB RAM** (enough for CLIP model)
- **Total cost: $0** (if within free tier)

**If exceed free tier:**
- **$0.000463/hour** for 512MB RAM
- **~$0.33/month** for 24/7 uptime

---

## ✅ Advantages

1. ✅ **No memory corruption** (Python stable)
2. ✅ **Production-ready** (FastAPI industry standard)
3. ✅ **Easy to maintain** (Python transformers library mature)
4. ✅ **Scalable** (Railway auto-scaling)
5. ✅ **FREE** (Railway free tier)

---

## 🔄 Migration Steps

1. ✅ Create Python service
2. ✅ Deploy on Railway
3. ✅ Update Next.js API route
4. ✅ Test locally
5. ✅ Deploy to production
6. ✅ Monitor performance

---

## 📚 References

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Hugging Face Transformers](https://huggingface.co/docs/transformers)
- [Railway Deployment](https://docs.railway.app/)

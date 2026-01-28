"""
FastAPI service for image embedding generation
Deploy on Railway: https://railway.app
"""

import os
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

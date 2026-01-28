"""
FastAPI service for image embedding generation and search
Deploy on Railway: https://railway.app
"""

import os
import time
from typing import Optional
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from app.models import EmbeddingModel
from app.search_service import SearchService

app = FastAPI(
    title="Image Embedding & Search API",
    description="Generate CLIP embeddings and search products by image",
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

# Global instances (loaded once)
model: EmbeddingModel = None
search_service: SearchService = None

@app.on_event("startup")
async def startup_event():
    """Load model and initialize services on startup"""
    global model, search_service
    
    print("🔄 Loading CLIP model...")
    model = EmbeddingModel()
    await model.load()
    print("✅ Model loaded successfully")
    
    print("🔄 Initializing search service...")
    search_service = SearchService()
    await search_service.initialize()
    print("✅ Search service initialized")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    global search_service
    if search_service:
        await search_service.close()

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

@app.post("/search")
async def search_products(
    file: UploadFile = File(...),
    merchantId: Optional[int] = Form(None),
    outletId: Optional[int] = Form(None),
    categoryId: Optional[int] = Form(None),
    limit: int = Form(20),
    minSimilarity: float = Form(0.5)
):
    """
    Complete image search: embedding + vector search + product fetch
    All processing happens in Python service to minimize network round-trips
    
    Args:
        file: Image file (JPEG, PNG, WebP)
        merchantId: Filter by merchant ID
        outletId: Filter by outlet ID
        categoryId: Filter by category ID
        limit: Maximum number of results (default: 20)
        minSimilarity: Minimum similarity threshold (default: 0.5)
    
    Returns:
        {
            "success": true,
            "products": [...],
            "total": int,
            "searchDuration": int,
            "fetchDuration": int,
            "totalDuration": int
        }
    """
    total_start = time.time()
    
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
        
        print(f"🔄 Processing image search (image: {len(image_bytes)/1024:.1f}KB)")
        
        # Step 1: Generate embedding
        embedding_start = time.time()
        embedding = await model.generate_embedding(image_bytes)
        embedding_duration = int((time.time() - embedding_start) * 1000)
        print(f"✅ Embedding generated: {embedding_duration}ms")
        
        # Step 2: Vector search + fetch products
        filters = {}
        if merchantId:
            filters["merchantId"] = merchantId
        if outletId:
            filters["outletId"] = outletId
        if categoryId:
            filters["categoryId"] = categoryId
        
        search_result = await search_service.search_products(
            embedding=embedding,
            filters=filters,
            limit=limit,
            min_similarity=minSimilarity
        )
        
        total_duration = int((time.time() - total_start) * 1000)
        
        return JSONResponse({
            "success": True,
            "products": search_result["products"],
            "total": search_result["total"],
            "embeddingDuration": embedding_duration,
            "searchDuration": search_result["searchDuration"],
            "fetchDuration": search_result["fetchDuration"],
            "totalDuration": total_duration
        })
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in image search: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Image search failed: {str(e)}"
        )

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Image Embedding & Search API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "embed": "/embed (POST) - Generate embedding only",
            "search": "/search (POST) - Complete image search (embedding + vector search + product fetch)"
        }
    }

if __name__ == "__main__":
    # Railway sets PORT environment variable (usually 8080 or dynamic)
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=port,
        reload=False
    )

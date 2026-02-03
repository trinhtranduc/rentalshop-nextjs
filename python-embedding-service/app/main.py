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

@app.post("/embed/batch")
async def generate_embeddings_batch(files: list[UploadFile] = File(...)):
    """
    Generate embeddings from multiple images (BATCH PROCESSING - MUCH FASTER)
    
    This endpoint processes multiple images in a single batch, which is:
    - Much faster than individual requests (GPU parallelization)
    - More efficient (less network overhead)
    - Better for bulk operations (1k+ images)
    
    Args:
        files: List of image files (JPEG, PNG, WebP)
    
    Returns:
        {
            "success": true,
            "embeddings": [[float, ...], ...],  # List of 512-dim vectors
            "count": int,
            "dimension": 512,
            "normalized": true
        }
    """
    try:
        if not files or len(files) == 0:
            raise HTTPException(
                status_code=400,
                detail="No files provided"
            )
        
        # Validate and read all images
        image_bytes_list = []
        for file in files:
            if not file.content_type or not file.content_type.startswith('image/'):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid file type: {file.filename}. Expected image file."
                )
            
            image_bytes = await file.read()
            if len(image_bytes) == 0:
                raise HTTPException(
                    status_code=400,
                    detail=f"Empty file: {file.filename}"
                )
            
            image_bytes_list.append(image_bytes)
        
        # Generate embeddings in batch (much faster!)
        embeddings = await model.generate_embeddings_batch(image_bytes_list)
        
        return JSONResponse({
            "success": True,
            "embeddings": embeddings,
            "count": len(embeddings),
            "dimension": len(embeddings[0]) if embeddings else 512,
            "normalized": True
        })
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error generating batch embeddings: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Batch embedding generation failed: {str(e)}"
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

@app.post("/embed/s3-batch")
async def generate_embeddings_from_s3(
    s3_keys: str = Form(...),  # JSON array as string
    bucket_name: str = Form(...),
    region: str = Form("ap-southeast-1")
):
    """
    Generate embeddings from S3 keys (DIRECT S3 ACCESS - FASTEST METHOD)
    
    This endpoint downloads images directly from S3, avoiding:
    - Downloading images in Node.js
    - Uploading images to Python API
    - Much faster because Python API and S3 are in same AWS network
    
    Args:
        s3_keys: JSON array string of S3 keys (e.g., '["products/merchant-1/image.jpg"]')
        bucket_name: S3 bucket name (e.g., 'anyrent-images-dev')
        region: AWS region (default: 'ap-southeast-1')
    
    Returns:
        {
            "success": true,
            "embeddings": [[float, ...], ...],  # List of 512-dim vectors
            "count": int,
            "dimension": 512,
            "normalized": true
        }
    """
    try:
        import json
        
        # Parse JSON array string
        try:
            s3_keys_list = json.loads(s3_keys)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid JSON format for s3_keys: {s3_keys}"
            )
        
        if not isinstance(s3_keys_list, list) or len(s3_keys_list) == 0:
            raise HTTPException(
                status_code=400,
                detail="s3_keys must be a non-empty JSON array"
            )
        
        print(f"🔄 Processing {len(s3_keys_list)} images from S3 bucket: {bucket_name}")
        
        # Generate embeddings from S3 keys
        embeddings = await model.generate_embeddings_from_s3_keys(
            s3_keys=s3_keys_list,
            bucket_name=bucket_name,
            region=region
        )
        
        return JSONResponse({
            "success": True,
            "embeddings": embeddings,
            "count": len(embeddings),
            "dimension": len(embeddings[0]) if embeddings else 512,
            "normalized": True
        })
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error generating embeddings from S3: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"S3 embedding generation failed: {str(e)}"
        )

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Image Embedding & Search API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "embed": "/embed (POST) - Generate embedding for single image",
            "embed/batch": "/embed/batch (POST) - Generate embeddings for multiple images (FAST BATCH)",
            "embed/s3-batch": "/embed/s3-batch (POST) - Generate embeddings from S3 keys (FASTEST - Direct S3 access)",
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

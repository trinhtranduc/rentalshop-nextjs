"""
FastAPI CLIP embedding service (ONNX).

This process only encodes images. Qdrant search and Postgres product fetch
run in the Node API so this service never opens DATABASE_URL.
"""

from __future__ import annotations

import json
import os
from contextlib import asynccontextmanager
from typing import Optional

import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.models import EmbeddingModel

model: Optional[EmbeddingModel] = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global model
    print("🔄 Loading CLIP ONNX model...")
    model = EmbeddingModel()
    await model.load()
    print("✅ Model loaded successfully")
    yield
    model = None


app = FastAPI(
    title="Image Embedding API",
    description="Generate CLIP ViT-B/32 embeddings (512-dim). Search is handled by the Node API.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _require_model() -> EmbeddingModel:
    if model is None or not model.is_loaded():
        raise HTTPException(status_code=503, detail="Model not loaded")
    return model


def _is_image_upload(file: UploadFile) -> bool:
    if not file.content_type:
        return True
    return (
        file.content_type.startswith("image/")
        or file.content_type in ("application/octet-stream", "binary/octet-stream")
    )


@app.get("/health")
async def health_check():
    return {
        "status": "healthy" if model is not None and model.is_loaded() else "starting",
        "model_loaded": model is not None and model.is_loaded(),
        "backend": "onnxruntime",
        "dimension": 512,
    }


@app.post("/embed")
async def generate_embedding(file: UploadFile = File(...)):
    try:
        if not _is_image_upload(file):
            raise HTTPException(status_code=400, detail="Invalid file type. Expected image file.")

        image_bytes = await file.read()
        if len(image_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty file")

        embedding = await _require_model().generate_embedding(image_bytes)
        return JSONResponse({
            "success": True,
            "embedding": embedding,
            "dimension": len(embedding),
            "normalized": True,
        })
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error generating embedding: {e}")
        raise HTTPException(status_code=500, detail=f"Embedding generation failed: {str(e)}")


@app.post("/embed/batch")
async def generate_embeddings_batch(files: list[UploadFile] = File(...)):
    try:
        if not files:
            raise HTTPException(status_code=400, detail="No files provided")

        image_bytes_list = []
        for file in files:
            if not _is_image_upload(file):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid file type: {file.filename}. Expected image file.",
                )
            image_bytes = await file.read()
            if len(image_bytes) == 0:
                raise HTTPException(status_code=400, detail=f"Empty file: {file.filename}")
            image_bytes_list.append(image_bytes)

        embeddings = await _require_model().generate_embeddings_batch(image_bytes_list)
        return JSONResponse({
            "success": True,
            "embeddings": embeddings,
            "count": len(embeddings),
            "dimension": len(embeddings[0]) if embeddings else 512,
            "normalized": True,
        })
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error generating batch embeddings: {e}")
        raise HTTPException(status_code=500, detail=f"Batch embedding generation failed: {str(e)}")


@app.post("/embed/s3-batch")
async def generate_embeddings_from_s3(
    s3_keys: str = Form(...),
    bucket_name: str = Form(...),
    region: str = Form("ap-southeast-1"),
    aws_access_key_id: str = Form(...),
    aws_secret_access_key: str = Form(...),
):
    try:
        try:
            s3_keys_list = json.loads(s3_keys)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail=f"Invalid JSON format for s3_keys: {s3_keys}")

        if not isinstance(s3_keys_list, list) or len(s3_keys_list) == 0:
            raise HTTPException(status_code=400, detail="s3_keys must be a non-empty JSON array")

        print(f"🔄 Processing {len(s3_keys_list)} images from S3 bucket: {bucket_name}")
        embeddings = await _require_model().generate_embeddings_from_s3_keys(
            s3_keys=s3_keys_list,
            bucket_name=bucket_name,
            region=region,
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key,
        )
        return JSONResponse({
            "success": True,
            "embeddings": embeddings,
            "count": len(embeddings),
            "dimension": len(embeddings[0]) if embeddings else 512,
            "normalized": True,
        })
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error generating embeddings from S3: {e}")
        raise HTTPException(status_code=500, detail=f"S3 embedding generation failed: {str(e)}")


@app.post("/search")
async def search_removed():
    raise HTTPException(
        status_code=410,
        detail="Python /search is removed. The Node API embeds via /embed then searches Qdrant.",
    )


@app.get("/")
async def root():
    return {
        "service": "Image Embedding API",
        "version": "2.0.0",
        "backend": "onnxruntime",
        "endpoints": {
            "health": "/health",
            "embed": "/embed (POST)",
            "embed/batch": "/embed/batch (POST)",
            "embed/s3-batch": "/embed/s3-batch (POST)",
        },
    }


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=False, workers=1)

FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    OMP_NUM_THREADS=1 \
    OPENBLAS_NUM_THREADS=1 \
    MKL_NUM_THREADS=1 \
    ORT_INTRA_OP_NUM_THREADS=1 \
    CLIP_ONNX_PATH=/models/clip-vit-base-patch32/onnx/vision_model.onnx \
    HF_HOME=/models/.cache

# libgomp is required by ONNX Runtime on slim images
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Build context is the Git repo root (Railway Dockerfile Path =
# /python-embedding-service/Dockerfile). COPY paths are from repo root.
COPY python-embedding-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Bake CLIP ViT-B/32 vision ONNX (fp32, 512-dim image_embeds) into the image
# so cold start does not download ~350MB at runtime.
RUN python -c "from huggingface_hub import hf_hub_download; hf_hub_download(repo_id='Xenova/clip-vit-base-patch32', filename='onnx/vision_model.onnx', local_dir='/models/clip-vit-base-patch32')"

COPY python-embedding-service/app/ ./app/

EXPOSE 8080

# Single worker: 1 vCPU. Model is loaded once in this process.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1"]

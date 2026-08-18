# Image Embedding API (ONNX CLIP)

Server-only CLIP ViT-B/32 embeddings. This service does **not** search Qdrant or open Postgres.

- Model: `Xenova/clip-vit-base-patch32` `onnx/vision_model.onnx`
- Output: 512-dim L2-normalized `image_embeds`
- Runtime: ONNX Runtime fp32, `OMP_NUM_THREADS=1`

## Endpoints

- `GET /health`
- `POST /embed`
- `POST /embed/batch`
- `POST /embed/s3-batch`

`POST /search` returns 410 — search is orchestrated by the Node API.

## Railway

- Root directory: `python-embedding-service`
- RAM: **1GB**
- No public domain. Node calls it over the private network.
- Threads: baked into the Dockerfile (`OMP_NUM_THREADS=1`).

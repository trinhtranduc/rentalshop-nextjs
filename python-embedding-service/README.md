# Image Embedding API (ONNX CLIP)

Server-only CLIP embeddings. This service does **not** search Qdrant or open Postgres.

- Model (`CLIP_MODEL`, #1087): `openai` (default) = `Xenova/clip-vit-base-patch32`,
  `marqo-fashionclip` = `Marqo/marqo-fashionCLIP` (fashion, ViT-B/16, ~3–4× slower on CPU), both
  `onnx/vision_model.onnx`. Railway passes the variable to the Dockerfile `ARG`, which bakes that model.
  `GET /health` returns `model`. Vectors of two models do not match: switch the API's
  `QDRANT_COLLECTION_ENV` to a new collection and re-index when the model changes.
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

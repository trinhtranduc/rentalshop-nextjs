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

## Usage

```bash
# Test health
curl http://localhost:8000/health

# Test embedding
curl -X POST http://localhost:8000/embed \
  -F "file=@test-image.jpg"
```

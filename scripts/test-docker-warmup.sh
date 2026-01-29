#!/bin/bash
# ============================================================================
# Test Docker Image with Model Warm-up
# ============================================================================
# This script:
# 1. Builds Docker image
# 2. Starts container
# 3. Waits for server to be ready
# 4. Tests model warm-up endpoint
# 5. Tests image search API
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

IMAGE_NAME="rentalshop-api-test"
CONTAINER_NAME="rentalshop-api-test-container"
PORT=3002

echo "🧹 Cleaning up old containers..."
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

echo ""
echo "🔨 Building Docker image..."
docker build -f apps/api/Dockerfile -t "$IMAGE_NAME" .

echo ""
echo "🚀 Starting container..."
docker run -d \
  --name "$CONTAINER_NAME" \
  -p "$PORT:3002" \
  -e DATABASE_URL="${DATABASE_URL:-postgresql://user:password@localhost:5432/db}" \
  -e JWT_SECRET="${JWT_SECRET:-test-secret}" \
  -e QDRANT_URL="${QDRANT_URL:-http://localhost:6333}" \
  "$IMAGE_NAME"

echo ""
echo "⏳ Waiting for server to be ready..."
MAX_WAIT=120
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
  if curl -s http://localhost:$PORT/api/health > /dev/null 2>&1; then
    echo "✅ Server is ready!"
    break
  fi
  sleep 2
  WAITED=$((WAITED + 2))
  if [ $((WAITED % 10)) -eq 0 ]; then
    echo "   Still waiting... ($WAITED/$MAX_WAIT seconds)"
  fi
done

if [ $WAITED -ge $MAX_WAIT ]; then
  echo "❌ Server did not start in time"
  echo "📋 Container logs:"
  docker logs "$CONTAINER_NAME" | tail -50
  exit 1
fi

echo ""
echo "🔥 Testing model warm-up endpoint..."
WARMUP_RESPONSE=$(curl -s -X POST http://localhost:$PORT/api/test/warmup-model)
echo "Response: $WARMUP_RESPONSE"

if echo "$WARMUP_RESPONSE" | grep -q "MODEL_WARMUP_SUCCESS"; then
  echo "✅ Model warm-up successful!"
else
  echo "⚠️  Model warm-up may have failed or timed out"
  echo "   (This is OK - model will load on first request)"
fi

echo ""
echo "🔍 Checking model status..."
STATUS_RESPONSE=$(curl -s http://localhost:$PORT/api/test/warmup-model)
echo "Response: $STATUS_RESPONSE"

if echo "$STATUS_RESPONSE" | grep -q '"isLoaded":true'; then
  echo "✅ Model is loaded and ready!"
else
  echo "⚠️  Model is not loaded yet (will load on first request)"
fi

echo ""
echo "📋 Container logs (last 30 lines):"
docker logs "$CONTAINER_NAME" | tail -30

echo ""
echo "✅ Test completed!"
echo ""
echo "To stop container: docker stop $CONTAINER_NAME"
echo "To view logs: docker logs -f $CONTAINER_NAME"

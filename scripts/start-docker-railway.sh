#!/bin/bash
# ============================================================================
# Start Docker Container (Simulating Railway Environment)
# ============================================================================
# This script starts a Docker container exactly as it would run on Railway
# Usage: ./scripts/start-docker-railway.sh
# ============================================================================

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
API_PORT=3002
CONTAINER_NAME="rentalshop-api-railway"
IMAGE_NAME="${IMAGE_NAME:-rentalshop-api-test-local}"

echo -e "${BLUE}🚀 Starting Docker Container (Railway Simulation)${NC}"
echo "============================================================"
echo ""

# Step 1: Check if image exists
echo -e "${BLUE}📦 Step 1: Checking Docker image...${NC}"
if ! docker image inspect "${IMAGE_NAME}" > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Image ${IMAGE_NAME} not found${NC}"
  echo "   Available images:"
  docker images | grep -E "(anyrent-api|rentalshop-api)" | head -5 || echo "   No images found"
  echo ""
  echo -e "${YELLOW}   Building new image...${NC}"
  if ! docker build -t "${IMAGE_NAME}" -f apps/api/Dockerfile .; then
    echo -e "${RED}❌ Docker build failed!${NC}"
    exit 1
  fi
  echo -e "${GREEN}✅ Image built successfully${NC}"
else
  echo -e "${GREEN}✅ Image found: ${IMAGE_NAME}${NC}"
fi
echo ""

# Step 2: Stop and remove old container
echo -e "${BLUE}🧹 Step 2: Cleaning up old container...${NC}"
docker stop "${CONTAINER_NAME}" > /dev/null 2>&1 || true
docker rm "${CONTAINER_NAME}" > /dev/null 2>&1 || true
echo -e "${GREEN}✅ Cleanup completed${NC}"
echo ""

# Step 3: Start container (Railway-like configuration)
echo -e "${BLUE}🚀 Step 3: Starting container (Railway configuration)...${NC}"
echo "   Port: ${API_PORT}"
echo "   Environment: Production (Alpine Linux)"
echo "   ML Model: WebAssembly mode (no onnxruntime-node)"
echo ""

docker run -d \
  --name "${CONTAINER_NAME}" \
  -p "${API_PORT}:${API_PORT}" \
  -e NODE_ENV=production \
  -e DATABASE_URL="${DATABASE_URL:-postgresql://user:password@host:port/database}" \
  -e JWT_SECRET="${JWT_SECRET:-supersecretjwtkeythatisatleast32characterslong}" \
  -e QDRANT_URL="${QDRANT_URL:-http://localhost:6333}" \
  -e QDRANT_API_KEY="${QDRANT_API_KEY:-}" \
  -e NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}" \
  -e NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-http://localhost:${API_PORT}}" \
  -e USE_ONNXRUNTIME=false \
  -e USE_BROWSER=true \
  -e ONNXRUNTIME_NODE_DISABLE=true \
  "${IMAGE_NAME}"

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to start container!${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Container started: ${CONTAINER_NAME}${NC}"
echo ""

# Step 4: Wait for server to be ready
echo -e "${BLUE}⏳ Step 4: Waiting for server to be ready...${NC}"
MAX_WAIT=180
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
  if curl -s -f "http://localhost:${API_PORT}/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is ready!${NC}"
    break
  fi
  sleep 2
  WAITED=$((WAITED + 2))
  if [ $((WAITED % 10)) -eq 0 ]; then
    echo "   Still waiting... ($WAITED/$MAX_WAIT seconds)"
  fi
done

if [ $WAITED -ge $MAX_WAIT ]; then
  echo -e "${YELLOW}⚠️  Server did not start in time${NC}"
  echo -e "${YELLOW}📋 Container logs:${NC}"
  docker logs "${CONTAINER_NAME}" | tail -50
  echo ""
  echo -e "${YELLOW}   Container is running but server may need more time${NC}"
  echo -e "${YELLOW}   Check logs: docker logs ${CONTAINER_NAME}${NC}"
  exit 0
fi

echo ""
echo -e "${GREEN}✅ Container is running and server is ready!${NC}"
echo ""
echo -e "${BLUE}📋 Container Information:${NC}"
echo "   Name: ${CONTAINER_NAME}"
echo "   Image: ${IMAGE_NAME}"
echo "   Port: http://localhost:${API_PORT}"
echo "   Health: http://localhost:${API_PORT}/api/health"
echo ""
echo -e "${BLUE}🔧 Useful Commands:${NC}"
echo "   View logs: docker logs -f ${CONTAINER_NAME}"
echo "   Stop: docker stop ${CONTAINER_NAME}"
echo "   Remove: docker rm ${CONTAINER_NAME}"
echo "   Shell: docker exec -it ${CONTAINER_NAME} sh"
echo ""
echo -e "${GREEN}✅ Ready to test API!${NC}"
echo "   Run: ./scripts/test-search-by-image-api.sh"

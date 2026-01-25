#!/bin/bash

# Test Docker build và run ở local với Linux (Alpine) để reproduce Railway issue
# Usage: ./scripts/test-docker-linux.sh

set -e

echo "🐳 Testing Docker Build and Run Locally (Linux/Alpine)..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Build Docker image
echo -e "${BLUE}Step 1: Building Docker image (Alpine Linux)...${NC}"
cd "$(dirname "$0")/.."

IMAGE_NAME="anyrent-api:linux-test"
CONTAINER_NAME="anyrent-api-linux-test-$(date +%s)"

# Build with progress output
docker build \
  -f apps/api/Dockerfile \
  -t $IMAGE_NAME \
  --progress=plain \
  . 2>&1 | tee /tmp/docker-build-linux.log

if [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo -e "${RED}❌ Docker build failed!${NC}"
  echo "Check /tmp/docker-build-linux.log for details"
  exit 1
fi

echo -e "${GREEN}✅ Docker build successful!${NC}"
echo ""

# Step 2: Run container in background
echo -e "${BLUE}Step 2: Starting container (Alpine Linux)...${NC}"

# Stop and remove existing container if any
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# Run container with Linux environment variables
docker run -d \
  --name $CONTAINER_NAME \
  -p 3002:3002 \
  -e USE_ONNXRUNTIME=false \
  -e USE_BROWSER=true \
  -e ONNXRUNTIME_NODE_DISABLE=true \
  -e NODE_ENV=production \
  $IMAGE_NAME

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to start container!${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Container started!${NC}"
echo "   Container: $CONTAINER_NAME"
echo "   Platform: Linux (Alpine)"
echo "   URL: http://localhost:3002"
echo ""

# Step 3: Wait for server to be ready
echo -e "${BLUE}Step 3: Waiting for server to be ready...${NC}"
MAX_WAIT=90
WAIT_COUNT=0

while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
  if curl -s http://localhost:3002/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is ready!${NC}"
    break
  fi
  
  WAIT_COUNT=$((WAIT_COUNT + 1))
  echo -n "."
  sleep 1
done

if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
  echo -e "\n${RED}❌ Server did not start within $MAX_WAIT seconds${NC}"
  echo "Container logs:"
  docker logs $CONTAINER_NAME --tail 100
  docker stop $CONTAINER_NAME
  docker rm $CONTAINER_NAME
  exit 1
fi

echo ""

# Step 4: Test image search endpoint
echo -e "${BLUE}Step 4: Testing image search endpoint (reproducing Railway issue)...${NC}"

# Check if test image exists
TEST_IMAGE="./image-test-input/IMG_8298 2.JPG"
if [ ! -f "$TEST_IMAGE" ]; then
  echo -e "${YELLOW}⚠️  Test image not found: $TEST_IMAGE${NC}"
  echo "   Creating a simple test..."
  
  # Try to test with a simple curl to see if endpoint responds
  echo "   Testing endpoint availability..."
  RESPONSE=$(curl -s -X POST http://localhost:3002/api/products/searchByImage \
    -H "Content-Type: multipart/form-data" \
    -F "image=@/dev/null" \
    -F "minSimilarity=0.5" \
    -F "limit=5" 2>&1 || echo "ERROR")
  
  if echo "$RESPONSE" | grep -q "SERVICE_UNAVAILABLE\|ERR_DLOPEN_FAILED\|Cannot read properties"; then
    echo -e "${RED}❌ Image search failed with expected error (reproduced Railway issue)${NC}"
    echo "   Response: $(echo $RESPONSE | head -c 500)"
  else
    echo -e "${YELLOW}⚠️  Unexpected response${NC}"
    echo "   Response: $(echo $RESPONSE | head -c 500)"
  fi
else
  echo "   Testing with: $TEST_IMAGE"
  
  # Test image search directly (without auth for now, just to see the error)
  echo "   Sending image search request..."
  
  RESPONSE=$(curl -s -X POST http://localhost:3002/api/products/searchByImage \
    -F "image=@$TEST_IMAGE" \
    -F "minSimilarity=0.5" \
    -F "limit=5" 2>&1)
  
  if echo "$RESPONSE" | grep -q "SERVICE_UNAVAILABLE\|ERR_DLOPEN_FAILED\|Cannot read properties"; then
    echo -e "${RED}❌ Image search failed (reproduced Railway issue)${NC}"
    echo "   Error type: $(echo $RESPONSE | grep -o 'SERVICE_UNAVAILABLE\|ERR_DLOPEN_FAILED\|Cannot read properties' | head -1)"
    echo "   Response: $(echo $RESPONSE | head -c 500)"
  elif echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Image search test passed!${NC}"
    echo "   Response: $(echo $RESPONSE | head -c 200)..."
  else
    echo -e "${YELLOW}⚠️  Unexpected response${NC}"
    echo "   Response: $(echo $RESPONSE | head -c 500)"
  fi
fi

echo ""

# Step 5: Show container logs (focus on image embedding errors)
echo -e "${BLUE}Step 5: Container logs (focusing on image embedding)...${NC}"
echo -e "${YELLOW}--- Last 50 lines of logs ---${NC}"
docker logs $CONTAINER_NAME --tail 50 | grep -E "(onnxruntime|WebAssembly|transformers|embedding|ERR_DLOPEN|Cannot read properties)" || docker logs $CONTAINER_NAME --tail 50
echo ""

# Step 6: Check platform info
echo -e "${BLUE}Step 6: Platform information...${NC}"
docker exec $CONTAINER_NAME sh -c "echo 'Platform:' && uname -a && echo '' && echo 'Node version:' && node --version && echo '' && echo 'Environment:' && env | grep -E '(USE_|ONNX|BROWSER)' || true"
echo ""

# Step 7: Check if onnxruntime-node exists
echo -e "${BLUE}Step 7: Checking onnxruntime-node module...${NC}"
docker exec $CONTAINER_NAME sh -c "if [ -d 'node_modules/onnxruntime-node' ]; then echo '⚠️  onnxruntime-node directory exists'; cat node_modules/onnxruntime-node/index.js 2>/dev/null | head -5 || echo '  (no index.js)'; else echo '✅ onnxruntime-node directory not found (good)'; fi"
echo ""

# Step 8: Cleanup option
echo -e "${BLUE}Step 8: Cleanup${NC}"
echo "Container is still running. You can:"
echo "  - View all logs: docker logs -f $CONTAINER_NAME"
echo "  - View error logs: docker logs $CONTAINER_NAME | grep -E '(error|Error|ERROR|onnxruntime)'"
echo "  - Stop: docker stop $CONTAINER_NAME"
echo "  - Remove: docker rm $CONTAINER_NAME"
echo ""
echo -e "${GREEN}✅ Test completed!${NC}"
echo ""
echo "This test reproduces the Railway issue in local Docker (Alpine Linux)."
echo "If you see 'Cannot read properties of undefined (reading create)',"
echo "it means @xenova/transformers is still trying to use onnxruntime-node."

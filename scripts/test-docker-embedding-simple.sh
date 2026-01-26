#!/bin/bash

# Test embedding generation trong Docker container via Next.js API
# Test này verify WASM backend và embedding generation hoạt động qua Next.js API route
# Usage: ./scripts/test-docker-embedding-simple.sh

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CONTAINER_NAME="anyrent-api-test-embedding"
IMAGE_NAME="anyrent-api:local-test"

echo -e "${BLUE}🐳 Testing Embedding Generation in Docker via Next.js API${NC}"
echo "   This tests WASM backend and embedding generation through Next.js"
echo "   Uses /api/test/embedding endpoint"
echo ""

# Step 1: Rebuild Docker image với code mới
echo -e "${BLUE}Step 1: Rebuilding Docker image with latest code...${NC}"
echo "   This ensures latest code changes are included"
echo "   This may take 5-10 minutes..."
echo ""

docker build \
  -f apps/api/Dockerfile \
  -t $IMAGE_NAME \
  --progress=plain \
  . 2>&1 | tee /tmp/docker-build-embedding.log

if [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo -e "${RED}❌ Docker build failed!${NC}"
  echo "   Check /tmp/docker-build-embedding.log for details"
  exit 1
fi

echo -e "${GREEN}✅ Docker build successful!${NC}"
echo ""

# Step 2: Cleanup
echo -e "${BLUE}Step 2: Cleaning up old container...${NC}"
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true
echo -e "${GREEN}✅ Cleanup done${NC}"
echo ""

# Step 3: Check test image
echo -e "${BLUE}Step 3: Checking test image...${NC}"
TEST_IMAGE="./image-test-input/IMG_8298 2.JPG"
if [ ! -f "$TEST_IMAGE" ]; then
  TEST_IMAGE=$(find ./test-images -type f \( -name "*.jpg" -o -name "*.JPG" -o -name "*.png" -o -name "*.PNG" \) | head -1)
  if [ -z "$TEST_IMAGE" ]; then
    echo -e "${RED}❌ No test images found${NC}"
    exit 1
  fi
fi
echo -e "${GREEN}✅ Test image found: $TEST_IMAGE${NC}"
echo ""

# Step 4: Start container with Next.js server
echo -e "${BLUE}Step 4: Starting container with Next.js server...${NC}"
docker run -d \
  --name $CONTAINER_NAME \
  -p 3002:3000 \
  -e USE_ONNXRUNTIME=false \
  -e USE_BROWSER=true \
  -e ONNXRUNTIME_NODE_DISABLE=true \
  -e NODE_ENV=production \
  -e PORT=3000 \
  $IMAGE_NAME \
  sh -c "cd /app/apps/api && ./start.sh"

echo -e "${GREEN}✅ Container started${NC}"
echo ""

# Step 5: Wait for server to be ready
echo -e "${BLUE}Step 5: Waiting for Next.js server to start...${NC}"
MAX_WAIT=60
WAIT_COUNT=0
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
  if curl -s http://localhost:3002/api/test/embedding >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is ready!${NC}"
    break
  fi
  WAIT_COUNT=$((WAIT_COUNT + 1))
  echo "   Waiting... ($WAIT_COUNT/$MAX_WAIT)"
  sleep 1
done

if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
  echo -e "${RED}❌ Server did not start in time${NC}"
  echo "   Container logs:"
  docker logs $CONTAINER_NAME --tail 50
  exit 1
fi

echo ""

# Step 6: Test GET endpoint (service initialization)
echo -e "${BLUE}Step 6: Testing GET /api/test/embedding (service initialization)...${NC}"
GET_RESPONSE=$(curl -s http://localhost:3002/api/test/embedding 2>&1)
echo "$GET_RESPONSE" | head -20

if echo "$GET_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ GET endpoint test passed${NC}"
else
  echo -e "${RED}❌ GET endpoint test failed${NC}"
  TEST_EXIT_CODE=1
fi

echo ""

# Step 7: Test POST endpoint (embedding generation)
echo -e "${BLUE}Step 7: Testing POST /api/test/embedding (embedding generation)...${NC}"
echo "   This will test WASM backend initialization"
echo "   Expected time: 30-90 seconds"
echo ""

POST_RESPONSE=$(curl -s -X POST \
  -F "image=@$TEST_IMAGE" \
  http://localhost:3002/api/test/embedding 2>&1)

echo "$POST_RESPONSE" | head -50

if echo "$POST_RESPONSE" | grep -q '"success":true'; then
  TEST_EXIT_CODE=0
  echo -e "${GREEN}✅ POST endpoint test passed${NC}"
else
  TEST_EXIT_CODE=1
  echo -e "${RED}❌ POST endpoint test failed${NC}"
fi

echo ""

# Step 8: Results
if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ Test PASSED!${NC}"
  echo ""
  echo "   Summary:"
  echo "   - Docker container: ✅ Running"
  echo "   - Next.js server: ✅ Running"
  echo "   - Embedding service: ✅ Initialized"
  echo "   - WASM backend: ✅ Working"
  echo "   - Embedding generation: ✅ Working"
  echo ""
  echo -e "${GREEN}✅ Ready to commit and push to Railway!${NC}"
else
  echo -e "${RED}❌ Test FAILED!${NC}"
  echo ""
  echo -e "${BLUE}Full container logs:${NC}"
  docker logs $CONTAINER_NAME
  echo ""
  echo -e "${RED}Please fix issues before committing to Railway${NC}"
fi

# Step 9: Cleanup
echo ""
echo -e "${BLUE}Step 9: Cleanup${NC}"
echo "   Container: $CONTAINER_NAME"
echo "   To stop: docker stop $CONTAINER_NAME"
echo "   To remove: docker rm $CONTAINER_NAME"
echo "   To view logs: docker logs $CONTAINER_NAME -f"

exit ${TEST_EXIT_CODE:-1}

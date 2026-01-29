#!/bin/bash

# Test Docker với port tùy chỉnh để tránh conflict với dev server
# Usage: ./scripts/test-docker-port.sh [port]

set -e

PORT=${1:-3003}
CONTAINER_NAME="anyrent-api-test-port-$PORT"
IMAGE_NAME="anyrent-api:local-test"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 Testing Docker Image (Port $PORT)${NC}"
echo ""

# Step 1: Stop and remove old container if exists
echo -e "${BLUE}Step 1: Cleaning up old container...${NC}"
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true
echo -e "${GREEN}✅ Cleanup done${NC}"
echo ""

# Step 2: Check if image exists
echo -e "${BLUE}Step 2: Checking Docker image...${NC}"
if ! docker image inspect $IMAGE_NAME >/dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Image not found. Building...${NC}"
  ./scripts/test-docker-build.sh
fi
echo -e "${GREEN}✅ Image ready${NC}"
echo ""

# Step 3: Create env file
echo -e "${BLUE}Step 3: Creating environment file...${NC}"
ENV_FILE="/tmp/test-env-$PORT"
cat > $ENV_FILE << EOF
NODE_ENV=production
DATABASE_URL=postgresql://test:test@localhost:5432/test?schema=public
JWT_SECRET=test-secret-for-local-testing-only
NEXTAUTH_SECRET=test-secret-for-local-testing-only
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
USE_ONNXRUNTIME=false
USE_BROWSER=true
ONNXRUNTIME_NODE_DISABLE=true
EOF
echo -e "${GREEN}✅ Environment file created${NC}"
echo ""

# Step 4: Start container
echo -e "${BLUE}Step 4: Starting container on port $PORT...${NC}"
docker run -d \
  --name $CONTAINER_NAME \
  -p $PORT:3002 \
  --env-file $ENV_FILE \
  -e USE_ONNXRUNTIME=false \
  -e USE_BROWSER=true \
  -e ONNXRUNTIME_NODE_DISABLE=true \
  $IMAGE_NAME

echo -e "${GREEN}✅ Container started${NC}"
echo ""

# Step 5: Wait for server to be ready
echo -e "${BLUE}Step 5: Waiting for server to be ready...${NC}"
MAX_WAIT=60
WAIT_TIME=0
while [ $WAIT_TIME -lt $MAX_WAIT ]; do
  if curl -s http://localhost:$PORT/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is ready!${NC}"
    break
  fi
  echo -n "."
  sleep 2
  WAIT_TIME=$((WAIT_TIME + 2))
done

if [ $WAIT_TIME -ge $MAX_WAIT ]; then
  echo -e "${RED}❌ Server did not start in time${NC}"
  echo "   Check logs: docker logs $CONTAINER_NAME"
  exit 1
fi

echo ""

# Step 6: Test image search
echo -e "${BLUE}Step 6: Testing image search...${NC}"
TEST_IMAGE="./image-test-input/IMG_8298 2.JPG"

if [ ! -f "$TEST_IMAGE" ]; then
  echo -e "${YELLOW}⚠️  Test image not found: $TEST_IMAGE${NC}"
  echo "   Skipping image search test"
else
  # Login
  echo "   Logging in..."
  LOGIN_RESPONSE=$(curl -s -X POST http://localhost:$PORT/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@rentalshop.com","password":"admin123"}' 2>&1)
  
  TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  
  if [ -z "$TOKEN" ]; then
    echo -e "${YELLOW}⚠️  Could not get token${NC}"
    echo "   Login response: $LOGIN_RESPONSE"
  else
    echo "   Token obtained, testing image search..."
    
    # Test image search
    SEARCH_RESPONSE=$(curl -s -X POST http://localhost:$PORT/api/products/searchByImage \
      -H "Authorization: Bearer $TOKEN" \
      -F "image=@$TEST_IMAGE" \
      -F "minSimilarity=0.5" \
      -F "limit=5" 2>&1)
    
    if echo "$SEARCH_RESPONSE" | grep -q '"success":true'; then
      echo -e "${GREEN}✅ Image search test PASSED!${NC}"
      echo "   Response preview: $(echo $SEARCH_RESPONSE | head -c 200)..."
    elif echo "$SEARCH_RESPONSE" | grep -q "ERR_DLOPEN_FAILED\|SERVICE_UNAVAILABLE\|Cannot read properties of undefined"; then
      echo -e "${RED}❌ Image search FAILED with onnxruntime error${NC}"
      echo "   Response: $SEARCH_RESPONSE"
      echo ""
      echo "   This means onnxruntime-node is still being loaded"
      echo "   Check logs: docker logs $CONTAINER_NAME"
    else
      echo -e "${YELLOW}⚠️  Image search returned unexpected response${NC}"
      echo "   Response: $SEARCH_RESPONSE"
    fi
  fi
fi

echo ""

# Step 7: Show container info
echo -e "${BLUE}Step 7: Container Info${NC}"
echo "   Container: $CONTAINER_NAME"
echo "   Port: http://localhost:$PORT"
echo "   Logs: docker logs -f $CONTAINER_NAME"
echo "   Stop: docker stop $CONTAINER_NAME"
echo "   Remove: docker rm $CONTAINER_NAME"
echo ""

echo -e "${GREEN}✅ Test completed!${NC}"

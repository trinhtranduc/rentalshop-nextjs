#!/bin/bash

# Test Docker build và run ở local để verify trước khi deploy
# Usage: ./scripts/test-docker-full.sh

set -e

echo "🐳 Testing Docker Build and Run Locally..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Build Docker image
echo -e "${BLUE}Step 1: Building Docker image...${NC}"
cd "$(dirname "$0")/.."

IMAGE_NAME="anyrent-api:local-test"
CONTAINER_NAME="anyrent-api-test-$(date +%s)"

# Build with progress output
docker build \
  -f apps/api/Dockerfile \
  -t $IMAGE_NAME \
  --progress=plain \
  . 2>&1 | tee /tmp/docker-build.log

if [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo -e "${RED}❌ Docker build failed!${NC}"
  echo "Check /tmp/docker-build.log for details"
  exit 1
fi

echo -e "${GREEN}✅ Docker build successful!${NC}"
echo ""

# Step 2: Check if we have required env vars
echo -e "${BLUE}Step 2: Checking environment variables...${NC}"

if [ ! -f .env.local ] && [ ! -f .env.development ]; then
  echo -e "${YELLOW}⚠️  No .env.local or .env.development found${NC}"
  echo "   Creating minimal .env file for testing..."
  
  cat > /tmp/test-env << EOF
NODE_ENV=production
DATABASE_URL=postgresql://test:test@localhost:5432/test?schema=public
JWT_SECRET=test-secret-for-local-testing-only
NEXTAUTH_SECRET=test-secret-for-local-testing-only
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=
USE_ONNXRUNTIME=false
USE_BROWSER=false
ONNXRUNTIME_NODE_DISABLE=true
EOF
  ENV_FILE=/tmp/test-env
else
  # Use existing env file
  if [ -f .env.local ]; then
    ENV_FILE=.env.local
  else
    ENV_FILE=.env.development
  fi
  echo -e "${GREEN}✅ Using $ENV_FILE${NC}"
fi
echo ""

# Step 3: Run container in background
echo -e "${BLUE}Step 3: Starting container...${NC}"

# Stop and remove existing container if any
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

# Run container
docker run -d \
  --name $CONTAINER_NAME \
  -p 3002:3002 \
  --env-file $ENV_FILE \
  -e USE_ONNXRUNTIME=false \
  -e USE_BROWSER=false \
  -e ONNXRUNTIME_NODE_DISABLE=true \
  $IMAGE_NAME

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to start container!${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Container started!${NC}"
echo "   Container: $CONTAINER_NAME"
echo "   URL: http://localhost:3002"
echo ""

# Step 4: Wait for server to be ready
echo -e "${BLUE}Step 4: Waiting for server to be ready...${NC}"
MAX_WAIT=60
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
  docker logs $CONTAINER_NAME --tail 50
  docker stop $CONTAINER_NAME
  docker rm $CONTAINER_NAME
  exit 1
fi

echo ""

# Step 5: Test image search endpoint (if we have a test image)
echo -e "${BLUE}Step 5: Testing image search endpoint...${NC}"

# Check if test image exists
TEST_IMAGE="./image-test-input/IMG_8298 2.JPG"
if [ ! -f "$TEST_IMAGE" ]; then
  echo -e "${YELLOW}⚠️  Test image not found: $TEST_IMAGE${NC}"
  echo "   Skipping image search test"
else
  echo "   Testing with: $TEST_IMAGE"
  
  # First, we need to login to get a token
  echo "   Logging in to get token..."
  
  # Try to login (adjust credentials as needed)
  LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3002/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@rentalshop.com","password":"admin123"}' 2>&1)
  
  TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  
  if [ -z "$TOKEN" ]; then
    echo -e "${YELLOW}⚠️  Could not get token, skipping image search test${NC}"
    echo "   Login response: $LOGIN_RESPONSE"
  else
    echo "   Token obtained, testing image search..."
    
    # Test image search
    SEARCH_RESPONSE=$(curl -s -X POST http://localhost:3002/api/products/searchByImage \
      -H "Authorization: Bearer $TOKEN" \
      -F "image=@$TEST_IMAGE" \
      -F "minSimilarity=0.5" \
      -F "limit=5" 2>&1)
    
    if echo "$SEARCH_RESPONSE" | grep -q '"success":true'; then
      echo -e "${GREEN}✅ Image search test passed!${NC}"
      echo "   Response: $(echo $SEARCH_RESPONSE | head -c 200)..."
    elif echo "$SEARCH_RESPONSE" | grep -q "ERR_DLOPEN_FAILED\|SERVICE_UNAVAILABLE"; then
      echo -e "${RED}❌ Image search failed with ERR_DLOPEN_FAILED${NC}"
      echo "   This means onnxruntime-node is still being loaded"
      echo "   Response: $SEARCH_RESPONSE"
    else
      echo -e "${YELLOW}⚠️  Image search returned unexpected response${NC}"
      echo "   Response: $SEARCH_RESPONSE"
    fi
  fi
fi

echo ""

# Step 6: Show container logs
echo -e "${BLUE}Step 6: Container logs (last 30 lines)...${NC}"
docker logs $CONTAINER_NAME --tail 30
echo ""

# Step 7: Cleanup option
echo -e "${BLUE}Step 7: Cleanup${NC}"
echo "Container is still running. You can:"
echo "  - View logs: docker logs -f $CONTAINER_NAME"
echo "  - Stop: docker stop $CONTAINER_NAME"
echo "  - Remove: docker rm $CONTAINER_NAME"
echo ""
echo -e "${GREEN}✅ Test completed!${NC}"
echo ""
echo "To keep testing, container will stay running."
echo "To stop and remove: docker stop $CONTAINER_NAME && docker rm $CONTAINER_NAME"

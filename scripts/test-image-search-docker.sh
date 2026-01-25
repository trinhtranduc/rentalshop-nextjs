#!/bin/bash

# Quick test script để test image search trong Docker container
# Usage: ./scripts/test-image-search-docker.sh [container_name]

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CONTAINER_NAME=${1:-"anyrent-api-test"}

echo -e "${BLUE}🔍 Testing Image Search in Docker Container${NC}"
echo "   Container: $CONTAINER_NAME"
echo ""

# Check if container is running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo -e "${RED}❌ Container '$CONTAINER_NAME' is not running!${NC}"
  echo ""
  echo "To start container, run:"
  echo "  ./scripts/test-docker-full.sh"
  echo ""
  echo "Or manually:"
  echo "  docker run -d --name $CONTAINER_NAME -p 3002:3002 \\"
  echo "    -e USE_BROWSER=true \\"
  echo "    -e USE_ONNXRUNTIME=false \\"
  echo "    -e ONNXRUNTIME_NODE_DISABLE=true \\"
  echo "    --env-file .env.local \\"
  echo "    anyrent-api:local-test"
  exit 1
fi

echo -e "${GREEN}✅ Container is running${NC}"
echo ""

# Check if test image exists
TEST_IMAGE="./image-test-input/IMG_8298 2.JPG"
if [ ! -f "$TEST_IMAGE" ]; then
  echo -e "${YELLOW}⚠️  Test image not found: $TEST_IMAGE${NC}"
  echo "   Please provide an image path:"
  echo "   ./scripts/test-image-search-docker.sh $CONTAINER_NAME <image_path>"
  exit 1
fi

# Step 1: Login to get token
echo -e "${BLUE}Step 1: Logging in...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rentalshop.com","password":"admin123"}' 2>&1)

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4 || echo "")

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Could not get token${NC}"
  echo "   Login response: $LOGIN_RESPONSE"
  echo ""
  echo "   Check container logs:"
  echo "   docker logs $CONTAINER_NAME --tail 50"
  exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo ""

# Step 2: Test image search
echo -e "${BLUE}Step 2: Testing image search...${NC}"
echo "   Image: $TEST_IMAGE"
echo "   Endpoint: http://localhost:3002/api/products/searchByImage"
echo ""

SEARCH_RESPONSE=$(curl -s -X POST http://localhost:3002/api/products/searchByImage \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@$TEST_IMAGE" \
  -F "minSimilarity=0.5" \
  -F "limit=5" 2>&1)

# Check response
if echo "$SEARCH_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Image search test PASSED!${NC}"
  echo ""
  echo "Response preview:"
  echo "$SEARCH_RESPONSE" | head -c 500
  echo "..."
  echo ""
  
  # Extract product count
  PRODUCT_COUNT=$(echo "$SEARCH_RESPONSE" | grep -o '"total":[0-9]*' | cut -d':' -f2 || echo "0")
  echo "   Products found: $PRODUCT_COUNT"
  
elif echo "$SEARCH_RESPONSE" | grep -q "ERR_DLOPEN_FAILED\|SERVICE_UNAVAILABLE\|Cannot read properties of undefined"; then
  echo -e "${RED}❌ Image search FAILED with onnxruntime error${NC}"
  echo ""
  echo "Response:"
  echo "$SEARCH_RESPONSE" | head -c 1000
  echo ""
  echo ""
  echo "This means onnxruntime-node is still being loaded."
  echo "Check container logs:"
  echo "  docker logs $CONTAINER_NAME --tail 100 | grep -i onnxruntime"
  exit 1
  
elif echo "$SEARCH_RESPONSE" | grep -q "BUSINESS_RULE_VIOLATION"; then
  echo -e "${RED}❌ Image search FAILED with BUSINESS_RULE_VIOLATION${NC}"
  echo ""
  echo "Response:"
  echo "$SEARCH_RESPONSE"
  echo ""
  echo "This might be a subscription or permission issue."
  exit 1
  
else
  echo -e "${YELLOW}⚠️  Image search returned unexpected response${NC}"
  echo ""
  echo "Response:"
  echo "$SEARCH_RESPONSE" | head -c 1000
  echo ""
  exit 1
fi

echo ""
echo -e "${GREEN}✅ Test completed successfully!${NC}"
echo ""
echo "To view container logs:"
echo "  docker logs -f $CONTAINER_NAME"
echo ""
echo "To stop container:"
echo "  docker stop $CONTAINER_NAME && docker rm $CONTAINER_NAME"

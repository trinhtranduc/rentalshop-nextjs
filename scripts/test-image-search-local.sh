#!/bin/bash

# Quick test script để test image search với local dev server
# Usage: ./scripts/test-image-search-local.sh [image_path]

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get image path from argument or use default
IMAGE_PATH=${1:-"./image-test-input/IMG_8298 2.JPG"}
API_URL=${2:-"http://localhost:3002"}

echo -e "${BLUE}🔍 Testing Image Search (Local Dev Server)${NC}"
echo "   Image: $IMAGE_PATH"
echo "   API: $API_URL/api/products/searchByImage"
echo ""

# Check if image exists
if [ ! -f "$IMAGE_PATH" ]; then
  echo -e "${RED}❌ Image file not found: $IMAGE_PATH${NC}"
  echo ""
  echo "Usage:"
  echo "  ./scripts/test-image-search-local.sh [image_path] [api_url]"
  echo ""
  echo "Example:"
  echo "  ./scripts/test-image-search-local.sh './image-test-input/IMG_8298 2.JPG'"
  echo "  ./scripts/test-image-search-local.sh './test-images/image.jpg' 'http://localhost:3002'"
  exit 1
fi

# Check if API server is running
echo -e "${BLUE}Step 1: Checking if API server is running...${NC}"
if ! curl -s "$API_URL/api/health" > /dev/null 2>&1; then
  echo -e "${RED}❌ API server is not running at $API_URL${NC}"
  echo ""
  echo "Please start the API server first:"
  echo "  yarn dev:api"
  echo ""
  exit 1
fi

echo -e "${GREEN}✅ API server is running${NC}"
echo ""

# Step 2: Login to get token
echo -e "${BLUE}Step 2: Logging in...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rentalshop.com","password":"admin123"}' 2>&1)

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*' | cut -d'"' -f4 || echo "")

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Could not get token${NC}"
  echo "   Login response: $LOGIN_RESPONSE"
  echo ""
  echo "   Check if credentials are correct or server is running properly"
  exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo ""

# Step 3: Test image search
echo -e "${BLUE}Step 3: Testing image search...${NC}"
echo "   Uploading image..."

SEARCH_RESPONSE=$(curl -s -X POST "$API_URL/api/products/searchByImage" \
  -H "Authorization: Bearer $TOKEN" \
  -H "x-app-version: 1.0.0" \
  -H "x-client-platform: web" \
  -H "x-device-type: browser" \
  -F "image=@$IMAGE_PATH" \
  -F "minSimilarity=0.5" \
  -F "limit=5" \
  -w "\nHTTP_CODE:%{http_code}" 2>&1)

HTTP_CODE=$(echo "$SEARCH_RESPONSE" | grep -o "HTTP_CODE:[0-9]*" | cut -d':' -f2 || echo "")
RESPONSE_BODY=$(echo "$SEARCH_RESPONSE" | sed 's/HTTP_CODE:[0-9]*$//' || echo "$SEARCH_RESPONSE")

echo "   HTTP Status: $HTTP_CODE"
echo ""

# Check response
if [ "$HTTP_CODE" = "200" ] && echo "$RESPONSE_BODY" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Image search test PASSED!${NC}"
  echo ""
  echo "Response preview:"
  echo "$RESPONSE_BODY" | head -c 500
  echo "..."
  echo ""
  
  # Extract product count
  PRODUCT_COUNT=$(echo "$RESPONSE_BODY" | grep -o '"total":[0-9]*' | cut -d':' -f2 || echo "0")
  echo "   Products found: $PRODUCT_COUNT"
  
elif echo "$RESPONSE_BODY" | grep -q "ERR_DLOPEN_FAILED\|SERVICE_UNAVAILABLE\|Cannot read properties of undefined"; then
  echo -e "${RED}❌ Image search FAILED with onnxruntime error${NC}"
  echo ""
  echo "Response:"
  echo "$RESPONSE_BODY" | head -c 1000
  echo ""
  echo ""
  echo "This means onnxruntime-node is still being loaded."
  echo "Check server logs for details."
  exit 1
  
elif echo "$RESPONSE_BODY" | grep -q "BUSINESS_RULE_VIOLATION"; then
  echo -e "${RED}❌ Image search FAILED with BUSINESS_RULE_VIOLATION${NC}"
  echo ""
  echo "Response:"
  echo "$RESPONSE_BODY"
  echo ""
  echo "This might be a subscription or permission issue."
  exit 1
  
else
  echo -e "${YELLOW}⚠️  Image search returned unexpected response${NC}"
  echo ""
  echo "HTTP Status: $HTTP_CODE"
  echo "Response:"
  echo "$RESPONSE_BODY" | head -c 1000
  echo ""
  exit 1
fi

echo ""
echo -e "${GREEN}✅ Test completed successfully!${NC}"

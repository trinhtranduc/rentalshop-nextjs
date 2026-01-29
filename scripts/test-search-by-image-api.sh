#!/bin/bash
# ============================================================================
# Test Search By Image API
# ============================================================================
# This script tests the /api/products/searchByImage endpoint
# Usage: ./scripts/test-search-by-image-api.sh
# ============================================================================

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
API_URL="${API_URL:-http://localhost:3002}"
TEST_IMAGE="${TEST_IMAGE:-test-images/IMG_8281\ 2.JPG}"

echo -e "${BLUE}🧪 Testing Search By Image API${NC}"
echo "============================================================"
echo ""

# Step 1: Check if server is running
echo -e "${BLUE}⏳ Step 1: Checking if server is running...${NC}"
MAX_WAIT=60
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
  if curl -s -f "${API_URL}/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Server is running!${NC}"
    break
  fi
  sleep 2
  WAITED=$((WAITED + 2))
  if [ $((WAITED % 10)) -eq 0 ]; then
    echo "   Still waiting... ($WAITED/$MAX_WAIT seconds)"
  fi
done

if [ $WAITED -ge $MAX_WAIT ]; then
  echo -e "${RED}❌ Server is not running!${NC}"
  echo "   Please make sure the server is running on ${API_URL}"
  exit 1
fi
echo ""

# Step 2: Login to get token
echo -e "${BLUE}🔐 Step 2: Logging in...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin.outlet1@example.com",
    "password": "admin123"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4 || echo "")

if [ -z "$TOKEN" ]; then
  echo -e "${YELLOW}⚠️  Login failed${NC}"
  echo "   Response: $LOGIN_RESPONSE"
  echo ""
  echo -e "${YELLOW}⚠️  Continuing without token (may fail if auth required)${NC}"
  TOKEN=""
else
  echo -e "${GREEN}✅ Logged in successfully${NC}"
fi
echo ""

# Step 3: Test image search API
echo -e "${BLUE}🖼️  Step 3: Testing Search By Image API...${NC}"

if [ ! -f "$TEST_IMAGE" ]; then
  echo -e "${YELLOW}⚠️  Test image not found: $TEST_IMAGE${NC}"
  TEST_IMAGE=$(find ./test-images -type f \( -name "*.jpg" -o -name "*.JPG" -o -name "*.png" -o -name "*.PNG" \) | head -1)
  if [ -z "$TEST_IMAGE" ]; then
    echo -e "${RED}❌ No test images found${NC}"
    exit 1
  fi
  echo "   Using: $TEST_IMAGE"
fi

echo "   Testing with image: $TEST_IMAGE"
echo "   This may take 30-180 seconds for first request (model loading)..."
echo ""

SEARCH_START=$(date +%s)

if [ -n "$TOKEN" ]; then
  SEARCH_RESPONSE=$(curl -s -X POST "${API_URL}/api/products/searchByImage" \
    -H "Authorization: Bearer $TOKEN" \
    -F "image=@$TEST_IMAGE" \
    -F "limit=5" \
    -F "minSimilarity=0.5" \
    -w "\nHTTP_CODE:%{http_code}")
else
  SEARCH_RESPONSE=$(curl -s -X POST "${API_URL}/api/products/searchByImage" \
    -F "image=@$TEST_IMAGE" \
    -F "limit=5" \
    -F "minSimilarity=0.5" \
    -w "\nHTTP_CODE:%{http_code}")
fi

SEARCH_END=$(date +%s)
SEARCH_DURATION=$((SEARCH_END - SEARCH_START))

HTTP_CODE=$(echo "$SEARCH_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
RESPONSE_BODY=$(echo "$SEARCH_RESPONSE" | grep -v "HTTP_CODE")

echo "Response (took ${SEARCH_DURATION}s, HTTP $HTTP_CODE):"
echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

# Step 4: Analyze results
if [ "$HTTP_CODE" = "200" ]; then
  if echo "$RESPONSE_BODY" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ Search By Image API is working!${NC}"
    RESULTS_COUNT=$(echo "$RESPONSE_BODY" | jq '.data.results | length' 2>/dev/null || echo "0")
    echo "   Found $RESULTS_COUNT results"
    
    # Show first result details
    if [ "$RESULTS_COUNT" -gt 0 ]; then
      FIRST_RESULT=$(echo "$RESPONSE_BODY" | jq '.data.results[0]' 2>/dev/null || echo "")
      if [ -n "$FIRST_RESULT" ]; then
        PRODUCT_NAME=$(echo "$FIRST_RESULT" | jq -r '.name // .productName // "Unknown"' 2>/dev/null || echo "Unknown")
        SIMILARITY=$(echo "$FIRST_RESULT" | jq -r '.similarity // .score // "N/A"' 2>/dev/null || echo "N/A")
        echo "   First result: $PRODUCT_NAME (similarity: $SIMILARITY)"
      fi
    fi
  else
    echo -e "${YELLOW}⚠️  Response indicates failure${NC}"
    ERROR_MSG=$(echo "$RESPONSE_BODY" | jq -r '.error // .message // "Unknown error"' 2>/dev/null || echo "Unknown error")
    echo "   Error: $ERROR_MSG"
  fi
elif [ "$HTTP_CODE" = "503" ]; then
  echo -e "${YELLOW}⚠️  Service unavailable - model may still be loading${NC}"
  echo "   This is expected on first request"
  echo "   Try again in a few seconds"
elif [ "$HTTP_CODE" = "401" ]; then
  echo -e "${YELLOW}⚠️  Unauthorized - authentication required${NC}"
  echo "   Please check login credentials"
elif [ "$HTTP_CODE" = "500" ]; then
  echo -e "${RED}❌ Server error${NC}"
  ERROR_MSG=$(echo "$RESPONSE_BODY" | jq -r '.error // .message // "Unknown error"' 2>/dev/null || echo "Unknown error")
  echo "   Error: $ERROR_MSG"
else
  echo -e "${YELLOW}⚠️  Unexpected HTTP code: $HTTP_CODE${NC}"
fi

echo ""
echo -e "${BLUE}📝 Summary:${NC}"
echo "   - Server: ${API_URL}"
echo "   - Endpoint: /api/products/searchByImage"
echo "   - HTTP Code: $HTTP_CODE"
echo "   - Duration: ${SEARCH_DURATION}s"
echo ""

if [ "$HTTP_CODE" = "200" ] && echo "$RESPONSE_BODY" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ API Search By Image is working correctly!${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠️  API Search By Image needs attention${NC}"
  exit 1
fi

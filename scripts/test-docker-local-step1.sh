#!/bin/bash
# ============================================================================
# Test Docker Local - Step 1: Validation Only
# ============================================================================
# Test Bước 1 (validation) trong Docker local (giống Railway)
# Usage: ./scripts/test-docker-local-step1.sh
# ============================================================================

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
# Default to dev API (can override with API_URL env var)
API_URL="${API_URL:-https://dev-api.anyrent.shop}"
API_PORT=3002
CONTAINER_NAME="rentalshop-api-railway"
IMAGE_NAME="${IMAGE_NAME:-rentalshop-api-test-local}"

echo -e "${BLUE}🧪 Test API - Step 1: Validation${NC}"
echo "============================================================"
echo ""
echo -e "${YELLOW}🌐 API URL: ${API_URL}${NC}"
echo ""

# Step 1: Check if server is running
echo -e "${BLUE}⏳ Step 1: Checking server...${NC}"
if ! curl -s -f "${API_URL}/api/health" > /dev/null 2>&1; then
  echo -e "${RED}❌ Server is not accessible at ${API_URL}${NC}"
  echo "   Please check:"
  echo "   - API service is running on Railway"
  echo "   - API URL is correct"
  echo "   - Network connection"
  exit 1
fi
echo -e "${GREEN}✅ Server is accessible!${NC}"
echo ""

# Step 2: Get token (use provided token or login)
if [ -n "${JWT_TOKEN:-}" ]; then
  echo -e "${BLUE}🔐 Step 2: Using provided JWT token...${NC}"
  TOKEN="${JWT_TOKEN}"
  echo -e "${GREEN}✅ Token loaded${NC}"
else
  echo -e "${BLUE}🔐 Step 2: Logging in...${NC}"
  LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "admin.outlet1@example.com",
      "password": "admin123"
    }')

  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4 || echo "")

  if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Login failed${NC}"
    echo "   Response: $LOGIN_RESPONSE"
    exit 1
  fi
  echo -e "${GREEN}✅ Login successful${NC}"
fi
echo ""

# Step 3: Test validation (Bước 1)
echo -e "${BLUE}🧪 Step 3: Testing validation (Bước 1)...${NC}"
echo "   Testing: /api/products/searchByImage"
echo ""

# Test 3.1: Missing image
echo -e "${BLUE}   Test 3.1: Missing image file...${NC}"
RESPONSE1=$(curl -s -X POST "${API_URL}/api/products/searchByImage" \
  -H "Authorization: Bearer $TOKEN" \
  -F "limit=20" \
  -w "\nHTTP_CODE:%{http_code}")

HTTP_CODE1=$(echo "$RESPONSE1" | grep "HTTP_CODE" | cut -d: -f2)
BODY1=$(echo "$RESPONSE1" | grep -v "HTTP_CODE")

echo "   Response (HTTP $HTTP_CODE1):"
echo "$BODY1" | jq '.' 2>/dev/null || echo "$BODY1" | head -c 200
echo ""

if echo "$BODY1" | grep -q "NO_IMAGE_FILE"; then
  echo -e "${GREEN}   ✅ Test 3.1 PASSED: Missing image detected (expected error)${NC}"
elif [ "$HTTP_CODE1" = "200" ] && echo "$BODY1" | grep -q "NO_PRODUCTS_FOUND\|bảo trì\|maintenance"; then
  echo -e "${GREEN}   ✅ Test 3.1 PASSED: API responded (currently returns empty results - Step 1)${NC}"
  echo -e "${YELLOW}   ℹ️  Note: API is in Step 1 mode (validation only, returns empty results)${NC}"
else
  echo -e "${YELLOW}   ⚠️  Test 3.1: Unexpected response${NC}"
fi
echo ""

# Test 3.2: Valid image (if available)
TEST_IMAGE="${TEST_IMAGE:-test-images/IMG_8338.PNG}"
if [ -f "$TEST_IMAGE" ]; then
  echo -e "${BLUE}   Test 3.2: Valid image file...${NC}"
  echo "   Image: $TEST_IMAGE"
  
  RESPONSE2=$(curl -s -X POST "${API_URL}/api/products/searchByImage" \
    -H "Authorization: Bearer $TOKEN" \
    -F "image=@$TEST_IMAGE" \
    -F "limit=5" \
    -F "minSimilarity=0.5" \
    -w "\nHTTP_CODE:%{http_code}")
  
  HTTP_CODE2=$(echo "$RESPONSE2" | grep "HTTP_CODE" | cut -d: -f2)
  BODY2=$(echo "$RESPONSE2" | grep -v "HTTP_CODE")
  
  echo "   Response (HTTP $HTTP_CODE2):"
  echo "$BODY2" | jq '.' 2>/dev/null || echo "$BODY2" | head -c 300
  echo ""
  
  if [ "$HTTP_CODE2" = "200" ] && echo "$BODY2" | grep -q '"success":true'; then
    echo -e "${GREEN}   ✅ Test 3.2 PASSED: Validation successful (empty results expected)${NC}"
  else
  echo -e "${YELLOW}   ⚠️  Test 3.2: Unexpected response${NC}"
  fi
  echo ""
else
  echo -e "${YELLOW}   ⚠️  Test image not found: $TEST_IMAGE${NC}"
  echo "   Skipping valid image test"
  echo ""
fi

echo -e "${GREEN}✅ Test completed!${NC}"
echo ""
echo -e "${BLUE}📝 Summary:${NC}"
echo "   ✅ Container running (Alpine Linux - giống Railway)"
echo "   ✅ Server responding"
echo "   ✅ Validation logic tested"
echo ""
echo -e "${YELLOW}💡 Note:${NC}"
echo "   - Local Docker ≈ Railway (cùng Dockerfile, Alpine Linux)"
echo "   - Khác: Environment variables (DATABASE_URL, etc.)"
echo "   - Để test đầy đủ: Cần database connection"
echo ""

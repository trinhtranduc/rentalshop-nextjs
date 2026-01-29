#!/bin/bash
# ============================================================================
# Test Search By Image - Step 3: Embedding Generation
# ============================================================================
# Test Bước 3 (embedding generation) với error handling
# Usage: JWT_TOKEN='your-token' ./scripts/test-search-by-image-step3.sh
# ============================================================================

set -euo pipefail

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
API_URL="${API_URL:-https://dev-api.anyrent.shop}"
JWT_TOKEN="${JWT_TOKEN:-}"
TEST_IMAGE="${TEST_IMAGE:-test-images/IMG_8281 2.JPG}"

echo -e "${BLUE}🧪 Testing Search By Image - Step 3 (Embedding Generation)${NC}"
echo "============================================================"
echo ""
echo -e "${YELLOW}🌐 API URL: ${API_URL}${NC}"
echo ""

# Step 1: Check if server is accessible
echo -e "${BLUE}⏳ Step 1: Checking server...${NC}"
if ! curl -s -f "${API_URL}/api/health" > /dev/null 2>&1; then
  echo -e "${RED}❌ Server is not accessible at ${API_URL}${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Server is accessible!${NC}"
echo ""

# Step 2: Check JWT token
if [ -z "$JWT_TOKEN" ]; then
  echo -e "${YELLOW}⚠️  JWT_TOKEN not set${NC}"
  echo "   Usage: JWT_TOKEN='your-token' ./scripts/test-search-by-image-step3.sh"
  exit 1
fi
echo -e "${GREEN}✅ JWT token provided${NC}"
echo ""

# Step 3: Check test image
if [ ! -f "$TEST_IMAGE" ]; then
  echo -e "${RED}❌ Test image not found: $TEST_IMAGE${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Test image found: $TEST_IMAGE${NC}"
echo ""

# Step 4: Test embedding generation
echo -e "${BLUE}🧪 Step 4: Testing embedding generation...${NC}"
echo "   This will test:"
echo "   - Step 1: Validation ✅"
echo "   - Step 2: Compression ✅"
echo "   - Step 3: Embedding generation (with error handling) 🧪"
echo ""

SEARCH_START=$(date +%s)
RESPONSE=$(curl -s -X POST "${API_URL}/api/products/searchByImage" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "image=@$TEST_IMAGE" \
  -F "limit=5" \
  -F "minSimilarity=0.5" \
  -w "\nHTTP_CODE:%{http_code}")

SEARCH_END=$(date +%s)
SEARCH_DURATION=$((SEARCH_END - SEARCH_START))

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE")

echo "Response (took ${SEARCH_DURATION}s, HTTP $HTTP_CODE):"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

# Step 5: Analyze response
if [ "$HTTP_CODE" = "200" ]; then
  if echo "$BODY" | grep -q '"success":true'; then
    EMBEDDING_DIM=$(echo "$BODY" | jq -r '.data.debug.embeddingDimension // "null"' 2>/dev/null || echo "null")
    EMBEDDING_GEN=$(echo "$BODY" | jq -r '.data.debug.embeddingGenerated // "null"' 2>/dev/null || echo "null")
    
    if [ "$EMBEDDING_GEN" = "true" ]; then
      echo -e "${GREEN}✅ Step 3 PASSED: Embedding generated successfully!${NC}"
      echo "   Dimension: $EMBEDDING_DIM"
      echo "   Duration: ${SEARCH_DURATION}s"
    else
      echo -e "${YELLOW}⚠️  Step 3: Embedding not generated (may be in Step 1-2 mode)${NC}"
    fi
  else
    echo -e "${RED}❌ Step 3 FAILED: Response indicates failure${NC}"
  fi
elif [ "$HTTP_CODE" = "503" ]; then
  if echo "$BODY" | grep -q "EMBEDDING_GENERATION_FAILED"; then
    echo -e "${YELLOW}⚠️  Step 3: Embedding generation failed (error handling worked)${NC}"
    echo "   This is expected if WASM backend has issues"
    echo "   Check error details in response"
  else
    echo -e "${RED}❌ Step 3 FAILED: Service unavailable${NC}"
  fi
else
  echo -e "${RED}❌ Step 3 FAILED: Unexpected HTTP code: $HTTP_CODE${NC}"
fi

echo ""
echo -e "${GREEN}✅ Test completed!${NC}"

#!/bin/bash
# ============================================================================
# Simple Test Script for Image Embedding
# ============================================================================
# Tests embedding generation on local dev server
# ============================================================================

set -e

API_URL="${API_URL:-http://localhost:3002}"
TEST_IMAGE="${TEST_IMAGE:-test-images/IMG_8298\ 2.JPG}"

echo "🧪 Simple Embedding Test"
echo "API URL: $API_URL"
echo ""

# Check if server is running
echo "⏳ Checking if server is running..."
if ! curl -s "$API_URL/api/health" > /dev/null 2>&1; then
  echo "❌ Server is not running!"
  echo "   Please start the server first: yarn dev:api"
  exit 1
fi
echo "✅ Server is running"
echo ""

# Check if test image exists
if [ ! -f "$TEST_IMAGE" ]; then
  echo "⚠️  Test image not found: $TEST_IMAGE"
  echo "   Using any available test image..."
  TEST_IMAGE=$(find test-images -name "*.JPG" -o -name "*.jpg" | head -1)
  if [ -z "$TEST_IMAGE" ]; then
    echo "❌ No test images found in test-images/"
    exit 1
  fi
  echo "   Using: $TEST_IMAGE"
fi

# Login to get token
echo "🔐 Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin.outlet1@example.com",
    "password": "admin123"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Logged in successfully"
echo ""

# Test image search
echo "🖼️  Testing image search with: $TEST_IMAGE"
echo "   This may take 30-180 seconds for first request (model loading)..."
echo ""

SEARCH_START=$(date +%s)
SEARCH_RESPONSE=$(curl -s -X POST "$API_URL/api/products/searchByImage" \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@$TEST_IMAGE" \
  -F "limit=5" \
  -F "minSimilarity=0.5" \
  -w "\nHTTP_CODE:%{http_code}")
SEARCH_END=$(date +%s)
SEARCH_DURATION=$((SEARCH_END - SEARCH_START))

HTTP_CODE=$(echo "$SEARCH_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
RESPONSE_BODY=$(echo "$SEARCH_RESPONSE" | grep -v "HTTP_CODE")

echo "Response (took ${SEARCH_DURATION}s, HTTP $HTTP_CODE):"
echo "$RESPONSE_BODY" | jq '.' 2>/dev/null || echo "$RESPONSE_BODY"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  if echo "$RESPONSE_BODY" | grep -q '"success":true'; then
    echo "✅ Image search successful!"
    RESULTS_COUNT=$(echo "$RESPONSE_BODY" | jq '.data.results | length' 2>/dev/null || echo "0")
    echo "   Found $RESULTS_COUNT results"
  else
    echo "⚠️  Response indicates failure"
  fi
elif [ "$HTTP_CODE" = "503" ]; then
  echo "⚠️  Service unavailable - model may still be loading"
  echo "   This is expected on first request"
elif [ "$HTTP_CODE" = "500" ]; then
  echo "❌ Server error - check logs"
else
  echo "⚠️  Unexpected HTTP code: $HTTP_CODE"
fi

echo ""
echo "✅ Test completed!"

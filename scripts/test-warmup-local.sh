#!/bin/bash
# ============================================================================
# Test Model Warm-up on Local Dev Server
# ============================================================================
# This script tests the model warm-up endpoint on a running local dev server
# ============================================================================

set -e

API_URL="${API_URL:-http://localhost:3002}"

echo "🔥 Testing Model Warm-up Endpoint"
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

# Test warm-up endpoint
echo "🔥 Testing model warm-up (POST /api/test/warmup-model)..."
echo "   This may take 30-120 seconds..."
echo ""

WARMUP_START=$(date +%s)
WARMUP_RESPONSE=$(curl -s -X POST "$API_URL/api/test/warmup-model" -w "\nHTTP_CODE:%{http_code}")
WARMUP_END=$(date +%s)
WARMUP_DURATION=$((WARMUP_END - WARMUP_START))

echo "Response (took ${WARMUP_DURATION}s):"
echo "$WARMUP_RESPONSE" | grep -v "HTTP_CODE" | jq '.' 2>/dev/null || echo "$WARMUP_RESPONSE" | grep -v "HTTP_CODE"
echo ""

HTTP_CODE=$(echo "$WARMUP_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$HTTP_CODE" = "200" ]; then
  if echo "$WARMUP_RESPONSE" | grep -q "MODEL_WARMUP_SUCCESS"; then
    echo "✅ Model warm-up successful!"
  else
    echo "⚠️  Warm-up completed but response format unexpected"
  fi
else
  echo "⚠️  Warm-up returned HTTP $HTTP_CODE"
  echo "   (This may be OK if model is already loaded or warm-up timed out)"
fi

echo ""
echo "🔍 Checking model status (GET /api/test/warmup-model)..."
STATUS_RESPONSE=$(curl -s "$API_URL/api/test/warmup-model")
echo "Response:"
echo "$STATUS_RESPONSE" | jq '.' 2>/dev/null || echo "$STATUS_RESPONSE"
echo ""

if echo "$STATUS_RESPONSE" | grep -q '"isLoaded":true'; then
  echo "✅ Model is loaded and ready!"
elif echo "$STATUS_RESPONSE" | grep -q '"isLoaded":false'; then
  echo "⚠️  Model is not loaded yet"
  echo "   It will be loaded on first image search request"
else
  echo "⚠️  Could not determine model status"
fi

echo ""
echo "✅ Test completed!"

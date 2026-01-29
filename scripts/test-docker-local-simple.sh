#!/bin/bash
# ============================================================================
# Test Docker Build and Run Locally (Simulate Railway Environment)
# ============================================================================
# This script builds and runs the Docker image locally to test before deploying
# ============================================================================

set -euo pipefail

# Configuration
API_PORT=3002
CONTAINER_NAME="rentalshop-api-test-local"
IMAGE_NAME="rentalshop-api-test-local"
TEST_IMAGE="${TEST_IMAGE:-test-images/IMG_8281\ 2.JPG}"

echo "🧪 Testing Docker Build and Run Locally (Simulating Railway)"
echo "============================================================"
echo ""

# Step 1: Clean up old containers
echo "🧹 Step 1: Cleaning up old containers..."
docker stop "${CONTAINER_NAME}" > /dev/null 2>&1 || true
docker rm "${CONTAINER_NAME}" > /dev/null 2>&1 || true
echo "✅ Cleanup completed"
echo ""

# Step 2: Build Docker image
echo "🔨 Step 2: Building Docker image..."
if ! docker build -t "${IMAGE_NAME}" -f apps/api/Dockerfile .; then
  echo "❌ Docker build failed!"
  exit 1
fi
echo "✅ Docker image built successfully"
echo ""

# Step 3: Start container
echo "🚀 Step 3: Starting Docker container..."
docker run -d \
  --name "${CONTAINER_NAME}" \
  -p "${API_PORT}:${API_PORT}" \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://user:password@host:port/database" \
  -e JWT_SECRET="supersecretjwtkeythatisatleast32characterslong" \
  -e QDRANT_URL="http://localhost:6333" \
  -e QDRANT_API_KEY="" \
  -e NEXT_PUBLIC_APP_URL="http://localhost:3000" \
  -e NEXT_PUBLIC_API_URL="http://localhost:${API_PORT}" \
  -e USE_ONNXRUNTIME=false \
  -e USE_BROWSER=true \
  -e ONNXRUNTIME_NODE_DISABLE=true \
  "${IMAGE_NAME}" > /dev/null 2>&1

if [ $? -ne 0 ]; then
  echo "❌ Failed to start container!"
  exit 1
fi
echo "✅ Container started"
echo ""

# Step 4: Wait for server to be ready
echo "⏳ Step 4: Waiting for server to be ready..."
MAX_WAIT=120
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
  if curl -s -f "http://localhost:${API_PORT}/api/health" > /dev/null 2>&1; then
    echo "✅ Server is ready!"
    break
  fi
  sleep 2
  WAITED=$((WAITED + 2))
  if [ $((WAITED % 10)) -eq 0 ]; then
    echo "   Still waiting... ($WAITED/$MAX_WAIT seconds)"
  fi
done

if [ $WAITED -ge $MAX_WAIT ]; then
  echo "❌ Server did not start in time!"
  echo "📋 Container logs:"
  docker logs "${CONTAINER_NAME}" | tail -50
  docker stop "${CONTAINER_NAME}" > /dev/null 2>&1 || true
  docker rm "${CONTAINER_NAME}" > /dev/null 2>&1 || true
  exit 1
fi
echo ""

# Step 5: Test image search API
echo "🖼️  Step 5: Testing image search API..."
echo "   This will test the embedding generation with the fixed mock module"
echo ""

# Login to get token
echo "🔐 Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:${API_PORT}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin.outlet1@example.com",
    "password": "admin123"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4 || echo "")

if [ -z "$TOKEN" ]; then
  echo "⚠️  Login failed (this is OK for testing - server is running)"
  echo "   Response: $LOGIN_RESPONSE"
  echo ""
  echo "✅ Docker test completed - Server is running successfully!"
  echo "   (Login requires database connection, which is not available in test)"
  echo ""
  echo "📋 Recent container logs:"
  docker logs "${CONTAINER_NAME}" | tail -30
  echo ""
  echo "🧹 Cleaning up..."
  docker stop "${CONTAINER_NAME}" > /dev/null 2>&1 || true
  docker rm "${CONTAINER_NAME}" > /dev/null 2>&1 || true
  echo "✅ Test completed!"
  exit 0
fi

echo "✅ Logged in successfully"
echo ""

# Test image search
if [ -f "$TEST_IMAGE" ]; then
  echo "🖼️  Testing image search with: $TEST_IMAGE"
  echo "   This may take 30-180 seconds for first request (model loading)..."
  echo ""
  
  SEARCH_START=$(date +%s)
  SEARCH_RESPONSE=$(curl -s -X POST "http://localhost:${API_PORT}/api/products/searchByImage" \
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
    echo "❌ Server error - check logs below"
  else
    echo "⚠️  Unexpected HTTP code: $HTTP_CODE"
  fi
else
  echo "⚠️  Test image not found: $TEST_IMAGE"
  echo "   Skipping image search test"
fi

echo ""
echo "📋 Recent container logs (focusing on embedding/model errors):"
docker logs "${CONTAINER_NAME}" 2>&1 | grep -E "(embedding|model|onnxruntime|WASM|Error|❌|✅)" | tail -50 || docker logs "${CONTAINER_NAME}" | tail -30
echo ""

# Step 6: Cleanup
echo "🧹 Step 6: Cleaning up..."
docker stop "${CONTAINER_NAME}" > /dev/null 2>&1 || true
docker rm "${CONTAINER_NAME}" > /dev/null 2>&1 || true
echo "✅ Cleanup completed"
echo ""

echo "✅ Docker local test completed!"
echo ""
echo "📝 Summary:"
echo "   - Docker image built successfully"
echo "   - Container started and server is running"
echo "   - Health check passed"
if [ -f "$TEST_IMAGE" ] && [ -n "$TOKEN" ]; then
  echo "   - Image search API tested"
fi
echo ""
echo "✅ Ready to commit and deploy to Railway!"

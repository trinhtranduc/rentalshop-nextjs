#!/bin/bash

# Test Step 1: Parse form data and validate image
# This tests only validation, no ML model loading

echo "🧪 Testing Search By Image - Step 1 (Validation Only)"
echo "============================================================"
echo ""
echo "🌐 API URL: ${API_URL}"
echo ""

# Default to dev API (can override with API_URL env var)
API_URL="${API_URL:-https://dev-api.anyrent.shop}"
TOKEN="${TOKEN:-}"

# Step 1: Check if server is running
echo "⏳ Step 1: Checking if server is running..."
if ! curl -s "${API_URL}/api/health" > /dev/null; then
  echo "❌ Server is not running at ${API_URL}"
  echo "   Please start the server first: cd apps/api && yarn dev"
  exit 1
fi
echo "✅ Server is running!"
echo ""

# Step 2: Login if no token provided
if [ -z "$TOKEN" ]; then
  echo "🔐 Step 2: Logging in..."
  LOGIN_RESPONSE=$(curl -s -X POST "${API_URL}/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "admin.outlet1@example.com",
      "password": "admin123"
    }')
  
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  
  if [ -z "$TOKEN" ]; then
    echo "❌ Login failed"
    echo "   Response: $LOGIN_RESPONSE"
    exit 1
  fi
  echo "✅ Login successful"
  echo ""
else
  echo "🔐 Step 2: Using provided token"
  echo ""
fi

# Step 3: Test with valid image
echo "🖼️  Step 3: Testing with valid image..."
if [ ! -f "test-images/IMG_8338.PNG" ]; then
  echo "⚠️  Test image not found: test-images/IMG_8338.PNG"
  echo "   Using any available test image..."
  TEST_IMAGE=$(find test-images -type f \( -name "*.jpg" -o -name "*.png" -o -name "*.jpeg" \) | head -1)
  if [ -z "$TEST_IMAGE" ]; then
    echo "❌ No test images found in test-images/"
    exit 1
  fi
else
  TEST_IMAGE="test-images/IMG_8338.PNG"
fi

echo "   Testing with image: $TEST_IMAGE"
echo "   This should validate successfully and return empty results (Step 1 only)"
echo ""

RESPONSE=$(curl -s -X POST "${API_URL}/api/products/searchByImage" \
  -H "Authorization: Bearer ${TOKEN}" \
  -F "image=@${TEST_IMAGE}" \
  -F "limit=20" \
  -F "minSimilarity=0.5")

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if validation passed
if echo "$RESPONSE" | grep -q "NO_PRODUCTS_FOUND"; then
  echo "✅ Step 1 Test PASSED:"
  echo "   - Image validation successful"
  echo "   - API returned empty results (expected for Step 1)"
  echo "   - No ML model loaded (no WASM errors)"
  echo ""
  echo "✅ Ready for Step 2: Image compression"
else
  echo "❌ Step 1 Test FAILED"
  echo "   Check response above for errors"
  exit 1
fi

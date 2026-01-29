#!/bin/bash

# Test Image Search API với curl
# Usage: ./scripts/test-image-search-api.sh <image-path> [token]

IMAGE_PATH="${1:-./image-test-input/IMG_8298\ 2.JPG}"
TOKEN="${2:-}"

if [ -z "$TOKEN" ]; then
  echo "❌ Please provide JWT token"
  echo ""
  echo "Usage:"
  echo "  ./scripts/test-image-search-api.sh <image-path> <jwt-token>"
  echo ""
  echo "Example:"
  echo "  ./scripts/test-image-search-api.sh './image-test-input/IMG_8298 2.JPG' 'eyJhbGci...'"
  echo ""
  echo "Or login first to get token:"
  echo "  curl -X POST 'https://dev-api.anyrent.shop/api/auth/login' \\"
  echo "    -H 'Content-Type: application/json' \\"
  echo "    -d '{\"email\":\"admin@rentalshop.com\",\"password\":\"admin123\"}'"
  exit 1
fi

if [ ! -f "$IMAGE_PATH" ]; then
  echo "❌ Image file not found: $IMAGE_PATH"
  exit 1
fi

API_URL="https://dev-api.anyrent.shop/api/products/searchByImage"

echo "🔍 Testing Image Search API"
echo "   Image: $IMAGE_PATH"
echo "   API: $API_URL"
echo ""

# Test với curl
curl -X POST "$API_URL" \
  -H "accept: application/json" \
  -H "authorization: Bearer $TOKEN" \
  -H "x-app-version: 1.0.0" \
  -H "x-client-platform: web" \
  -H "x-device-type: browser" \
  -F "image=@$IMAGE_PATH" \
  -F "limit=20" \
  -F "minSimilarity=0.5" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  -v

echo ""
echo "✅ Test completed"

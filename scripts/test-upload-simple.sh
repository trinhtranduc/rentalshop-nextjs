#!/bin/bash

# Test Image Upload to Railway API with AWS S3
# Usage: ./test-upload-simple.sh [image-path]

API_URL="https://dev-apis-development.up.railway.app"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEwMTUsImVtYWlsIjoiYW9kYWlwaGFtQGdtYWlsLmNvbSIsInJvbGUiOiJNRVJDSEFOVCIsIm1lcmNoYW50SWQiOjgsIm91dGxldElkIjo4LCJwbGFuTmFtZSI6IlRyaWFsIiwic2Vzc2lvbklkIjoiZGRiODEwZGYyYzkzMWMzYjZlNGYzMmQ3MzAwNjRlZDAyM2Y2NjliYjZkZThlMjgzMzA5NjQ3NjZiNWEyNzhkYiIsImlhdCI6MTc2MDcxMzc4OSwiZXhwIjoxNzYxMzE4NTg5fQ.k-xVV1laBw29AqkWUQOzpuKTb3UmF7fCv-gQlY1oa3E"

echo "🧪 Testing Image Upload to Railway API"
echo ""

# Find test image
if [ -n "$1" ]; then
    IMAGE_PATH="$1"
elif [ -f "scripts/test-image.jpg" ]; then
    IMAGE_PATH="scripts/test-image.jpg"
elif [ -f "scripts/test-image.png" ]; then
    IMAGE_PATH="scripts/test-image.png"
elif [ -f "test-image.jpg" ]; then
    IMAGE_PATH="test-image.jpg"
elif [ -f "test-image.png" ]; then
    IMAGE_PATH="test-image.png"
else
    echo "❌ No test image found!"
    echo ""
    echo "Usage:"
    echo "  1. Provide image path: ./test-upload-simple.sh /path/to/image.jpg"
    echo "  2. Or place image at: scripts/test-image.jpg"
    echo ""
    exit 1
fi

if [ ! -f "$IMAGE_PATH" ]; then
    echo "❌ Image file not found: $IMAGE_PATH"
    exit 1
fi

echo "📋 Configuration:"
echo "   API URL: $API_URL"
echo "   Image: $IMAGE_PATH"
echo "   Token: ${TOKEN:0:50}..."
echo ""

echo "📤 Uploading image..."
echo ""

# Upload with curl
response=$(curl -s -w "\n%{http_code}" \
  -X POST "$API_URL/api/upload/image" \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@$IMAGE_PATH")

# Extract status code (last line)
http_code=$(echo "$response" | tail -n1)
# Extract body (all lines except last)
body=$(echo "$response" | sed '$d')

echo "📊 Response:"
echo "   Status: $http_code"
echo ""

if [ "$http_code" = "200" ]; then
    echo "✅ Upload successful!"
    echo ""
    echo "📦 Response data:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    echo ""
    
    # Extract URL if available
    url=$(echo "$body" | jq -r '.data.url // .url // empty' 2>/dev/null)
    if [ -n "$url" ]; then
        echo "🌐 Image URL:"
        echo "   $url"
        echo ""
    fi
    
    # Extract CDN URL if available
    cdn_url=$(echo "$body" | jq -r '.data.cdnUrl // .cdnUrl // empty' 2>/dev/null)
    if [ -n "$cdn_url" ]; then
        echo "🚀 CDN URL:"
        echo "   $cdn_url"
        echo ""
    fi
    
    echo "🎉 Test completed successfully!"
    echo ""
    echo "📋 Summary:"
    echo "   ✅ API endpoint is working"
    echo "   ✅ Authentication is valid"
    echo "   ✅ Image upload succeeded"
    echo "   ✅ AWS S3 integration is working"
else
    echo "❌ Upload failed!"
    echo ""
    echo "📦 Error response:"
    echo "$body" | jq '.' 2>/dev/null || echo "$body"
    echo ""
    
    if [ "$http_code" = "401" ]; then
        echo "💡 Token might be expired or invalid"
    elif [ "$http_code" = "500" ]; then
        echo "💡 Server error - check Railway logs"
    fi
    
    exit 1
fi


#!/bin/bash

echo "🔄 Restarting API server to pick up new JWT secret..."

# Find and kill the API server process
echo "🛑 Stopping API server..."
pkill -f "next dev -p 3002" || echo "No API server found to stop"

# Wait a moment
sleep 2

# Start the API server again
echo "🚀 Starting API server..."
cd apps/api
npm run dev &
API_PID=$!
cd ../..

echo "✅ API server restarted with PID: $API_PID"
echo "🌐 API server should be available at: http://localhost:3002"
echo ""
echo "🔧 Testing the new JWT secret..."

# Wait for server to start
sleep 5

# Test login
echo "📝 Testing login..."
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:3002/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"client@rentalshop.com","password":"client123"}')

echo "📥 Login response: $LOGIN_RESPONSE"

# Extract token from response
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ ! -z "$TOKEN" ]; then
  echo "✅ Token extracted: ${TOKEN:0:50}..."
  
  # Test products API with token
  echo "📦 Testing products API with token..."
  PRODUCTS_RESPONSE=$(curl -s -X GET "http://localhost:3002/api/products" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")
  
  echo "📥 Products response: $PRODUCTS_RESPONSE"
  
  if echo "$PRODUCTS_RESPONSE" | grep -q '"success":true'; then
    echo "✅ SUCCESS: Products API working with new JWT secret!"
  else
    echo "❌ FAILED: Products API still not working"
  fi
else
  echo "❌ FAILED: Could not extract token from login response"
fi

echo ""
echo "🎯 Next steps:"
echo "1. Try logging in at: http://localhost:3000/login"
echo "2. Should redirect to dashboard without issues"
echo "3. Products should load successfully" 
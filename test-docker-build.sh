#!/bin/bash

# Test Docker build locally before pushing to Railway
# This helps catch issues early

echo "🐳 Testing Docker build locally..."
echo ""

cd /Users/mac/Source-Code/rentalshop-nextjs

# Build using Dockerfile
docker build -f apps/api/Dockerfile -t rentalshop-test .

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Docker build SUCCESS!"
  echo ""
  echo "🔍 Checking tsup installation..."
  docker run --rm rentalshop-test ls -la /app/node_modules/.bin/ | grep tsup
  
  echo ""
  echo "🔍 Checking packages/errors devDependencies..."
  docker run --rm rentalshop-test ls -la /app/packages/errors/node_modules/.bin/ 2>/dev/null | grep tsup || echo "❌ No node_modules in packages/errors/"
  
  echo ""
  echo "🔍 Checking if tsup is installed..."
  docker run --rm rentalshop-test find /app -name "tsup" -type f 2>/dev/null | head -10
else
  echo ""
  echo "❌ Docker build FAILED!"
  exit 1
fi


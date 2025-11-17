#!/bin/bash

# Test Railway build locally before deploying
# This simulates Railway's build process

set -e  # Exit on error

echo "🧪 Testing Railway Build Process..."
echo ""

# Step 1: Simulate Railway's WORKDIR setup
echo "Step 1: Setup build directory..."
BUILD_DIR="/tmp/railway-test-build"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Copy entire monorepo
echo "Copying monorepo..."
cp -r . "$BUILD_DIR/"
cd "$BUILD_DIR"

echo "✅ Build directory ready"
echo ""

# Step 2: Test Yarn availability
echo "Step 2: Testing Yarn..."
if ! command -v yarn &> /dev/null; then
    echo "Installing corepack..."
    npm install -g corepack
    corepack enable
fi
echo "✅ Yarn: $(yarn --version)"
echo ""

# Step 3: Install dependencies
echo "Step 3: Installing dependencies..."
yarn install
echo "✅ Dependencies installed"
echo ""

# Step 4: Test build for each app
echo "Step 4: Testing builds..."
echo ""

echo "📦 Building @rentalshop/api..."
yarn build --filter=@rentalshop/api
echo "✅ API build successful"
echo ""

echo "📦 Building @rentalshop/client..."
yarn build --filter=@rentalshop/client
echo "✅ Client build successful"
echo ""

echo "📦 Building @rentalshop/admin..."
yarn build --filter=@rentalshop/admin
echo "✅ Admin build successful"
echo ""

# Cleanup
cd -
rm -rf "$BUILD_DIR"

echo "🎉 All builds successful! Ready to deploy to Railway!"


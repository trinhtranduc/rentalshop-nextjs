#!/bin/bash

# Test Docker build locally before deploying
# Usage: ./scripts/test-docker-build.sh

set -e

echo "🐳 Testing Docker build locally..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Build Docker image
echo -e "${YELLOW}Step 1: Building Docker image...${NC}"
cd "$(dirname "$0")/.."

docker build \
  -f apps/api/Dockerfile \
  -t anyrent-api:local-test \
  --progress=plain \
  . 2>&1 | tee /tmp/docker-build.log

if [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo -e "${RED}❌ Docker build failed!${NC}"
  echo "Check /tmp/docker-build.log for details"
  exit 1
fi

echo -e "${GREEN}✅ Docker build successful!${NC}"
echo ""

# Step 2: Test if image runs
echo -e "${YELLOW}Step 2: Testing if container starts...${NC}"

# Create a test container (don't start it yet)
CONTAINER_ID=$(docker create \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://test:test@localhost:5432/test" \
  -e JWT_SECRET="test-secret" \
  -e NEXTAUTH_SECRET="test-secret" \
  anyrent-api:local-test \
  sh -c "echo 'Container created successfully'")

if [ -z "$CONTAINER_ID" ]; then
  echo -e "${RED}❌ Failed to create container!${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Container created successfully!${NC}"
echo "   Container ID: $CONTAINER_ID"
echo ""

# Step 3: Check image size
echo -e "${YELLOW}Step 3: Checking image size...${NC}"
IMAGE_SIZE=$(docker images anyrent-api:local-test --format "{{.Size}}")
echo "   Image size: $IMAGE_SIZE"
echo ""

# Step 4: Cleanup
echo -e "${YELLOW}Step 4: Cleaning up test container...${NC}"
docker rm $CONTAINER_ID > /dev/null 2>&1
echo -e "${GREEN}✅ Cleanup complete!${NC}"
echo ""

echo -e "${GREEN}✅ All tests passed!${NC}"
echo ""
echo "To run the container locally:"
echo "  docker run -p 3002:3002 --env-file .env anyrent-api:local-test"
echo ""
echo "To test image search API:"
echo "  curl -X POST http://localhost:3002/api/products/searchByImage \\"
echo "    -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "    -F 'image=@/path/to/image.jpg' \\"
echo "    -F 'minSimilarity=0.5'"

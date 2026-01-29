#!/bin/bash
# Direct Docker test - Test with existing code using tsx
# This is the simplest way to test Docker environment

set -e

echo "🐳 Direct Docker Test (Simulating Railway Environment)"
echo "============================================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check Docker
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}❌ Docker is not running${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Check test image
TEST_IMAGE="test-images/IMG_8298 2.JPG"
if [ ! -f "$TEST_IMAGE" ]; then
  echo -e "${RED}❌ Test image not found: $TEST_IMAGE${NC}"
  exit 1
fi

echo -e "${BLUE}📁 Test image: $TEST_IMAGE${NC}"
echo ""

# Run test directly with tsx (no build needed)
echo -e "${BLUE}🚀 Running test in Docker (node:18 with tsx)...${NC}"
echo ""

docker run --rm \
  -v "$(pwd):/workspace" \
  -w /workspace \
  -e NODE_ENV=production \
  node:18 bash -c "
    # Install tsx globally for quick testing
    npm install -g tsx 2>&1 | tail -3
    
    echo ''
    echo '🧪 Testing embedding generation...'
    echo ''
    
    # Run test script directly
    tsx scripts/test-embedding-docker-simple.ts 2>&1
  "

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ Docker test completed successfully!${NC}"
else
  echo -e "${RED}❌ Docker test failed (exit code: $EXIT_CODE)${NC}"
  echo ""
  echo "This helps identify Docker-specific issues."
  echo "Compare with local test results to find the root cause."
fi

exit $EXIT_CODE

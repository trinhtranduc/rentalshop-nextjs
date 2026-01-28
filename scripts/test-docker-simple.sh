#!/bin/bash
# Simple Docker test - Run test script in Docker container
# This simulates Railway environment without building full image

set -e

echo "🐳 Simple Docker Test (Simulating Railway Environment)"
echo "============================================================"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}❌ Docker is not running${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Check if test image exists
TEST_IMAGE="test-images/IMG_8298 2.JPG"
if [ ! -f "$TEST_IMAGE" ]; then
  echo -e "${RED}❌ Test image not found: $TEST_IMAGE${NC}"
  exit 1
fi

echo -e "${BLUE}📁 Test image: $TEST_IMAGE${NC}"
echo ""

# Run test in Docker container using node:18 (same as Railway)
echo -e "${BLUE}🚀 Running test in Docker container (node:18)...${NC}"
echo ""

docker run --rm \
  -v "$(pwd):/workspace" \
  -w /workspace \
  -e NODE_ENV=production \
  node:18 \
  bash -c "
    echo '📦 Installing dependencies...'
    yarn install --frozen-lockfile --production=false --silent 2>&1 | tail -5
    
    echo ''
    echo '🔨 Building packages...'
    yarn build 2>&1 | tail -10
    
    echo ''
    echo '🧪 Testing embedding generation...'
    node -e \"
      const fs = require('fs');
      const path = require('path');
      
      async function test() {
        try {
          console.log('🔄 Loading embedding service...');
          const { getEmbeddingService } = require('./packages/database/dist/ml/image-embeddings.js');
          const service = getEmbeddingService();
          
          console.log('🔄 Reading image...');
          const imagePath = '/workspace/test-images/IMG_8298 2.JPG';
          const buffer = fs.readFileSync(imagePath);
          console.log('   ✅ Buffer size:', buffer.length, 'bytes');
          
          console.log('🔄 Generating embedding...');
          const start = Date.now();
          const embedding = await service.generateEmbeddingFromBuffer(buffer);
          const time = Date.now() - start;
          
          const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
          console.log('');
          console.log('✅ SUCCESS!');
          console.log('   - Dimension:', embedding.length);
          console.log('   - Time:', time + 'ms');
          console.log('   - Normalized:', Math.abs(magnitude - 1.0) < 0.01 ? 'Yes' : 'No');
          console.log('   - Magnitude:', magnitude.toFixed(6));
        } catch (error) {
          console.error('');
          console.error('❌ ERROR:', error.message);
          if (error.stack) {
            console.error('');
            console.error('Stack trace:');
            console.error(error.stack.split('\\n').slice(0, 10).join('\\n'));
          }
          process.exit(1);
        }
      }
      
      test();
    \"
  "

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ Docker test completed successfully!${NC}"
else
  echo -e "${RED}❌ Docker test failed${NC}"
fi

exit $EXIT_CODE

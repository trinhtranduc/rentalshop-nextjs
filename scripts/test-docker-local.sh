#!/bin/bash
# Test Docker locally to simulate Railway environment
# This helps identify Docker-specific issues before deploying

set -e

echo "🐳 Testing Docker Locally (Simulating Railway Environment)"
echo "=" .repeat(60)

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo -e "${RED}❌ Docker is not running${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Build Docker image
echo -e "\n${BLUE}🔨 Building Docker image...${NC}"
cd apps/api
docker build -t rentalshop-api-test:latest .
cd ../..

# Create test script inside container
cat > /tmp/test-embedding-docker.sh << 'EOF'
#!/bin/bash
cd /app
echo "🧪 Testing embedding generation in Docker..."
echo ""

# Test with a small image first
if [ -f "/app/test-images/IMG_8298 2.JPG" ]; then
  echo "📁 Testing with: test-images/IMG_8298 2.JPG"
  node -e "
    const fs = require('fs');
    const path = require('path');
    
    async function test() {
      try {
        console.log('🔄 Loading embedding service...');
        const { getEmbeddingService } = require('./packages/database/dist/ml/image-embeddings.js');
        const service = getEmbeddingService();
        
        console.log('🔄 Reading image...');
        const imagePath = '/app/test-images/IMG_8298 2.JPG';
        const buffer = fs.readFileSync(imagePath);
        console.log('   ✅ Buffer size:', buffer.length, 'bytes');
        
        console.log('🔄 Generating embedding...');
        const start = Date.now();
        const embedding = await service.generateEmbeddingFromBuffer(buffer);
        const time = Date.now() - start;
        
        console.log('✅ SUCCESS!');
        console.log('   - Dimension:', embedding.length);
        console.log('   - Time:', time + 'ms');
        console.log('   - Normalized:', Math.abs(Math.sqrt(embedding.reduce((sum, v) => sum + v*v, 0)) - 1.0) < 0.01 ? 'Yes' : 'No');
      } catch (error) {
        console.error('❌ ERROR:', error.message);
        console.error(error.stack);
        process.exit(1);
      }
    }
    
    test();
  "
else
  echo "⚠️  Test image not found"
fi
EOF

chmod +x /tmp/test-embedding-docker.sh

# Run test in container
echo -e "\n${BLUE}🚀 Running test in Docker container...${NC}"
echo ""

# Mount test-images directory
docker run --rm \
  -v "$(pwd)/test-images:/app/test-images:ro" \
  -v "$(pwd)/packages:/app/packages:ro" \
  -v "$(pwd)/node_modules:/app/node_modules:ro" \
  -v "$(pwd)/prisma:/app/prisma:ro" \
  -v "/tmp/test-embedding-docker.sh:/app/test.sh:ro" \
  rentalshop-api-test:latest \
  bash /app/test.sh

echo -e "\n${GREEN}✅ Docker test completed${NC}"

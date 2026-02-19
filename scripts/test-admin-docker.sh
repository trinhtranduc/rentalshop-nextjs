#!/bin/bash

# Script to test admin app Docker build locally
# This helps debug build issues before deploying to Vercel

set -e

echo "🚀 Testing Admin App Docker Build"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi

# Set default environment variables if not provided
export NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-https://dev-api.anyrent.shop}
export NEXT_PUBLIC_APP_ENV=${NEXT_PUBLIC_APP_ENV:-development}

echo -e "${YELLOW}📦 Environment:${NC}"
echo "  NEXT_PUBLIC_API_URL: $NEXT_PUBLIC_API_URL"
echo "  NEXT_PUBLIC_APP_ENV: $NEXT_PUBLIC_APP_ENV"
echo ""

# Navigate to project root
cd "$(dirname "$0")/.."

echo -e "${YELLOW}🔨 Building Docker image...${NC}"
echo "This may take several minutes on first build..."
echo "Using Docker BuildKit for cache optimization..."
echo ""

# Enable BuildKit for cache mounts and build with full output
# Use unbuffered output and limit log size to prevent pipe errors
DOCKER_BUILDKIT=1 docker-compose -f docker-compose.admin.yml build --progress=plain 2>&1 | \
  stdbuf -oL -eL tee /tmp/admin-docker-build.log | \
  grep -E "(Building|DONE|ERROR|error|failed|Successfully|Creating)" || true

if [ ${PIPESTATUS[0]} -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Build successful!${NC}"
    echo ""
    echo -e "${YELLOW}📋 Next steps:${NC}"
    echo "  1. View full build log: cat /tmp/admin-docker-build.log"
    echo "  2. Start container: docker-compose -f docker-compose.admin.yml up"
    echo "  3. View logs: docker-compose -f docker-compose.admin.yml logs -f"
    echo "  4. Stop container: docker-compose -f docker-compose.admin.yml down"
    echo ""
    echo -e "${YELLOW}🌐 Access admin app at: http://localhost:3001${NC}"
else
    echo ""
    echo -e "${RED}❌ Build failed!${NC}"
    echo ""
    echo -e "${YELLOW}📋 Troubleshooting:${NC}"
    echo "  1. View full build log: cat /tmp/admin-docker-build.log"
    echo "  2. Check for specific errors in the log above"
    echo "  3. Verify environment variables are set correctly"
    echo "  4. Try building without cache: docker-compose -f docker-compose.admin.yml build --no-cache"
    exit 1
fi

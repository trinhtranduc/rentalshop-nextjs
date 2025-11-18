#!/bin/bash
# ============================================================================
# Database Migration Script
# ============================================================================
# This script runs Prisma migrations for both development and production
# Usage:
#   ./scripts/migrate-database.sh [dev|prod]
#   Default: dev

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get environment (dev or prod)
ENV=${1:-dev}

echo -e "${GREEN}🚀 Starting database migration for ${ENV} environment...${NC}"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ Error: DATABASE_URL environment variable is not set${NC}"
    echo -e "${YELLOW}💡 Tip: Make sure you have .env file or DATABASE_URL is exported${NC}"
    exit 1
fi

# Show database URL (masked for security)
MASKED_URL=$(echo $DATABASE_URL | sed 's/:[^:]*@/:***@/')
echo -e "${YELLOW}📊 Database: ${MASKED_URL}${NC}"

# Generate Prisma Client first
echo -e "${GREEN}📦 Step 1: Generating Prisma Client...${NC}"
npx prisma generate --schema=./prisma/schema.prisma || {
    echo -e "${RED}❌ Failed to generate Prisma Client${NC}"
    exit 1
}

# Check migration status
echo -e "${GREEN}📋 Step 2: Checking migration status...${NC}"
npx prisma migrate status --schema=./prisma/schema.prisma || {
    echo -e "${YELLOW}⚠️  Migration status check failed, continuing anyway...${NC}"
}

# Run migrations
echo -e "${GREEN}🔄 Step 3: Running database migrations...${NC}"

if [ "$ENV" = "prod" ]; then
    # Production: Use migrate deploy (safe, no new migrations)
    echo -e "${YELLOW}⚠️  Production mode: Using 'migrate deploy' (safe for production)${NC}"
    npx prisma migrate deploy --schema=./prisma/schema.prisma || {
        echo -e "${RED}❌ Migration failed${NC}"
        exit 1
    }
else
    # Development: Use migrate dev (can create new migrations)
    echo -e "${YELLOW}💻 Development mode: Using 'migrate dev'${NC}"
    npx prisma migrate dev --schema=./prisma/schema.prisma || {
        echo -e "${RED}❌ Migration failed${NC}"
        exit 1
    }
fi

echo -e "${GREEN}✅ Migration completed successfully!${NC}"

# Show final status
echo -e "${GREEN}📊 Final migration status:${NC}"
npx prisma migrate status --schema=./prisma/schema.prisma || true

echo -e "${GREEN}🎉 Done!${NC}"


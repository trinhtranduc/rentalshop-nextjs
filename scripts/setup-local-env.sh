#!/bin/bash

# ========================================
# Setup Local Development Environment
# ========================================
# This script creates .env.local with SQLite database
# for local development and migration testing

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "🔧 Setting up Local Development Environment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if .env.local exists
if [ -f ".env.local" ]; then
  echo -e "${YELLOW}⚠️  .env.local already exists${NC}"
  read -p "Do you want to overwrite it? (yes/no): " OVERWRITE
  if [ "$OVERWRITE" != "yes" ]; then
    echo "❌ Cancelled"
    exit 0
  fi
fi

echo -e "${BLUE}📄 Creating .env.local with SQLite configuration...${NC}"

cat > .env.local << 'EOF'
# ========================================
# LOCAL DEVELOPMENT ENVIRONMENT
# ========================================
# This file is for local development with SQLite database
# Use this for: prisma migrate dev (creates migrations)
# 
# ⚠️ IMPORTANT: This file should be gitignored!

# Node Environment
NODE_ENV=local

# Database - SQLite for local development
DATABASE_URL="file:./prisma/dev.db"

# JWT Configuration (Local - NOT for production!)
JWT_SECRET="local-jwt-secret-DO-NOT-USE-IN-PRODUCTION-min-32-chars"
JWT_EXPIRES_IN=7d

# NextAuth Configuration (Local - NOT for production!)
NEXTAUTH_SECRET="local-nextauth-secret-DO-NOT-USE-IN-PRODUCTION-min-32-chars"
NEXTAUTH_URL="http://localhost:3002"

# API URLs (Local)
API_URL="http://localhost:3002"
CLIENT_URL="http://localhost:3000"
ADMIN_URL="http://localhost:3001"
NEXT_PUBLIC_API_URL="http://localhost:3002"

# CORS Configuration
CORS_ORIGINS="http://localhost:3000,http://localhost:3001,http://localhost:3002"

# Email Configuration (Local - prints to console)
EMAIL_PROVIDER=console
EMAIL_FROM=noreply@localhost

# Logging (Local - pretty format for debugging)
LOG_LEVEL=debug
LOG_FORMAT=pretty

# Feature Flags
ENABLE_EMAIL_VERIFICATION=false
ENABLE_ANALYTICS=false
ENABLE_DEBUG_LOGS=true
EOF

echo -e "${GREEN}✅ Created .env.local${NC}"
echo ""

# Create prisma directory if not exists
mkdir -p prisma

echo -e "${BLUE}📋 Next steps:${NC}"
echo ""
echo "1. Use .env.local for local development:"
echo "   NODE_ENV=local yarn db:migrate:dev --name your_migration_name"
echo ""
echo "2. For Railway migration, use:"
echo "   railway run --service apis --environment development \\"
echo "     npx prisma migrate deploy --schema=./prisma/schema.prisma"
echo ""
echo "3. Run local migration:"
echo "   NODE_ENV=local yarn db:migrate:dev"
echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"


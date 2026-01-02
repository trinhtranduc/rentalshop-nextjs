#!/bin/bash

# ========================================
# Create .env files from templates
# ========================================
# This script helps you create .env.development and .env.production
# from template files

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "📝 Create Environment Files from Templates"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if template files exist
if [ ! -f "env.development.template" ]; then
  echo -e "${RED}❌ Template file not found: env.development.template${NC}"
  exit 1
fi

if [ ! -f "env.production.template" ]; then
  echo -e "${RED}❌ Template file not found: env.production.template${NC}"
  exit 1
fi

# Function to create .env file from template
create_env_file() {
  local template=$1
  local output=$2
  local env_name=$3
  
  if [ -f "$output" ]; then
    echo -e "${YELLOW}⚠️  File $output already exists${NC}"
    read -p "Do you want to overwrite it? (yes/no): " OVERWRITE
    if [ "$OVERWRITE" != "yes" ]; then
      echo -e "${BLUE}ℹ️  Skipping $output${NC}"
      return 0
    fi
  fi
  
  echo -e "${BLUE}📄 Creating $output from $template...${NC}"
  cp "$template" "$output"
  echo -e "${GREEN}✅ Created $output${NC}"
  echo -e "${YELLOW}⚠️  Remember to:${NC}"
  echo "   1. Fill in your actual values (replace placeholders)"
  echo "   2. Generate secrets with: openssl rand -hex 32"
  echo "   3. Update DATABASE_URL with your Railway connection string"
  echo ""
}

# Create .env.development
read -p "Create .env.development? (yes/no): " CREATE_DEV
if [ "$CREATE_DEV" = "yes" ]; then
  create_env_file "env.development.template" ".env.development" "development"
fi

echo ""

# Create .env.production
read -p "Create .env.production? (yes/no): " CREATE_PROD
if [ "$CREATE_PROD" = "yes" ]; then
  create_env_file "env.production.template" ".env.production" "production"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Offer to validate files
if [ -f ".env.development" ] || [ -f ".env.production" ]; then
  read -p "Do you want to validate the created files? (yes/no): " VALIDATE
  if [ "$VALIDATE" = "yes" ]; then
    echo ""
    if [ -f "scripts/validate-env-files.sh" ]; then
      ./scripts/validate-env-files.sh
    else
      echo -e "${YELLOW}⚠️  Validation script not found${NC}"
    fi
  fi
fi

echo ""
echo -e "${GREEN}✅ Done!${NC}"
echo ""
echo -e "${BLUE}ℹ️  Next steps:${NC}"
echo "   1. Edit .env.development and .env.production files"
echo "   2. Replace placeholder values with your actual values"
echo "   3. Generate secrets: openssl rand -hex 32"
echo "   4. Copy values to Railway Dashboard if needed"
echo "   5. Run validation: ./scripts/validate-env-files.sh"


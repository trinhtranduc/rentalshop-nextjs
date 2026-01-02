#!/bin/bash

# ========================================
# Environment Files Validation Script
# ========================================
# This script validates .env.development and .env.production files
# against the required structure from env.example

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔍 Validating Environment Files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Required variables (must be present)
REQUIRED_VARS=(
  "DATABASE_URL"
  "NODE_ENV"
  "JWT_SECRET"
  "NEXTAUTH_SECRET"
  "NEXTAUTH_URL"
  "API_URL"
  "CLIENT_URL"
  "ADMIN_URL"
  "NEXT_PUBLIC_API_URL"
  "CORS_ORIGINS"
)

# Development-specific variables
DEV_VARS=(
  "API_URL=https://dev-api.anyrent.shop"
  "CLIENT_URL=https://dev.anyrent.shop"
  "ADMIN_URL=https://dev-admin.anyrent.shop"
  "NEXT_PUBLIC_API_URL=https://dev-api.anyrent.shop"
  "NEXTAUTH_URL=https://dev-api.anyrent.shop"
  "NODE_ENV=development"
  "CORS_ORIGINS=https://dev.anyrent.shop,https://dev-admin.anyrent.shop"
  "DATABASE_URL=postgresql://postgres:kWGqYPjEgJLKSmDroFFSsnVjKsUFcnmv@shuttle.proxy.rlwy.net:25662/railway"
)

# Production-specific variables
PROD_VARS=(
  "API_URL=https://api.anyrent.shop"
  "CLIENT_URL=https://anyrent.shop"
  "ADMIN_URL=https://admin.anyrent.shop"
  "NEXT_PUBLIC_API_URL=https://api.anyrent.shop"
  "NEXTAUTH_URL=https://api.anyrent.shop"
  "NODE_ENV=production"
  "CORS_ORIGINS=https://anyrent.shop,https://admin.anyrent.shop"
  "DATABASE_URL=postgresql://postgres:rcoiKvDAztXzqINtiUYlxZaPDpqrtRLg@maglev.proxy.rlwy.net:46280/railway"
)

# Function to validate a file
validate_env_file() {
  local file_path=$1
  local env_type=$2
  
  if [ ! -f "$file_path" ]; then
    echo -e "${RED}❌ File not found: $file_path${NC}"
    return 1
  fi
  
  echo -e "${BLUE}📄 Validating: $file_path${NC}"
  echo ""
  
  local errors=0
  local warnings=0
  
  # Check for required variables
  for var in "${REQUIRED_VARS[@]}"; do
    if ! grep -q "^${var}=" "$file_path"; then
      echo -e "${RED}  ❌ Missing required variable: ${var}${NC}"
      errors=$((errors + 1))
    else
      echo -e "${GREEN}  ✅ Found: ${var}${NC}"
    fi
  done
  
  echo ""
  
  # Check environment-specific values
  if [ "$env_type" = "development" ]; then
    echo -e "${YELLOW}🔍 Checking Development-specific values:${NC}"
    for expected in "${DEV_VARS[@]}"; do
      local var_name=$(echo "$expected" | cut -d'=' -f1)
      local expected_value=$(echo "$expected" | cut -d'=' -f2-)
      local actual_value=$(grep "^${var_name}=" "$file_path" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
      
      if [ -z "$actual_value" ]; then
        echo -e "${RED}  ❌ ${var_name} is empty${NC}"
        warnings=$((warnings + 1))
      elif [ "$actual_value" = "$expected_value" ]; then
        echo -e "${GREEN}  ✅ ${var_name} = ${expected_value}${NC}"
      else
        echo -e "${YELLOW}  ⚠️  ${var_name} = ${actual_value} (expected: ${expected_value})${NC}"
        warnings=$((warnings + 1))
      fi
    done
  elif [ "$env_type" = "production" ]; then
    echo -e "${YELLOW}🔍 Checking Production-specific values:${NC}"
    for expected in "${PROD_VARS[@]}"; do
      local var_name=$(echo "$expected" | cut -d'=' -f1)
      local expected_value=$(echo "$expected" | cut -d'=' -f2-)
      local actual_value=$(grep "^${var_name}=" "$file_path" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
      
      if [ -z "$actual_value" ]; then
        echo -e "${RED}  ❌ ${var_name} is empty${NC}"
        warnings=$((warnings + 1))
      elif [ "$actual_value" = "$expected_value" ]; then
        echo -e "${GREEN}  ✅ ${var_name} = ${expected_value}${NC}"
      else
        echo -e "${YELLOW}  ⚠️  ${var_name} = ${actual_value} (expected: ${expected_value})${NC}"
        warnings=$((warnings + 1))
      fi
    done
  fi
  
  echo ""
  
  # Check for DATABASE_URL format (should be Railway format for dev/prod)
  if grep -q "^DATABASE_URL=" "$file_path"; then
    local db_url=$(grep "^DATABASE_URL=" "$file_path" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    if [[ "$db_url" == *"\${{Postgres.DATABASE_URL}}"* ]] || [[ "$db_url" == postgresql://* ]]; then
      echo -e "${GREEN}  ✅ DATABASE_URL format looks correct${NC}"
    else
      echo -e "${YELLOW}  ⚠️  DATABASE_URL should be \${{Postgres.DATABASE_URL}} or a PostgreSQL connection string${NC}"
      warnings=$((warnings + 1))
    fi
  fi
  
  # Check for secret strength (should not contain placeholder values)
  if grep -q "^JWT_SECRET=" "$file_path"; then
    local jwt_secret=$(grep "^JWT_SECRET=" "$file_path" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    if [[ "$jwt_secret" == *"your-super-secret"* ]] || [[ "$jwt_secret" == *"DO-NOT-USE"* ]] || [ ${#jwt_secret} -lt 32 ]; then
      echo -e "${RED}  ❌ JWT_SECRET appears to be a placeholder or too short (min 32 chars)${NC}"
      errors=$((errors + 1))
    else
      echo -e "${GREEN}  ✅ JWT_SECRET looks secure${NC}"
    fi
  fi
  
  if grep -q "^NEXTAUTH_SECRET=" "$file_path"; then
    local nextauth_secret=$(grep "^NEXTAUTH_SECRET=" "$file_path" | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    if [[ "$nextauth_secret" == *"your-super-secret"* ]] || [[ "$nextauth_secret" == *"DO-NOT-USE"* ]] || [ ${#nextauth_secret} -lt 32 ]; then
      echo -e "${RED}  ❌ NEXTAUTH_SECRET appears to be a placeholder or too short (min 32 chars)${NC}"
      errors=$((errors + 1))
    else
      echo -e "${GREEN}  ✅ NEXTAUTH_SECRET looks secure${NC}"
    fi
  fi
  
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  if [ $errors -eq 0 ] && [ $warnings -eq 0 ]; then
    echo -e "${GREEN}✅ Validation passed for $file_path${NC}"
    return 0
  elif [ $errors -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Validation passed with $warnings warning(s) for $file_path${NC}"
    return 0
  else
    echo -e "${RED}❌ Validation failed with $errors error(s) and $warnings warning(s) for $file_path${NC}"
    return 1
  fi
}

# Validate both files
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

dev_valid=0
prod_valid=0

if validate_env_file ".env.development" "development"; then
  dev_valid=1
fi

echo ""
echo ""

if validate_env_file ".env.production" "production"; then
  prod_valid=1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $dev_valid -eq 1 ] && [ $prod_valid -eq 1 ]; then
  echo -e "${GREEN}✅ All environment files are valid!${NC}"
  echo ""
  echo -e "${BLUE}ℹ️  Important Notes:${NC}"
  echo "  • These files are for reference/documentation only"
  echo "  • Railway uses environment variables set in Railway Dashboard"
  echo "  • Copy values from these files to Railway Dashboard when deploying"
  echo "  • Use Railway CLI: railway variables set KEY=value --environment development"
  exit 0
else
  echo -e "${RED}❌ Some validation errors found. Please fix them before deploying.${NC}"
  exit 1
fi


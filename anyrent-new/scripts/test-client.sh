#!/bin/bash

# Quick Test Script for Client App

echo "🧪 Testing Client App Setup..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check API server
echo "1. Checking API server (port 3002)..."
if curl -s http://localhost:3002/api/tenant/info > /dev/null 2>&1; then
  echo -e "${GREEN}✅ API server is running${NC}"
else
  echo -e "${RED}❌ API server not running!${NC}"
  echo "   Start it: cd apps/api && yarn dev"
  exit 1
fi

# Check client app
echo "2. Checking client app (port 3001)..."
if curl -s http://localhost:3001 > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Client app is running${NC}"
else
  echo -e "${RED}❌ Client app not running!${NC}"
  echo "   Start it: cd apps/client && yarn dev"
  exit 1
fi

# Check hosts file
echo "3. Checking /etc/hosts for subdomains..."
if grep -q "shop1.localhost" /etc/hosts 2>/dev/null; then
  echo -e "${GREEN}✅ shop1.localhost found in /etc/hosts${NC}"
else
  echo -e "${YELLOW}⚠️  shop1.localhost not in /etc/hosts${NC}"
  echo "   Add it: sudo sh -c 'echo \"127.0.0.1 shop1.localhost\" >> /etc/hosts'"
fi

# Check tenants
echo "4. Checking tenants in database..."
if command -v psql &> /dev/null; then
  TENANTS=$(psql -U $(whoami) -d main_db -t -c "SELECT COUNT(*) FROM \"Tenant\";" 2>/dev/null | tr -d ' ')
  if [ -n "$TENANTS" ] && [ "$TENANTS" -gt 0 ]; then
    echo -e "${GREEN}✅ Found $TENANTS tenant(s)${NC}"
    
    # List tenants
    echo "   Tenants:"
    psql -U $(whoami) -d main_db -t -c "SELECT subdomain, name FROM \"Tenant\";" 2>/dev/null | while read line; do
      if [ -n "$line" ]; then
        echo "     - $line"
      fi
    done
  else
    echo -e "${YELLOW}⚠️  No tenants found${NC}"
    echo "   Create one at: http://localhost:3000"
  fi
else
  echo -e "${YELLOW}⚠️  psql not found, skipping tenant check${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}Test URLs:${NC}"
echo "  📋 Admin App:    http://localhost:3000"
echo "  🏪 Client App:   http://shop1.localhost:3001"
echo "  🔌 API Server:   http://localhost:3002"
echo ""
echo -e "${YELLOW}Note:${NC} Replace 'shop1' with your actual tenant subdomain"
echo -e "${GREEN}════════════════════════════════════════${NC}"

#!/bin/bash

# ============================================================================
# Test Axiom Logging Script
# ============================================================================
# This script tests Axiom logging configuration and sends test logs
#
# Usage:
#   ./scripts/test-axiom-logging.sh [API_URL] [AUTH_TOKEN]
#
# Example:
#   ./scripts/test-axiom-logging.sh https://dev-api.anyrent.shop YOUR_TOKEN
#   ./scripts/test-axiom-logging.sh http://localhost:3002 YOUR_TOKEN
# ============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get API URL and token from arguments or environment
API_URL="${1:-${API_URL:-http://localhost:3002}}"
AUTH_TOKEN="${2:-${AUTH_TOKEN}}"

# Remove trailing slash from API URL
API_URL="${API_URL%/}"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Axiom Logging Test Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if token is provided
if [ -z "$AUTH_TOKEN" ]; then
  echo -e "${RED}❌ Error: AUTH_TOKEN is required${NC}"
  echo ""
  echo "Usage:"
  echo "  ./scripts/test-axiom-logging.sh [API_URL] [AUTH_TOKEN]"
  echo ""
  echo "Or set environment variables:"
  echo "  export API_URL=https://dev-api.anyrent.shop"
  echo "  export AUTH_TOKEN=your-token-here"
  echo "  ./scripts/test-axiom-logging.sh"
  echo ""
  exit 1
fi

echo -e "${GREEN}✓ API URL:${NC} $API_URL"
echo -e "${GREEN}✓ Auth Token:${NC} ${AUTH_TOKEN:0:20}..."
echo ""

# ============================================================================
# Step 1: Check Logging Status
# ============================================================================
echo -e "${BLUE}Step 1: Checking logging status...${NC}"
echo ""

STATUS_RESPONSE=$(curl -s -X GET \
  "$API_URL/api/system/logging-status" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json")

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to connect to API${NC}"
  exit 1
fi

# Check if response contains error
if echo "$STATUS_RESPONSE" | grep -q '"success":false'; then
  echo -e "${RED}❌ Error checking logging status:${NC}"
  echo "$STATUS_RESPONSE" | jq '.' 2>/dev/null || echo "$STATUS_RESPONSE"
  exit 1
fi

# Extract Axiom configuration
AXIOM_ENABLED=$(echo "$STATUS_RESPONSE" | jq -r '.data.axiomLogging.enabled // false' 2>/dev/null || echo "false")
AXIOM_STATUS=$(echo "$STATUS_RESPONSE" | jq -r '.data.axiomLogging.status // "unknown"' 2>/dev/null || echo "unknown")
AXIOM_DATASET=$(echo "$STATUS_RESPONSE" | jq -r '.data.axiomLogging.dataset // "unknown"' 2>/dev/null || echo "unknown")
AXIOM_LOG_LEVEL=$(echo "$STATUS_RESPONSE" | jq -r '.data.axiomLogging.logLevel // "unknown"' 2>/dev/null || echo "unknown")

echo -e "${GREEN}✓ Logging Status:${NC}"
echo "  - Axiom Enabled: $AXIOM_ENABLED"
echo "  - Axiom Status: $AXIOM_STATUS"
echo "  - Dataset: $AXIOM_DATASET"
echo "  - Log Level: $AXIOM_LOG_LEVEL"
echo ""

if [ "$AXIOM_ENABLED" != "true" ]; then
  echo -e "${YELLOW}⚠ Warning: Axiom logging is not enabled${NC}"
  echo "  Set AXIOM_TOKEN and AXIOM_ORG_ID environment variables to enable"
  echo ""
fi

# ============================================================================
# Step 2: Get Test Configuration
# ============================================================================
echo -e "${BLUE}Step 2: Getting test configuration...${NC}"
echo ""

TEST_INFO_RESPONSE=$(curl -s -X GET \
  "$API_URL/api/system/test-axiom" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json")

if echo "$TEST_INFO_RESPONSE" | grep -q '"success":false'; then
  echo -e "${RED}❌ Error getting test configuration:${NC}"
  echo "$TEST_INFO_RESPONSE" | jq '.' 2>/dev/null || echo "$TEST_INFO_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✓ Test endpoint is available${NC}"
echo ""

# ============================================================================
# Step 3: Send Test Logs
# ============================================================================
echo -e "${BLUE}Step 3: Sending test logs to Axiom...${NC}"
echo ""

# Generate unique test ID
TEST_ID=$(date +%s)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Test log levels
LOG_LEVELS=("info" "warn" "error" "debug")

for level in "${LOG_LEVELS[@]}"; do
  echo -e "${YELLOW}  → Sending ${level} log...${NC}"
  
  TEST_RESPONSE=$(curl -s -X POST \
    "$API_URL/api/system/test-axiom" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"level\": \"$level\",
      \"message\": \"Test Axiom logging - $level level\",
      \"data\": {
        \"testId\": $TEST_ID,
        \"testLevel\": \"$level\",
        \"timestamp\": \"$TIMESTAMP\",
        \"script\": \"test-axiom-logging.sh\"
      }
    }")
  
  if echo "$TEST_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}    ✓ ${level} log sent successfully${NC}"
  else
    echo -e "${RED}    ✗ Failed to send ${level} log${NC}"
    echo "$TEST_RESPONSE" | jq '.' 2>/dev/null || echo "$TEST_RESPONSE"
  fi
  
  # Small delay between requests
  sleep 0.5
done

echo ""

# ============================================================================
# Step 4: Instructions
# ============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Next Steps: Verify Logs on Axiom${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}1. Go to Axiom Dashboard:${NC} https://app.axiom.co"
echo -e "${GREEN}2. Select dataset:${NC} $AXIOM_DATASET"
echo -e "${GREEN}3. Query logs using:${NC}"
echo ""
echo -e "${YELLOW}   Query 1: Find all test logs${NC}"
echo "   ['testId'] = $TEST_ID"
echo ""
echo -e "${YELLOW}   Query 2: Find specific level${NC}"
echo "   ['level'] = 'info' and ['testId'] = $TEST_ID"
echo ""
echo -e "${YELLOW}   Query 3: Find by script${NC}"
echo "   ['script'] = 'test-axiom-logging.sh' and ['testId'] = $TEST_ID"
echo ""
echo -e "${GREEN}4. Logs should appear within a few seconds${NC}"
echo ""

# ============================================================================
# Summary
# ============================================================================
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}✓ Test ID:${NC} $TEST_ID"
echo -e "${GREEN}✓ Timestamp:${NC} $TIMESTAMP"
echo -e "${GREEN}✓ Logs sent:${NC} ${#LOG_LEVELS[@]} (${LOG_LEVELS[*]})"
echo -e "${GREEN}✓ Dataset:${NC} $AXIOM_DATASET"
echo ""
echo -e "${YELLOW}Note:${NC} If logs don't appear on Axiom:"
echo "  1. Check AXIOM_TOKEN and AXIOM_ORG_ID are set correctly"
echo "  2. Verify dataset exists on Axiom: $AXIOM_DATASET"
echo "  3. Check AXIOM_LOG_LEVEL (current: $AXIOM_LOG_LEVEL)"
echo "  4. Wait a few seconds for logs to be ingested"
echo ""

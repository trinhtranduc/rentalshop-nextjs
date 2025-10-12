#!/bin/bash

# Test script for all search APIs on Railway Dev
# Tests case-insensitive search for all entities

BASE_URL="https://dev-apis-development.up.railway.app/api"
TOKEN=""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================"
echo "🔍 Search APIs Testing Suite"
echo "========================================"
echo ""

# Login to get token
echo "📝 Logging in with merchant account..."
LOGIN_RESPONSE=$(curl -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"merchant1@example.com","password":"merchant123"}' \
  -s)

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.token // .token // empty')

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Login failed!${NC}"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo "Token: ${TOKEN:0:50}..."
echo ""

# Test 1: Categories - Search by name (case-insensitive)
echo "========================================"
echo "TEST 1: Categories - Search by name"
echo "========================================"

echo -e "${YELLOW}Test 1.1: Search 'electronics' (lowercase)${NC}"
RESULT=$(curl -X GET "${BASE_URL}/categories?q=electronics&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -s | jq '{success, message, total: (.data.total // (.data | length)), matches: [.data.categories[]? // .data[]? | select(.name | ascii_downcase | contains("electronics")) | .name][:3]}')
echo "$RESULT"
echo ""

echo -e "${YELLOW}Test 1.2: Search 'ELECTRONICS' (uppercase)${NC}"
RESULT=$(curl -X GET "${BASE_URL}/categories?q=ELECTRONICS&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -s | jq '{success, message, total: (.data.total // (.data | length)), matches: [.data.categories[]? // .data[]? | select(.name | ascii_downcase | contains("electronics")) | .name][:3]}')
echo "$RESULT"
echo ""

echo -e "${YELLOW}Test 1.3: Search 'FuRnItUrE' (mixed case)${NC}"
RESULT=$(curl -X GET "${BASE_URL}/categories?q=FuRnItUrE&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -s | jq '{success, message, total: (.data.total // (.data | length)), matches: [.data.categories[]? // .data[]? | select(.name | ascii_downcase | contains("furniture")) | .name][:3]}')
echo "$RESULT"
echo ""

# Test 2: Products - Search by name (case-insensitive)
echo "========================================"
echo "TEST 2: Products - Search by name"
echo "========================================"

echo -e "${YELLOW}Test 2.1: Search 'camera' (lowercase)${NC}"
RESULT=$(curl -X GET "${BASE_URL}/products?q=camera&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -s | jq '{success, message, total: .data.total, count: (.data.products | length), samples: [.data.products[0:3][]?.name // empty]}')
echo "$RESULT"
echo ""

echo -e "${YELLOW}Test 2.2: Search 'CAMERA' (uppercase)${NC}"
RESULT=$(curl -X GET "${BASE_URL}/products?q=CAMERA&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -s | jq '{success, message, total: .data.total, count: (.data.products | length), samples: [.data.products[0:3][]?.name // empty]}')
echo "$RESULT"
echo ""

echo -e "${YELLOW}Test 2.3: Search 'tool' (partial match)${NC}"
RESULT=$(curl -X GET "${BASE_URL}/products?q=tool&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -s | jq '{success, message, total: .data.total, count: (.data.products | length), samples: [.data.products[0:3][]?.name // empty]}')
echo "$RESULT"
echo ""

# Test 3: Outlets - Search by name (case-insensitive)
echo "========================================"
echo "TEST 3: Outlets - Search by name"
echo "========================================"

echo -e "${YELLOW}Test 3.1: Search 'outlet' (lowercase)${NC}"
RESULT=$(curl -X GET "${BASE_URL}/outlets?q=outlet&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -s | jq '{success, message, total: .data.total, count: (.data.outlets | length), samples: [.data.outlets[0:3][]?.name // empty]}')
echo "$RESULT"
echo ""

echo -e "${YELLOW}Test 3.2: Search 'OUTLET' (uppercase)${NC}"
RESULT=$(curl -X GET "${BASE_URL}/outlets?q=OUTLET&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -s | jq '{success, message, total: .data.total, count: (.data.outlets | length), samples: [.data.outlets[0:3][]?.name // empty]}')
echo "$RESULT"
echo ""

echo -e "${YELLOW}Test 3.3: Search 'Demo' (partial match)${NC}"
RESULT=$(curl -X GET "${BASE_URL}/outlets?q=Demo&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -s | jq '{success, message, total: .data.total, count: (.data.outlets | length), samples: [.data.outlets[0:3][]?.name // empty]}')
echo "$RESULT"
echo ""

# Test 4: Users - Search by name (case-insensitive)
echo "========================================"
echo "TEST 4: Users - Search by name"
echo "========================================"

echo -e "${YELLOW}Test 4.1: Search 'admin' (lowercase)${NC}"
RESULT=$(curl -X GET "${BASE_URL}/users?search=admin&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -s | jq '{success, total: .pagination.total, count: (.data | length), samples: [.data[0:3][]?.email // empty]}')
echo "$RESULT"
echo ""

echo -e "${YELLOW}Test 4.2: Search 'ADMIN' (uppercase)${NC}"
RESULT=$(curl -X GET "${BASE_URL}/users?search=ADMIN&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -s | jq '{success, total: .pagination.total, count: (.data | length), samples: [.data[0:3][]?.email // empty]}')
echo "$RESULT"
echo ""

echo -e "${YELLOW}Test 4.3: Search 'Staff' (mixed case)${NC}"
RESULT=$(curl -X GET "${BASE_URL}/users?search=Staff&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -s | jq '{success, total: .pagination.total, count: (.data | length), samples: [.data[0:3][]?.email // empty]}')
echo "$RESULT"
echo ""

# Test 5: Customers - Search by name (case-insensitive)
echo "========================================"
echo "TEST 5: Customers - Search by name"
echo "========================================"

echo -e "${YELLOW}Test 5.1: Search 'johnson' (lowercase)${NC}"
RESULT=$(curl -X GET "${BASE_URL}/customers?q=johnson&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -s | jq '{success, total: .data.total, count: (.data.customers | length), samples: [.data.customers[0:3][]? | "\(.firstName) \(.lastName)"] | unique}')
echo "$RESULT"
echo ""

echo -e "${YELLOW}Test 5.2: Search 'JOHNSON' (uppercase)${NC}"
RESULT=$(curl -X GET "${BASE_URL}/customers?q=JOHNSON&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -s | jq '{success, total: .data.total, count: (.data.customers | length), samples: [.data.customers[0:3][]? | "\(.firstName) \(.lastName)"] | unique}')
echo "$RESULT"
echo ""

# Test 6: Orders - Search by order number, customer name, customer phone (case-insensitive)
echo "========================================"
echo "TEST 6: Orders - Search by multiple fields"
echo "========================================"

echo -e "${YELLOW}Test 6.1: Search by order number 'ord' (lowercase)${NC}"
RESULT=$(curl -X GET "${BASE_URL}/orders?q=ord&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -s | jq '{success, total: .total, count: (.data | length), samples: [.data[0:3][]?.orderNumber // empty]}')
echo "$RESULT"
echo ""

echo -e "${YELLOW}Test 6.2: Search by order number 'ORD' (uppercase)${NC}"
RESULT=$(curl -X GET "${BASE_URL}/orders?q=ORD&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -s | jq '{success, total: .total, count: (.data | length), samples: [.data[0:3][]?.orderNumber // empty]}')
echo "$RESULT"
echo ""

echo -e "${YELLOW}Test 6.3: Search by customer name 'john' (lowercase)${NC}"
RESULT=$(curl -X GET "${BASE_URL}/orders?q=john&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -s | jq '{success, total: .total, count: (.data | length), samples: [.data[0:3][]? | {orderNumber, customerName: "\(.customer.firstName // "") \(.customer.lastName // "")"}]}')
echo "$RESULT"
echo ""

echo -e "${YELLOW}Test 6.4: Search by customer name 'JOHN' (uppercase)${NC}"
RESULT=$(curl -X GET "${BASE_URL}/orders?q=JOHN&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -s | jq '{success, total: .total, count: (.data | length), samples: [.data[0:3][]? | {orderNumber, customerName: "\(.customer.firstName // "") \(.customer.lastName // "")"}]}')
echo "$RESULT"
echo ""

echo ""
echo "========================================"
echo "✅ All tests completed!"
echo "========================================"
echo ""
echo "Summary:"
echo "- Categories: Search by name (case-insensitive)"
echo "- Products: Search by name (case-insensitive)"
echo "- Outlets: Search by name (case-insensitive)"
echo "- Users: Search by name/email (case-insensitive)"
echo "- Customers: Search by name (case-insensitive)"
echo "- Orders: Search by order number, customer name (case-insensitive)"
echo ""


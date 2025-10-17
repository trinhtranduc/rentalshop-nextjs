#!/bin/bash

# Quick check if UserSession migration is applied

echo "🔍 Checking Railway API status..."
echo ""

# Test login endpoint
RESPONSE=$(curl -s -X POST https://dev-apis-development.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rentalshop.com","password":"admin123"}')

echo "Response:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Check if table exists error
if echo "$RESPONSE" | grep -q "UserSession.*does not exist"; then
    echo "❌ UserSession table NOT found in database"
    echo ""
    echo "📋 To apply migration manually:"
    echo ""
    echo "1. Get DATABASE_URL from Railway:"
    echo "   - Go to Railway dashboard → PostgreSQL service"
    echo "   - Copy DATABASE_URL variable"
    echo ""
    echo "2. Apply migration:"
    echo "   export DATABASE_URL='postgresql://...'"
    echo "   npx prisma migrate deploy"
    echo ""
    echo "OR run:"
    echo "   ./scripts/apply-single-session-migration.sh"
    echo ""
elif echo "$RESPONSE" | grep -q '"success":true'; then
    echo "✅ Login successful! Single session is working!"
    TOKEN=$(echo "$RESPONSE" | jq -r '.data.token' 2>/dev/null)
    if [ ! -z "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
        echo "🎉 Token received: ${TOKEN:0:50}..."
    fi
else
    echo "⚠️  Unknown response. Check Railway deployment logs."
fi


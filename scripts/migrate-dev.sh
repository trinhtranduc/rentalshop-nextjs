#!/bin/bash
# ============================================================================
# Manual Migration to Development Database
# ============================================================================
# Run migration from local machine to development database (Railway)
#
# Usage:
#   ./scripts/migrate-dev.sh
#   # OR
#   railway run --service apis --environment development bash scripts/migrate-dev.sh
#
# This script will:
#   1. Try to use Railway CLI if available (recommended)
#   2. Fallback to DATABASE_URL if set manually
# ============================================================================

set -e

echo "🚀 Manual Migration to Development Database"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Railway CLI is available and we're in Railway environment
if command -v railway &> /dev/null && [ -n "$RAILWAY_ENVIRONMENT" ]; then
  echo "✅ Running in Railway environment - DATABASE_URL will be auto-injected"
  USE_RAILWAY_CLI=false  # Already in Railway, DATABASE_URL is available
elif command -v railway &> /dev/null; then
  echo "🔧 Railway CLI detected - Using Railway to run migration..."
  echo ""
  railway run --service apis --environment development \
    npx prisma migrate deploy --schema=./prisma/schema.prisma
  exit $?
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL is not set"
  echo ""
  echo "💡 Solutions:"
  echo ""
  echo "Option 1: Use Railway CLI (Recommended - Auto-injects DATABASE_URL)"
  echo "  railway run --service apis --environment development \\"
  echo "    npx prisma migrate deploy --schema=./prisma/schema.prisma"
  echo ""
  echo "Option 2: Get DATABASE_URL from Railway Dashboard"
  echo "  1. Open Railway Dashboard → Development environment"
  echo "  2. Go to PostgreSQL service → Connect → Public Network"
  echo "  3. Copy the connection string"
  echo "  4. Run: export DATABASE_URL=\"postgresql://...\""
  echo "  5. Run: ./scripts/migrate-dev.sh"
  echo ""
  echo "Option 3: Use Railway CLI to get DATABASE_URL"
  echo "  railway variables --service apis --environment development | grep DATABASE_URL"
  echo ""
  exit 1
fi

# Step 1: Generate Prisma Client
echo "📦 Step 1: Generating Prisma Client..."
npx prisma generate --schema=./prisma/schema.prisma
echo "✅ Prisma Client generated"
echo ""

# Step 2: Check migration status
echo "📊 Step 2: Checking migration status..."
npx prisma migrate status --schema=./prisma/schema.prisma
echo ""

# Step 3: Apply migrations
echo "🚀 Step 3: Applying migrations..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo ""
echo "✅ Migration completed successfully!"
echo ""

# Step 4: Verify
echo "🔍 Step 4: Verifying migration status..."
npx prisma migrate status --schema=./prisma/schema.prisma


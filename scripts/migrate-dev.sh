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
  echo "🔧 Railway CLI detected"
  echo ""
  echo "⚠️  Note: railway run executes command ON Railway server, not locally"
  echo "    This should work if Railway CLI is properly configured."
  echo ""
  echo "If you get 'Can't reach database' error, it means Railway CLI"
  echo "is injecting Internal URL which only works within Railway network."
  echo ""
  read -p "Continue with Railway CLI? (yes/no): " CONTINUE
  if [ "$CONTINUE" = "yes" ]; then
    railway run --service apis --environment development \
      npx prisma migrate deploy --schema=./prisma/schema.prisma
    exit $?
  else
    echo ""
    echo "💡 Alternative: Use Public DATABASE_URL (see instructions below)"
    echo ""
  fi
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL is not set"
  echo ""
  echo "💡 Solutions:"
  echo ""
  echo "Option 1: Get PUBLIC DATABASE_URL from Railway Dashboard (Recommended for local runs)"
  echo "  1. Open Railway Dashboard → Development environment"
  echo "  2. Go to PostgreSQL service → Connect → Public Network"
  echo "  3. Copy the PUBLIC connection string (proxy.rlwy.net)"
  echo "  4. Run: export DATABASE_URL=\"postgresql://postgres:pass@proxy.rlwy.net:port/railway\""
  echo "  5. Run: ./scripts/migrate-dev.sh"
  echo ""
  echo "Option 2: Run migration via Railway Dashboard"
  echo "  1. Railway Dashboard → Development → API service"
  echo "  2. Deployments tab → Run Command"
  echo "  3. Command: npx prisma migrate deploy --schema=./prisma/schema.prisma"
  echo ""
  echo "Option 3: Use Railway Shell (Interactive)"
  echo "  railway shell --service apis --environment development"
  echo "  # Then run: npx prisma migrate deploy --schema=./prisma/schema.prisma"
  echo ""
  exit 1
fi

# Check if DATABASE_URL is Internal URL (won't work from local)
if [[ "$DATABASE_URL" == *"railway.internal"* ]]; then
  echo "⚠️  WARNING: Internal Railway URL detected!"
  echo "   Internal URLs (railway.internal) only work within Railway network."
  echo "   They cannot be used from your local machine."
  echo ""
  echo "💡 Solutions:"
  echo ""
  echo "Option 1: Get PUBLIC DATABASE_URL from Railway Dashboard"
  echo "  1. Railway Dashboard → Development → PostgreSQL service"
  echo "  2. Connect → Public Network → Copy connection string"
  echo "  3. Should look like: postgresql://postgres:pass@proxy.rlwy.net:port/railway"
  echo "  4. Run: export DATABASE_URL=\"<public-url>\""
  echo "  5. Run: ./scripts/migrate-dev.sh"
  echo ""
  echo "Option 2: Run migration via Railway Dashboard"
  echo "  1. Railway Dashboard → Development → API service"
  echo "  2. Deployments tab → Run Command"
  echo "  3. Command: npx prisma migrate deploy --schema=./prisma/schema.prisma"
  echo ""
  echo "Option 3: Use Railway Shell"
  echo "  railway shell --service apis --environment development"
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


#!/bin/bash
# ============================================================================
# Manual Migration to Development Database
# ============================================================================
# Run migration from local machine to development database (Railway)
#
# Usage:
#   ./scripts/migrate-dev.sh
#
# Requirements:
#   - DATABASE_URL must point to development database
#   - Can be set via Railway CLI or manually
# ============================================================================

set -e

echo "🚀 Manual Migration to Development Database"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL is not set"
  echo ""
  echo "Option 1: Use Railway CLI (Recommended)"
  echo "  railway run --service apis --environment development npx prisma migrate deploy --schema=./prisma/schema.prisma"
  echo ""
  echo "Option 2: Set DATABASE_URL manually"
  echo "  export DATABASE_URL=\"postgresql://user:pass@host:port/db\""
  echo "  ./scripts/migrate-dev.sh"
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


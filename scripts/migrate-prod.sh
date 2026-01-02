#!/bin/bash
# ============================================================================
# Manual Migration to Production Database
# ============================================================================
# Run migration from local machine to production database (Railway)
#
# ⚠️  WARNING: This will modify production database!
# Make sure you have tested the migration on development first!
#
# Usage:
#   ./scripts/migrate-prod.sh
#
# Requirements:
#   - DATABASE_URL must point to production database
#   - Use Railway CLI for security
# ============================================================================

set -e

echo "⚠️  WARNING: This will migrate PRODUCTION database!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Are you sure you want to continue? (yes/NO): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo "❌ Migration cancelled"
  exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL is not set"
  echo ""
  echo "Recommended: Use Railway CLI for security"
  echo "  railway run --service apis --environment production npx prisma migrate deploy --schema=./prisma/schema.prisma"
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
echo "🚀 Step 3: Applying migrations to PRODUCTION..."
npx prisma migrate deploy --schema=./prisma/schema.prisma

echo ""
echo "✅ Production migration completed successfully!"
echo ""

# Step 4: Verify
echo "🔍 Step 4: Verifying migration status..."
npx prisma migrate status --schema=./prisma/schema.prisma


#!/bin/bash
# ============================================================================
# Fix Production Migrations Script
# ============================================================================
# This script resolves failed migrations and applies pending migrations on production
#
# Usage:
#   # Set DATABASE_URL and run
#   export DATABASE_URL="postgresql://postgres:password@host:port/database"
#   ./scripts/fix-production-migrations.sh
#
#   # Or via Railway CLI
#   railway run --service apis --environment production ./scripts/fix-production-migrations.sh
# ============================================================================

set -e

SCHEMA_PATH="prisma/schema.prisma"

echo "🔧 Fixing Production Migrations"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL is not set"
  echo ""
  echo "💡 Set DATABASE_URL and run again:"
  echo "   export DATABASE_URL=\"postgresql://postgres:password@host:port/database\""
  echo "   ./scripts/fix-production-migrations.sh"
  exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""

# Step 1: Check migration status
echo "📋 Step 1: Checking migration status..."
echo ""
npx prisma migrate status --schema="${SCHEMA_PATH}" || true
echo ""

# Step 2: Resolve failed migration
echo "🔧 Step 2: Resolving failed migration..."
echo ""
echo "⚠️  Resolving: 20260213093402_add_collateral_image_url"
echo "   (This migration was duplicate - column already exists)"
echo ""

# Mark as applied (column already exists from previous migration)
echo "✅ Marking migration as applied (column already exists)..."
npx prisma migrate resolve --applied 20260213093402_add_collateral_image_url --schema="${SCHEMA_PATH}"

echo ""
echo "✅ Failed migration resolved!"
echo ""

# Step 3: Apply pending migrations
echo "📦 Step 3: Applying pending migrations..."
echo ""
echo "   Expected migrations to apply:"
echo "   - 20260209093447_add_locale_to_posts"
echo "   - 20260227150000_add_notes_images_fields"
echo ""

MIGRATION_OUTPUT=$(npx prisma migrate deploy --schema="${SCHEMA_PATH}" 2>&1)
MIGRATION_EXIT=$?

if [ $MIGRATION_EXIT -eq 0 ]; then
  echo "$MIGRATION_OUTPUT"
  echo ""
  echo "✅ All migrations applied successfully!"
else
  echo "$MIGRATION_OUTPUT"
  echo ""
  echo "❌ Migration failed - check output above"
  exit 1
fi

echo ""

# Step 4: Verify migration status
echo "🔍 Step 4: Verifying migration status..."
echo ""
npx prisma migrate status --schema="${SCHEMA_PATH}"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Production migrations fixed successfully!"
echo ""

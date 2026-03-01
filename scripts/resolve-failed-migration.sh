#!/bin/bash
# ============================================================================
# Resolve Failed Migration Script
# ============================================================================
# This script helps resolve failed migrations in production database
#
# Usage:
#   ./scripts/resolve-failed-migration.sh <migration-name> [--applied|--rolled-back]
#
# Examples:
#   # Mark migration as applied (if column already exists)
#   ./scripts/resolve-failed-migration.sh 20260213093402_add_collateral_image_url --applied
#
#   # Mark migration as rolled-back (if need to re-apply)
#   ./scripts/resolve-failed-migration.sh 20260213093402_add_collateral_image_url --rolled-back
# ============================================================================

set -e

MIGRATION_NAME=$1
RESOLVE_TYPE=$2

if [ -z "$MIGRATION_NAME" ]; then
  echo "❌ Error: Migration name is required"
  echo ""
  echo "Usage: $0 <migration-name> [--applied|--rolled-back]"
  echo ""
  echo "Examples:"
  echo "  $0 20260213093402_add_collateral_image_url --applied"
  echo "  $0 20260213093402_add_collateral_image_url --rolled-back"
  exit 1
fi

if [ -z "$RESOLVE_TYPE" ]; then
  echo "❌ Error: Resolve type is required (--applied or --rolled-back)"
  echo ""
  echo "Usage: $0 <migration-name> [--applied|--rolled-back]"
  exit 1
fi

SCHEMA_PATH="prisma/schema.prisma"

echo "🔧 Resolving failed migration: $MIGRATION_NAME"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Railway CLI is available
if command -v railway &> /dev/null && [ -n "$RAILWAY_ENVIRONMENT" ]; then
  echo "✅ Running in Railway environment - DATABASE_URL will be auto-injected"
  USE_RAILWAY_CLI=false
elif command -v railway &> /dev/null; then
  echo "🔧 Railway CLI detected - Using Railway to resolve migration..."
  echo ""
  
  if [ "$RESOLVE_TYPE" == "--applied" ]; then
    railway run --service apis --environment production \
      npx prisma migrate resolve --applied "$MIGRATION_NAME" --schema=./prisma/schema.prisma
  elif [ "$RESOLVE_TYPE" == "--rolled-back" ]; then
    railway run --service apis --environment production \
      npx prisma migrate resolve --rolled-back "$MIGRATION_NAME" --schema=./prisma/schema.prisma
  else
    echo "❌ Error: Invalid resolve type. Use --applied or --rolled-back"
    exit 1
  fi
  
  echo ""
  echo "✅ Migration resolved successfully!"
  echo ""
  echo "📦 Now applying pending migrations..."
  railway run --service apis --environment production \
    npx prisma migrate deploy --schema=./prisma/schema.prisma
  exit $?
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL is not set"
  echo ""
  echo "💡 Recommended: Use Railway CLI (Auto-injects DATABASE_URL)"
  echo "  railway run --service apis --environment production \\"
  echo "    npx prisma migrate resolve $RESOLVE_TYPE \"$MIGRATION_NAME\" --schema=./prisma/schema.prisma"
  echo ""
  exit 1
fi

# Resolve migration
echo "🔧 Resolving migration with type: $RESOLVE_TYPE"
if [ "$RESOLVE_TYPE" == "--applied" ]; then
  npx prisma migrate resolve --applied "$MIGRATION_NAME" --schema="${SCHEMA_PATH}"
elif [ "$RESOLVE_TYPE" == "--rolled-back" ]; then
  npx prisma migrate resolve --rolled-back "$MIGRATION_NAME" --schema="${SCHEMA_PATH}"
else
  echo "❌ Error: Invalid resolve type. Use --applied or --rolled-back"
  exit 1
fi

echo ""
echo "✅ Migration resolved successfully!"
echo ""
echo "📦 Now applying pending migrations..."
npx prisma migrate deploy --schema="${SCHEMA_PATH}"

echo ""
echo "✅ All migrations applied successfully!"

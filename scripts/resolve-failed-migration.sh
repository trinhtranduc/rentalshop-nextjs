#!/bin/bash
# ============================================================================
# Resolve Failed Migration Script
# ============================================================================
# This script resolves failed migrations on Railway
# Usage: ./scripts/resolve-failed-migration.sh [migration-name] [--applied|--rolled-back]
#
# Example:
#   ./scripts/resolve-failed-migration.sh 20251121153338_create_outlet_stock --applied
#   ./scripts/resolve-failed-migration.sh 20251121153338_create_outlet_stock --rolled-back

set -e

MIGRATION_NAME=$1
RESOLVE_TYPE=$2

if [ -z "$MIGRATION_NAME" ] || [ -z "$RESOLVE_TYPE" ]; then
    echo "❌ Usage: $0 <migration-name> [--applied|--rolled-back]"
    echo ""
    echo "Example:"
    echo "  $0 20251121153338_create_outlet_stock --applied"
    echo "  $0 20251121153338_create_outlet_stock --rolled-back"
    exit 1
fi

if [ "$RESOLVE_TYPE" != "--applied" ] && [ "$RESOLVE_TYPE" != "--rolled-back" ]; then
    echo "❌ RESOLVE_TYPE must be --applied or --rolled-back"
    exit 1
fi

echo "🔧 Resolving failed migration: $MIGRATION_NAME"
echo "📋 Type: $RESOLVE_TYPE"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL not set"
    echo "💡 Using Railway CLI to run on Railway..."
    echo ""
    
    # Run on Railway
    railway run --service dev-apis npx prisma migrate resolve $RESOLVE_TYPE $MIGRATION_NAME --schema=./prisma/schema.prisma
    
    echo ""
    echo "✅ Migration resolved"
    echo "🔄 Now run migration:"
    echo "   railway run --service dev-apis yarn railway:migrate"
else
    echo "✅ DATABASE_URL is set, running locally..."
    echo ""
    
    # Run locally
    npx prisma migrate resolve $RESOLVE_TYPE $MIGRATION_NAME --schema=./prisma/schema.prisma
    
    echo ""
    echo "✅ Migration resolved"
    echo "🔄 Now run migration:"
    echo "   yarn railway:migrate"
fi


#!/bin/bash
# ============================================================================
# Fix Migration Conflict Script
# ============================================================================
# This script helps resolve migration conflicts on Railway
# Usage: ./scripts/fix-migration-conflict.sh

set -e

echo "🔧 Fixing migration conflict..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set"
    echo "💡 Tip: Set DATABASE_URL or run on Railway with: railway run bash scripts/fix-migration-conflict.sh"
    exit 1
fi

echo "📊 Checking migration status..."
npx prisma migrate status --schema=./prisma/schema.prisma || {
    echo "⚠️  Migration status check failed"
}

echo ""
echo "🔍 Checking for duplicate migrations..."
DUPLICATE_COUNT=$(ls -d prisma/migrations/*_add_password_reset 2>/dev/null | wc -l | tr -d ' ')
if [ "$DUPLICATE_COUNT" -gt 1 ]; then
    echo "⚠️  Found $DUPLICATE_COUNT password reset migrations"
    echo "📋 Listing migrations:"
    ls -d prisma/migrations/*_add_password_reset
    echo ""
    echo "💡 Keep only the latest migration (highest timestamp)"
    echo "💡 Delete old migrations manually:"
    echo "   rm -rf prisma/migrations/20250115120000_add_password_reset"
else
    echo "✅ No duplicate migrations found"
fi

echo ""
echo "🔄 Attempting to resolve migration state..."

# Try to resolve failed migration
echo "📦 Step 1: Resolving failed migration..."
npx prisma migrate resolve --applied 20251118131443_add_password_reset --schema=./prisma/schema.prisma 2>/dev/null || {
    echo "⚠️  Could not resolve migration (may already be resolved or table exists)"
}

echo ""
echo "📦 Step 2: Checking if PasswordReset table exists..."
npx prisma db execute --stdin --schema=./prisma/schema.prisma <<EOF || echo "⚠️  Could not check table (may need to connect to database)"
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'PasswordReset'
);
EOF

echo ""
echo "📦 Step 3: Running migration deploy..."
npx prisma migrate deploy --schema=./prisma/schema.prisma || {
    echo "⚠️  Migration deploy failed"
    echo ""
    echo "💡 If table already exists, you can:"
    echo "   1. Mark migration as applied:"
    echo "      npx prisma migrate resolve --applied 20251118131443_add_password_reset"
    echo ""
    echo "   2. Or manually create table if missing:"
    echo "      Check prisma/migrations/20251118131443_add_password_reset/migration.sql"
}

echo ""
echo "✅ Migration conflict fix completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Check migration status: npx prisma migrate status"
echo "   2. If still failing, check Railway logs"
echo "   3. Verify PasswordReset table exists"


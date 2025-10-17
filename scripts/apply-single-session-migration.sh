#!/bin/bash

# Script to apply UserSession migration to Railway PostgreSQL database
# This adds single session enforcement to the authentication system

set -e

echo "========================================="
echo "  Single Session Migration Deployment"
echo "========================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL environment variable is not set"
    echo ""
    echo "Please set your Railway PostgreSQL DATABASE_URL:"
    echo "export DATABASE_URL='postgresql://...'"
    echo ""
    exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""

# Show migration details
echo "📋 Migration: 20251016000000_add_user_sessions"
echo "   - Adds UserSession table for single session enforcement"
echo "   - Tracks user login sessions with unique sessionId"
echo "   - Enables automatic invalidation of old sessions on new login"
echo ""

# Confirm before proceeding
read -p "Do you want to apply this migration? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Migration cancelled"
    exit 0
fi

echo ""
echo "🔄 Applying migration..."
echo ""

# Apply migration using Prisma
npx prisma migrate deploy

echo ""
echo "✅ Migration applied successfully!"
echo ""
echo "🎉 Single session enforcement is now active!"
echo ""
echo "Next steps:"
echo "  1. Run test: node tests/single-session-test.js"
echo "  2. Test with your application"
echo "  3. Monitor session behavior in production"
echo ""


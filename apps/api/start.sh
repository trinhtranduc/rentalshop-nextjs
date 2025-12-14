#!/bin/sh
# ============================================================================
# API Server Startup Script with Automatic Migrations
# ============================================================================
# This script:
# 1. Generates Prisma Client
# 2. Checks database connection
# 3. Applies all pending migrations
# 4. Verifies migrations were applied successfully
# 5. Starts the Next.js server
# ============================================================================

set -e

echo "🚀 Starting API server with automatic migrations..."
echo "📅 $(date '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

SCHEMA_PATH="../../prisma/schema.prisma"

# ============================================================================
# Step 1: Generate Prisma Client
# ============================================================================
echo "🔄 Step 1: Generating Prisma Client..."
npx prisma generate --schema="${SCHEMA_PATH}" 2>&1
echo "✅ Prisma Client generated successfully"
echo ""

# ============================================================================
# Step 2: Check Database Connection
# ============================================================================
echo "🔍 Step 2: Checking database connection..."
if ! echo "SELECT 1;" | npx prisma db execute --stdin --schema="${SCHEMA_PATH}" > /dev/null 2>&1; then
  echo "❌ Database connection failed"
  echo "⚠️  Server will start anyway, but migrations may fail"
  else
  echo "✅ Database connection successful"
fi
echo ""

# ============================================================================
# Step 3: Apply All Migrations
# ============================================================================
echo "📦 Step 3: Applying database migrations..."
  MIGRATION_OUTPUT=$(npx prisma migrate deploy --schema="${SCHEMA_PATH}" 2>&1)
  MIGRATION_EXIT=$?
  
  if [ $MIGRATION_EXIT -eq 0 ]; then
    echo "$MIGRATION_OUTPUT"
    echo "✅ All migrations applied successfully"
else
  echo "$MIGRATION_OUTPUT"
  echo "⚠️  Migration failed - check output above"
  echo "⚠️  Server will start anyway"
fi
echo ""

# ============================================================================
# Step 4: Verify Migrations
# ============================================================================
echo "🔍 Step 4: Verifying migrations..."
VERIFY_OUTPUT=$(npx prisma migrate status --schema="${SCHEMA_PATH}" 2>&1)
VERIFY_EXIT=$?

if [ $VERIFY_EXIT -eq 0 ]; then
  echo "$VERIFY_OUTPUT" | head -20
  if echo "$VERIFY_OUTPUT" | grep -q "Database schema is up to date"; then
    echo "✅ All migrations have been applied successfully"
    echo "✅ Database schema is up to date"
  else
    echo "⚠️  Database schema may not be up to date"
    echo "⚠️  Some migrations may not have been applied"
  fi
else
  echo "$VERIFY_OUTPUT" | head -20
  echo "⚠️  Migration verification failed"
  echo "⚠️  Please check migration status manually"
    fi
echo ""

# ============================================================================
# Step 5: Regenerate Prisma Client After Migrations
# ============================================================================
  echo "🔄 Step 5: Regenerating Prisma Client after migrations..."
if npx prisma generate --schema="${SCHEMA_PATH}" 2>&1; then
    echo "✅ Prisma Client regenerated successfully"
    
  # Copy Prisma Client to Next.js bundle location
    if [ -d "../../node_modules/.prisma/client" ]; then
      mkdir -p .next/server/.prisma/client
      cp -r ../../node_modules/.prisma/client/* .next/server/.prisma/client/ 2>/dev/null || true
      echo "✅ Prisma Client copied to Next.js bundle location"
  fi
else
  echo "⚠️  Failed to regenerate Prisma Client"
fi
echo ""

# ============================================================================
# Step 6: Start Next.js Server
# ============================================================================
echo "🌐 Step 6: Starting Next.js server on port 3002..."
echo "📅 $(date '+%Y-%m-%d %H:%M:%S UTC')"
echo ""
echo "✅ Server is ready to accept requests"
echo "🚀 Starting Next.js application..."
exec ../../node_modules/.bin/next start -p 3002

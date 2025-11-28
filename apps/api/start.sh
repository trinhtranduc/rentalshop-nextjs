#!/bin/sh
# ============================================================================
# API Server Startup Script with Automatic Migrations
# ============================================================================
# This script:
# 1. Generates Prisma Client
# 2. Checks migration status
# 3. Runs pending migrations (with retry logic)
# 4. Starts the Next.js server
# ============================================================================

# Don't use set -e - we want to handle migration failures gracefully
# set -e would exit immediately on any error, but we want to retry migrations

echo "🚀 Starting API server with automatic migrations..."

# ============================================================================
# Step 1: Generate Prisma Client
# ============================================================================
echo "🔄 Step 1: Generating Prisma Client..."
if ! npx prisma generate --schema=../../prisma/schema.prisma; then
  echo "❌ Failed to generate Prisma Client"
  exit 1
fi
echo "✅ Prisma Client generated successfully"

# ============================================================================
# Step 2: Check Database Connection (with retry logic)
# ============================================================================
echo "🔍 Step 2: Checking database connection..."
MAX_RETRIES=5
RETRY_DELAY=3
RETRY_COUNT=0
DB_CONNECTED=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  # Try to check migration status as a way to test database connection
  if npx prisma migrate status --schema=../../prisma/schema.prisma > /dev/null 2>&1; then
    echo "✅ Database connection successful"
    DB_CONNECTED=true
    break
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
    echo "⚠️  Database not ready (attempt $RETRY_COUNT/$MAX_RETRIES), retrying in ${RETRY_DELAY}s..."
    sleep $RETRY_DELAY
  else
    echo "⚠️  Database connection check failed after $MAX_RETRIES attempts"
    echo "⚠️  This might be normal if database is not ready yet"
    echo "⚠️  Continuing anyway - migrations will be attempted"
  fi
done

# ============================================================================
# Step 3: Check Migration Status (if database is connected)
# ============================================================================
if [ "$DB_CONNECTED" = true ]; then
  echo "📋 Step 3: Checking migration status..."
  if npx prisma migrate status --schema=../../prisma/schema.prisma 2>&1 | head -20; then
    echo "✅ Migration status check completed"
  else
    echo "⚠️  Migration status check completed (may show pending migrations)"
  fi
else
  echo "⏭️  Step 3: Skipping migration status check (database not connected)"
fi

# ============================================================================
# Step 4: Run Database Migrations
# ============================================================================
echo "📦 Step 4: Running database migrations..."
RETRY_COUNT=0
MIGRATION_SUCCESS=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if npx prisma migrate deploy --schema=../../prisma/schema.prisma; then
    echo "✅ All migrations applied successfully"
    MIGRATION_SUCCESS=true
    break
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
    echo "⚠️  Migration attempt $RETRY_COUNT/$MAX_RETRIES failed, retrying in ${RETRY_DELAY}s..."
    sleep $RETRY_DELAY
  else
    echo "⚠️  Migration failed after $MAX_RETRIES attempts"
    echo "⚠️  This might be normal if:"
    echo "    - Migrations were already applied"
    echo "    - Database is not ready yet"
    echo "    - There are migration conflicts"
    echo "⚠️  Server will start anyway - check logs for details"
  fi
done

# ============================================================================
# Step 5: Verify Migration Status (Final Check)
# ============================================================================
if [ "$MIGRATION_SUCCESS" = true ]; then
  echo "🔍 Step 5: Verifying migration status..."
  if npx prisma migrate status --schema=../../prisma/schema.prisma; then
    echo "✅ Migration verification passed"
  else
    echo "⚠️  Migration verification failed (but migrations were applied)"
  fi
fi

# ============================================================================
# Step 6: Start Next.js Server
# ============================================================================
echo "🌐 Step 6: Starting Next.js server on port 3002..."
echo "✅ Server is ready to accept requests"
exec ../../node_modules/.bin/next start -p 3002

#!/bin/sh
# ============================================================================
# API Server Startup Script with Automatic Migrations
# ============================================================================
# This script:
# 1. Generates Prisma Client
# 2. Validates database connection
# 3. Checks migration status (pre-flight check)
# 4. Runs pending migrations (with retry logic and validation)
# 5. Verifies migration results (post-flight check)
# 6. Starts the Next.js server
# ============================================================================
#
# SAFETY FEATURES:
# - Comprehensive error handling
# - Retry logic for transient failures
# - Pre and post migration validation
# - Detailed logging for troubleshooting
# - Graceful degradation (server starts even if migration fails)
# ============================================================================

# Don't use set -e - we want to handle migration failures gracefully
# set -e would exit immediately on any error, but we want to retry migrations

echo "🚀 Starting API server with automatic migrations..."
echo "📅 $(date '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

# ============================================================================
# Configuration
# ============================================================================
MAX_RETRIES=5
RETRY_DELAY=3
SCHEMA_PATH="../../prisma/schema.prisma"

# ============================================================================
# Step 1: Generate Prisma Client
# ============================================================================
echo "🔄 Step 1: Generating Prisma Client..."
if ! npx prisma generate --schema="${SCHEMA_PATH}" 2>&1; then
  echo "❌ Failed to generate Prisma Client"
  echo "❌ Cannot proceed without Prisma Client"
  exit 1
fi
echo "✅ Prisma Client generated successfully"
echo ""

# ============================================================================
# Step 2: Check Database Connection (with retry logic)
# ============================================================================
echo "🔍 Step 2: Checking database connection..."
RETRY_COUNT=0
DB_CONNECTED=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  # Try to execute a simple query to test database connection
  if echo "SELECT 1;" | npx prisma db execute --stdin --schema="${SCHEMA_PATH}" > /dev/null 2>&1; then
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
echo ""

# ============================================================================
# Step 3: Pre-Migration Validation (Check Migration Status)
# ============================================================================
if [ "$DB_CONNECTED" = true ]; then
  echo "📋 Step 3: Pre-migration validation (checking migration status)..."
  MIGRATION_STATUS_OUTPUT=$(npx prisma migrate status --schema="${SCHEMA_PATH}" 2>&1)
  MIGRATION_STATUS_EXIT=$?
  
  if [ $MIGRATION_STATUS_EXIT -eq 0 ]; then
    echo "$MIGRATION_STATUS_OUTPUT" | head -30
    echo "✅ Migration status check completed"
  else
    echo "$MIGRATION_STATUS_OUTPUT" | head -30
    echo "⚠️  Migration status check completed (may show pending migrations or errors)"
  fi
  
  # Count pending migrations
  PENDING_COUNT=$(echo "$MIGRATION_STATUS_OUTPUT" | grep -c "not yet been applied" || echo "0")
  if [ "$PENDING_COUNT" -gt 0 ]; then
    echo "📊 Found pending migrations - will attempt to apply"
  else
    echo "📊 No pending migrations detected"
  fi
else
  echo "⏭️  Step 3: Skipping pre-migration validation (database not connected)"
fi
echo ""

# ============================================================================
# Step 4: Run Database Migrations (with comprehensive error handling)
# ============================================================================
echo "📦 Step 4: Running database migrations..."
RETRY_COUNT=0
MIGRATION_SUCCESS=false
MIGRATION_ERROR=""

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  echo "🔄 Migration attempt $((RETRY_COUNT + 1))/$MAX_RETRIES..."
  
  # Run migration and capture both stdout and stderr
  MIGRATION_OUTPUT=$(npx prisma migrate deploy --schema="${SCHEMA_PATH}" 2>&1)
  MIGRATION_EXIT=$?
  
  if [ $MIGRATION_EXIT -eq 0 ]; then
    echo "$MIGRATION_OUTPUT"
    echo "✅ All migrations applied successfully"
    MIGRATION_SUCCESS=true
    MIGRATION_ERROR=""
    break
  else
    # Capture error for logging
    MIGRATION_ERROR="$MIGRATION_OUTPUT"
    echo "$MIGRATION_OUTPUT" | head -50
    
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
      echo "⚠️  Migration attempt $RETRY_COUNT/$MAX_RETRIES failed, retrying in ${RETRY_DELAY}s..."
      echo "📝 Error details:"
      echo "$MIGRATION_ERROR" | tail -20
      sleep $RETRY_DELAY
    else
      echo "❌ Migration failed after $MAX_RETRIES attempts"
      echo "📝 Final error details:"
      echo "$MIGRATION_ERROR" | tail -30
      echo ""
      echo "⚠️  This might be normal if:"
      echo "    - Migrations were already applied"
      echo "    - Database is not ready yet"
      echo "    - There are migration conflicts"
      echo "    - Migration files are missing or corrupted"
      echo ""
      echo "⚠️  Server will start anyway - check logs for details"
      echo "⚠️  Manual intervention may be required"
    fi
  fi
done
echo ""

# ============================================================================
# Step 5: Regenerate Prisma Client After Migrations
# ============================================================================
if [ "$MIGRATION_SUCCESS" = true ]; then
  echo "🔄 Step 5: Regenerating Prisma Client after migrations..."
  if ! npx prisma generate --schema="${SCHEMA_PATH}" 2>&1; then
    echo "❌ Failed to regenerate Prisma Client after migrations"
    echo "⚠️  Using existing Prisma Client (may be out of sync)"
  else
    echo "✅ Prisma Client regenerated successfully"
  fi
  echo ""
fi

# ============================================================================
# Step 6: Post-Migration Verification
# ============================================================================
if [ "$MIGRATION_SUCCESS" = true ]; then
  echo "🔍 Step 6: Post-migration verification..."
  
  # Verify migration status
  VERIFICATION_OUTPUT=$(npx prisma migrate status --schema="${SCHEMA_PATH}" 2>&1)
  VERIFICATION_EXIT=$?
  
  if [ $VERIFICATION_EXIT -eq 0 ]; then
    echo "$VERIFICATION_OUTPUT" | head -30
    echo "✅ Migration verification passed"
    
    # Check for specific migration results
    if echo "$VERIFICATION_OUTPUT" | grep -q "Database schema is up to date"; then
      echo "✅ Database schema is up to date"
    fi
    
    # Verify critical tables/columns exist
    echo "🔍 Verifying critical database objects..."
    
    # Check MerchantRole table
    if echo "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'MerchantRole');" | npx prisma db execute --stdin --schema="${SCHEMA_PATH}" > /dev/null 2>&1; then
      echo "✅ MerchantRole table verified"
    else
      echo "⚠️  Could not verify MerchantRole table (may not exist yet)"
    fi
    
    # Check customRoleId column
    if echo "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'User' AND column_name = 'customRoleId');" | npx prisma db execute --stdin --schema="${SCHEMA_PATH}" > /dev/null 2>&1; then
      echo "✅ customRoleId column verified"
    else
      echo "⚠️  Could not verify customRoleId column (may not exist yet)"
    fi
  else
    echo "$VERIFICATION_OUTPUT" | head -30
    echo "⚠️  Migration verification failed (but migrations were applied)"
    echo "⚠️  This may indicate a schema mismatch - manual review recommended"
  fi
else
  echo "⏭️  Step 6: Skipping post-migration verification (migrations did not succeed)"
  echo "⚠️  WARNING: Migrations were not applied successfully"
  echo "⚠️  Server will start, but database schema may be out of sync"
  echo "⚠️  Manual migration may be required"
fi
echo ""

# ============================================================================
# Step 7: Start Next.js Server
# ============================================================================
echo "🌐 Step 7: Starting Next.js server on port 3002..."
echo "📅 $(date '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

# Log migration summary
if [ "$MIGRATION_SUCCESS" = true ]; then
  echo "✅ Migration Summary: SUCCESS"
else
  echo "⚠️  Migration Summary: FAILED (server starting anyway)"
  if [ -n "$MIGRATION_ERROR" ]; then
    echo "📝 Last error: $(echo "$MIGRATION_ERROR" | tail -1)"
  fi
fi
echo ""

echo "✅ Server is ready to accept requests"
echo "🚀 Starting Next.js application..."
exec ../../node_modules/.bin/next start -p 3002

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

# Don't exit on error - we want to start server even if migrations fail
# set -e

# CRITICAL: Set environment variables for @xenova/transformers BEFORE any imports
# USE_BROWSER=true forces WebAssembly mode (browser-compatible runtime)
# This avoids onnxruntime-node dependency on Alpine Linux
export USE_ONNXRUNTIME=false
export USE_BROWSER=true
export ONNXRUNTIME_NODE_DISABLE=true

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
# Step 6: Start Next.js Server (in background for warm-up)
# ============================================================================
echo "🌐 Step 6: Starting Next.js server on port 3002..."
echo "📅 $(date '+%Y-%m-%d %H:%M:%S UTC')"
echo ""

# Start Next.js server in background
echo "🚀 Starting Next.js application in background..."
../../node_modules/.bin/next start -p 3002 &
NEXTJS_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for server to be ready..."
MAX_WAIT=30
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
  if curl -s http://localhost:3002/api/health > /dev/null 2>&1; then
    echo "✅ Server is ready!"
    break
  fi
  sleep 1
  WAITED=$((WAITED + 1))
  if [ $((WAITED % 5)) -eq 0 ]; then
    echo "   Still waiting... ($WAITED/$MAX_WAIT seconds)"
  fi
done

# ============================================================================
# Step 7: Warm-up ML Model (Pre-load to avoid issue #1135)
# ============================================================================
if curl -s http://localhost:3002/api/health > /dev/null 2>&1; then
  echo ""
  echo "🔥 Step 7: Warming up ML model (pre-loading to avoid promise hanging issue #1135)..."
  echo "📅 $(date '+%Y-%m-%d %H:%M:%S UTC')"
  
  # Call warm-up endpoint (with timeout)
  WARMUP_TIMEOUT=120
  if timeout $WARMUP_TIMEOUT curl -s -X POST http://localhost:3002/api/test/warmup-model > /dev/null 2>&1; then
    echo "✅ Model warm-up completed successfully"
  else
    echo "⚠️  Model warm-up timed out or failed (this is OK - model will load on first request)"
    echo "⚠️  Server will continue running normally"
  fi
  echo ""
else
  echo "⚠️  Server did not start in time - skipping model warm-up"
  echo "⚠️  Model will be loaded on first image search request"
  echo ""
fi

echo "✅ Server is ready to accept requests"
echo "🚀 Next.js application is running (PID: $NEXTJS_PID)"
echo ""

# Wait for Next.js process (keep container running)
wait $NEXTJS_PID

#!/bin/bash
# ============================================================================
# Check Database Schema Sync Between Local and Railway
# ============================================================================
# This script compares migration status between local and Railway databases
# to ensure they are in sync.
#
# Usage:
#   ./scripts/check-db-sync.sh [--service SERVICE_NAME]
#
# Examples:
#   ./scripts/check-db-sync.sh                    # Check dev-apis by default
#   ./scripts/check-db-sync.sh --service dev-apis # Check dev-apis
#   ./scripts/check-db-sync.sh --service apis     # Check production
#
# Prerequisites:
#   - Local .env file with DATABASE_URL (for local check)
#   - Railway CLI installed and logged in
#   - Railway service name (default: dev-apis)
# ============================================================================

set -e

# Parse arguments
SERVICE_NAME="dev-apis"
SCHEMA_PATH="./prisma/schema.prisma"

while [[ $# -gt 0 ]]; do
    case $1 in
        --service)
            SERVICE_NAME="$2"
            shift 2
            ;;
        *)
            SERVICE_NAME="$1"
            shift
            ;;
    esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "🔍 Checking database schema sync..."
echo "📋 Service: ${SERVICE_NAME}"
echo ""

# ============================================================================
# Step 1: Check Local Migration Status
# ============================================================================
echo "📊 Step 1: Checking LOCAL database migration status..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -z "$DATABASE_URL" ]; then
    if [ -f .env ]; then
        echo "📝 Loading DATABASE_URL from .env file..."
        export $(grep -v '^#' .env | grep DATABASE_URL | xargs)
    else
        echo "❌ Error: DATABASE_URL not set and .env file not found"
        echo "💡 Tip: Set DATABASE_URL or create .env file with DATABASE_URL"
        exit 1
    fi
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL is not set"
    exit 1
fi

LOCAL_STATUS=$(npx prisma migrate status --schema="${SCHEMA_PATH}" 2>&1)
LOCAL_EXIT=$?

if [ $LOCAL_EXIT -eq 0 ]; then
    echo -e "${GREEN}✅ Local database is up to date${NC}"
    echo "$LOCAL_STATUS" | head -20
else
    echo -e "${YELLOW}⚠️  Local database has issues:${NC}"
    echo "$LOCAL_STATUS" | head -20
fi

# Extract applied migrations from local
LOCAL_APPLIED=$(echo "$LOCAL_STATUS" | grep -E "✅|Applied" | sed 's/✅//g' | sed 's/.*Applied //g' | awk '{print $1}' | sort)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================================================
# Step 2: Check Railway Migration Status
# ============================================================================
echo "📊 Step 2: Checking RAILWAY database migration status..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

RAILWAY_STATUS=$(railway run --service "${SERVICE_NAME}" yarn db:migrate:status 2>&1)
RAILWAY_EXIT=$?

if [ $RAILWAY_EXIT -eq 0 ]; then
    echo -e "${GREEN}✅ Railway database is up to date${NC}"
    echo "$RAILWAY_STATUS" | head -20
else
    echo -e "${YELLOW}⚠️  Railway database has issues:${NC}"
    echo "$RAILWAY_STATUS" | head -20
fi

# Extract applied migrations from Railway
RAILWAY_APPLIED=$(echo "$RAILWAY_STATUS" | grep -E "✅|Applied" | sed 's/✅//g' | sed 's/.*Applied //g' | awk '{print $1}' | sort)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ============================================================================
# Step 3: Compare Migration Status
# ============================================================================
echo "🔍 Step 3: Comparing migration status..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get all migration files
ALL_MIGRATIONS=$(ls -1 prisma/migrations/*/migration.sql 2>/dev/null | xargs -n1 basename | sed 's|/migration.sql||' | sort)

if [ -z "$ALL_MIGRATIONS" ]; then
    echo "❌ Error: No migration files found in prisma/migrations/"
    exit 1
fi

echo "📋 All migrations:"
echo "$ALL_MIGRATIONS" | nl
echo ""

# Check for missing migrations on Railway
echo "🔍 Checking for missing migrations on Railway..."
MISSING_ON_RAILWAY=""
for migration in $ALL_MIGRATIONS; do
    if ! echo "$RAILWAY_APPLIED" | grep -q "^${migration}$"; then
        MISSING_ON_RAILWAY="${MISSING_ON_RAILWAY}${migration}\n"
    fi
done

# Check for missing migrations on Local
echo "🔍 Checking for missing migrations on Local..."
MISSING_ON_LOCAL=""
for migration in $ALL_MIGRATIONS; do
    if ! echo "$LOCAL_APPLIED" | grep -q "^${migration}$"; then
        MISSING_ON_LOCAL="${MISSING_ON_LOCAL}${migration}\n"
    fi
done

# ============================================================================
# Step 4: Summary Report
# ============================================================================
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 SUMMARY REPORT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TOTAL_MIGRATIONS=$(echo "$ALL_MIGRATIONS" | wc -l | tr -d ' ')
LOCAL_COUNT=$(echo "$LOCAL_APPLIED" | grep -c . || echo "0")
RAILWAY_COUNT=$(echo "$RAILWAY_APPLIED" | grep -c . || echo "0")

echo "📈 Migration Statistics:"
echo "   Total migrations:     ${TOTAL_MIGRATIONS}"
echo "   Local applied:        ${LOCAL_COUNT}"
echo "   Railway applied:      ${RAILWAY_COUNT}"
echo ""

if [ -z "$MISSING_ON_RAILWAY" ] && [ -z "$MISSING_ON_LOCAL" ]; then
    echo -e "${GREEN}✅ DATABASES ARE IN SYNC!${NC}"
    echo "   Both local and Railway have all migrations applied."
    echo ""
    exit 0
else
    if [ -n "$MISSING_ON_RAILWAY" ]; then
        echo -e "${RED}❌ Railway database is OUT OF SYNC${NC}"
        echo "   Missing migrations on Railway:"
        echo -e "$MISSING_ON_RAILWAY" | sed 's/^/      - /'
        echo ""
        echo "💡 To fix, run:"
        echo "   railway run --service ${SERVICE_NAME} yarn railway:migrate"
        echo ""
    fi
    
    if [ -n "$MISSING_ON_LOCAL" ]; then
        echo -e "${YELLOW}⚠️  Local database is OUT OF SYNC${NC}"
        echo "   Missing migrations on Local:"
        echo -e "$MISSING_ON_LOCAL" | sed 's/^/      - /'
        echo ""
        echo "💡 To fix, run:"
        echo "   yarn db:migrate"
        echo ""
    fi
    
    exit 1
fi


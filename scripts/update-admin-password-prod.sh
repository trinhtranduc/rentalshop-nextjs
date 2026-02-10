#!/bin/bash
# ============================================================================
# Update Admin Password on Production
# ============================================================================
# ⚠️  WARNING: This will update admin password on PRODUCTION database!
# Make sure you have tested on development first!
#
# Usage:
#   ./scripts/update-admin-password-prod.sh
#
# Requirements:
#   - Railway CLI installed and logged in
#   - Linked to production project
# ============================================================================

set -e

echo "⚠️  WARNING: This will update admin password on PRODUCTION database!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
read -p "Are you sure you want to continue? (yes/NO): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo "❌ Password update cancelled"
  exit 1
fi

# Check if Railway CLI is available
if ! command -v railway &> /dev/null; then
  echo "❌ Error: Railway CLI is not installed"
  echo ""
  echo "💡 Install Railway CLI:"
  echo "  npm install -g @railway/cli"
  echo "  railway login"
  echo "  railway link"
  exit 1
fi

# Check if custom email/password provided
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@rentalshop.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"

echo "🔍 Configuration:"
echo "   Email: ${ADMIN_EMAIL}"
if [ -n "$ADMIN_PASSWORD" ]; then
  echo "   Password: [CUSTOM PROVIDED]"
else
  echo "   Password: [AUTO-GENERATED STRONG PASSWORD]"
fi
echo ""

read -p "Continue with these settings? (yes/NO): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo "❌ Password update cancelled"
  exit 1
fi

# Build command
CMD="node scripts/update-admin-password.js"

# Add environment variables if provided
ENV_ARGS=""
if [ -n "$ADMIN_EMAIL" ]; then
  ENV_ARGS="--env ADMIN_EMAIL=${ADMIN_EMAIL}"
fi
if [ -n "$ADMIN_PASSWORD" ]; then
  ENV_ARGS="${ENV_ARGS} --env ADMIN_PASSWORD=${ADMIN_PASSWORD}"
fi

# Run on Railway production
echo "🚀 Running password update on Railway Production..."
echo ""

railway run --service apis --environment production ${ENV_ARGS} ${CMD}

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo ""
  echo "✅ Password update completed successfully!"
  echo ""
  echo "⚠️  IMPORTANT:"
  echo "   1. Save the new password securely (password manager recommended)"
  echo "   2. All existing admin sessions have been invalidated"
  echo "   3. Admin must login again with new password"
  echo "   4. Consider rotating this password every 3-6 months"
else
  echo ""
  echo "❌ Password update failed with exit code: $EXIT_CODE"
  echo ""
  echo "💡 Troubleshooting:"
  echo "   1. Check Railway logs: railway logs --service apis --environment production"
  echo "   2. Verify database connection"
  echo "   3. Ensure admin user exists in database"
  exit $EXIT_CODE
fi

#!/bin/bash
# ============================================================================
# Commit Password Reset Feature Script
# ============================================================================
# This script helps commit all password reset related changes

set -e

echo "🚀 Committing password reset functionality..."

# Check if on dev branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "dev" ]; then
    echo "⚠️  Warning: Not on dev branch. Current branch: $CURRENT_BRANCH"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Add database changes
echo "📦 Adding database changes..."
git add prisma/schema.prisma
git add prisma/migrations/20251118131443_add_password_reset/
# Remove old migration folder if exists
if [ -d "prisma/migrations/20250115120000_add_password_reset" ]; then
    echo "🗑️  Removing old migration folder..."
    rm -rf prisma/migrations/20250115120000_add_password_reset
    git add prisma/migrations/20250115120000_add_password_reset
fi

# Add database package
echo "📦 Adding database package changes..."
git add packages/database/src/password-reset.ts
git add packages/database/src/index.ts

# Add API endpoints
echo "📦 Adding API endpoints..."
git add apps/api/app/api/auth/forget-password/route.ts
git add apps/api/app/api/auth/reset-password/route.ts

# Add frontend pages
echo "📦 Adding frontend pages..."
git add apps/admin/app/forget-password/page.tsx
git add apps/admin/app/reset-password/

# Add components
echo "📦 Adding components..."
git add packages/ui/src/components/forms/ResetPasswordForm.tsx
git add packages/ui/src/components/forms/index.ts

# Add services & utils
echo "📦 Adding services & utils..."
git add packages/utils/src/services/email.ts
git add packages/utils/src/api/auth.ts
git add packages/utils/src/api/response-builder.ts

# Add translations
echo "📦 Adding translations..."
git add locales/en/auth.json
git add locales/vi/auth.json

# Add documentation & scripts
echo "📦 Adding documentation & scripts..."
git add DATABASE_MIGRATION_GUIDE.md
git add RAILWAY_DATABASE_URL_GUIDE.md
git add GIT_WORKFLOW_GUIDE.md
git add scripts/migrate-database.sh
git add package.json

# Show status
echo ""
echo "📊 Files staged for commit:"
git status --short

# Commit
echo ""
read -p "Commit these changes? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git commit -m "feat: add password reset functionality for merchants

- Add PasswordReset database model with migration
- Create password reset API endpoints (forget-password, reset-password)
- Add forget password and reset password pages in admin app
- Create ResetPasswordForm component
- Add password reset email templates
- Add translations for password reset flow (en/vi)
- Add database migration guide and Railway DATABASE_URL guide
- Add Git workflow guide (dev → main)
- Add migration scripts for dev and production

Migration: 20251118131443_add_password_reset"
    
    echo ""
    echo "✅ Changes committed!"
    echo ""
    echo "Next steps:"
    echo "  1. Push to dev: git push origin dev"
    echo "  2. Test on Railway dev environment"
    echo "  3. Merge to main: git checkout main && git merge dev"
    echo "  4. Push to main: git push origin main"
else
    echo "❌ Commit cancelled"
    exit 1
fi


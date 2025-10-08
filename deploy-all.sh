#!/bin/bash

# ============================================================================
# 🚀 DEPLOY ALL APPS TO VERCEL
# ============================================================================
# Expert deployment script for monorepo
# ============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   🚀 DEPLOYMENT SCRIPT - ALL 3 APPS${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

# Environment Variables (COPY THESE!)
API_DB_URL="postgresql://postgres:Anhiuem123@@db.yqbjnaitiptdagpjsndx.supabase.co:5432/postgres"
JWT_SECRET="c078b5563dacc05139fc46d09337e42a5e99af2d95cd9a2a555afc0e66c01d62"
NEXTAUTH_SECRET="45264662a1976492ba7bdc929bf0b07ffd4066a37417f0c5205dcad85b09f599"
CLOUDINARY_NAME="dewd6fwn0"
CLOUDINARY_KEY="895686533155893"
CLOUDINARY_SECRET="PSHE8NBY0R1c2Yl8oQDAdbEmN9M"

echo ""
echo -e "${YELLOW}⚠️  IMPORTANT: Sau khi deploy, bạn cần set Environment Variables!${NC}"
echo ""
echo "📋 Env vars cần set (copy từ output dưới):"
echo ""

# ============================================================================
# STEP 1: COMMIT PRE-BUILT PACKAGES
# ============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   STEP 1: Commit Pre-Built Packages${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo "🔍 Checking git status..."
if git diff-index --quiet HEAD --; then
    echo -e "${GREEN}✅ No uncommitted changes${NC}"
else
    echo -e "${YELLOW}⚠️  You have uncommitted changes. Commit them first!${NC}"
    echo ""
    read -p "Commit changes now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        git commit -m "feat: prepare for Vercel deployment with pre-built packages"
        echo -e "${GREEN}✅ Changes committed${NC}"
    else
        echo -e "${RED}❌ Please commit changes manually first${NC}"
        exit 1
    fi
fi

# ============================================================================
# STEP 2: DEPLOY API
# ============================================================================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   STEP 2: Deploy API Server${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd apps/api
echo "📍 Current directory: $(pwd)"
echo "🚀 Deploying API..."

if vercel --prod --yes; then
    API_URL=$(vercel inspect --wait | grep -o 'https://[^"]*' | head -1)
    echo -e "${GREEN}✅ API deployed successfully!${NC}"
    echo "   URL: $API_URL"
else
    echo -e "${RED}❌ API deployment failed${NC}"
    exit 1
fi

cd ../..

# ============================================================================
# STEP 3: DEPLOY CLIENT
# ============================================================================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   STEP 3: Deploy Client App${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd apps/client
echo "📍 Current directory: $(pwd)"
echo "🚀 Deploying Client..."

if vercel --prod --yes; then
    CLIENT_URL=$(vercel inspect --wait | grep -o 'https://[^"]*' | head -1)
    echo -e "${GREEN}✅ Client deployed successfully!${NC}"
    echo "   URL: $CLIENT_URL"
else
    echo -e "${RED}❌ Client deployment failed${NC}"
    exit 1
fi

cd ../..

# ============================================================================
# STEP 4: DEPLOY ADMIN
# ============================================================================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   STEP 4: Deploy Admin Dashboard${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

cd apps/admin
echo "📍 Current directory: $(pwd)"
echo "🚀 Deploying Admin..."

if vercel --prod --yes; then
    ADMIN_URL=$(vercel inspect --wait | grep -o 'https://[^"]*' | head -1)
    echo -e "${GREEN}✅ Admin deployed successfully!${NC}"
    echo "   URL: $ADMIN_URL"
else
    echo -e "${RED}❌ Admin deployment failed${NC}"
    exit 1
fi

cd ../..

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}   🎉 DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "📝 NEXT STEPS:"
echo ""
echo "1️⃣  Set Environment Variables cho từng project:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 API Server (rentalshop-api):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "DATABASE_URL=$API_DB_URL"
echo "JWT_SECRET=$JWT_SECRET"
echo "JWT_EXPIRES_IN=1d"
echo "NEXTAUTH_SECRET=$NEXTAUTH_SECRET"
echo "NEXTAUTH_URL=https://rentalshop-api.vercel.app"
echo "CLOUDINARY_CLOUD_NAME=$CLOUDINARY_NAME"
echo "CLOUDINARY_API_KEY=$CLOUDINARY_KEY"
echo "CLOUDINARY_API_SECRET=$CLOUDINARY_SECRET"
echo "UPLOAD_PROVIDER=cloudinary"
echo "NODE_ENV=production"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "👥 Client App (rentalshop-client):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "NEXT_PUBLIC_API_URL=https://rentalshop-api.vercel.app"
echo "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=$CLOUDINARY_NAME"
echo "NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=rentalshop_products"
echo "NEXTAUTH_SECRET=$NEXTAUTH_SECRET"
echo "NEXTAUTH_URL=https://rentalshop-client.vercel.app"
echo "NODE_ENV=production"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎛️  Admin Dashboard (rentalshop-admin):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "NEXT_PUBLIC_API_URL=https://rentalshop-api.vercel.app"
echo "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=$CLOUDINARY_NAME"
echo "NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=rentalshop_products"
echo "NEXTAUTH_SECRET=$NEXTAUTH_SECRET"
echo "NEXTAUTH_URL=https://rentalshop-admin.vercel.app"
echo "NODE_ENV=production"
echo ""
echo "2️⃣  Redeploy after setting env vars:"
echo "   cd apps/api && vercel --prod --force"
echo "   cd apps/client && vercel --prod --force"
echo "   cd apps/admin && vercel --prod --force"
echo ""
echo "3️⃣  Test deployments:"
echo "   curl https://rentalshop-api.vercel.app/api/health"
echo "   Open: https://rentalshop-client.vercel.app"
echo "   Open: https://rentalshop-admin.vercel.app"
echo ""
echo -e "${GREEN}✅ All done! Good luck! 🚀${NC}"


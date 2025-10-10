#!/bin/bash

# ===================================
# Development Environment Deployment
# ===================================

set -e  # Exit on any error

echo "🚀 Starting Development Environment Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    log_error "Railway CLI is not installed. Please install it first:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# Check if logged in to Railway
if ! railway whoami &> /dev/null; then
    log_error "Not logged in to Railway. Please login first:"
    echo "railway login"
    exit 1
fi

log_info "Switching to development environment..."
railway environment development

log_info "Checking development services..."
railway status

# Set environment variables for development
log_info "Setting up development environment variables..."

# Generate secrets for development
JWT_SECRET=$(openssl rand -hex 32)
NEXTAUTH_SECRET=$(openssl rand -hex 32)

log_info "Generated development secrets"

# Set API service variables
log_info "Configuring API service..."
railway variables --set RAILWAY_DOCKERFILE_PATH=apps/api/Dockerfile --service apis
railway variables --set DATABASE_URL='${{Postgres.DATABASE_URL}}' --service apis
railway variables --set NODE_ENV=development --service apis
railway variables --set JWT_SECRET="$JWT_SECRET" --service apis
railway variables --set JWT_EXPIRES_IN=1d --service apis
railway variables --set NEXTAUTH_SECRET="$NEXTAUTH_SECRET" --service apis
railway variables --set NEXTAUTH_URL='https://apis-development.up.railway.app' --service apis
railway variables --set API_URL='https://apis-development.up.railway.app' --service apis
railway variables --set CLIENT_URL='https://client-development.up.railway.app' --service apis
railway variables --set ADMIN_URL='https://admin-development.up.railway.app' --service apis
railway variables --set CORS_ORIGINS='https://client-development.up.railway.app,https://admin-development.up.railway.app' --service apis

# Set Client service variables
log_info "Configuring Client service..."
railway variables --set RAILWAY_DOCKERFILE_PATH=apps/client/Dockerfile --service client
railway variables --set NODE_ENV=development --service client
railway variables --set NEXT_PUBLIC_API_URL='https://apis-development.up.railway.app' --service client
railway variables --set NEXTAUTH_SECRET="$NEXTAUTH_SECRET" --service client
railway variables --set NEXTAUTH_URL='https://client-development.up.railway.app' --service client

# Set Admin service variables
log_info "Configuring Admin service..."
railway variables --set RAILWAY_DOCKERFILE_PATH=apps/admin/Dockerfile --service admin
railway variables --set NODE_ENV=development --service admin
railway variables --set NEXT_PUBLIC_API_URL='https://apis-development.up.railway.app' --service admin
railway variables --set NEXTAUTH_SECRET="$NEXTAUTH_SECRET" --service admin
railway variables --set NEXTAUTH_URL='https://admin-development.up.railway.app' --service admin

log_success "Environment variables configured"

# Push Prisma schema
log_info "Pushing Prisma schema to development database..."
railway run --service apis npx prisma db push --accept-data-loss

# Generate Prisma client
log_info "Generating Prisma client..."
railway run --service apis npx prisma generate

# Seed database
log_info "Seeding development database..."
railway run --service apis yarn db:regenerate-system

log_success "Database setup complete"

# Deploy services
log_info "Deploying services to development..."
railway up

log_success "Development deployment complete! 🎉"

echo ""
echo "🔗 Development URLs:"
echo "  API:    https://apis-development.up.railway.app"
echo "  Client: https://client-development.up.railway.app"
echo "  Admin:  https://admin-development.up.railway.app"
echo ""
echo "🔑 Default Login Credentials:"
echo "  Super Admin: admin@rentalshop.com / admin123"
echo "  Merchant 1:  merchant1@example.com / merchant123"
echo "  Merchant 2:  merchant2@example.com / merchant123"
echo ""
echo "📊 Development Environment Status:"
railway status

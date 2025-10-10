#!/bin/bash

# ===================================
# Production Environment Deployment
# ===================================

set -e  # Exit on any error

echo "🚀 Starting Production Environment Deployment..."

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

log_info "Switching to production environment..."
railway environment production

log_info "Checking production services..."
railway status

# Ensure PostgreSQL database exists
log_info "Ensuring PostgreSQL database exists..."
if ! railway add --database postgres 2>/dev/null; then
    log_info "PostgreSQL database already exists or was created"
fi

# Wait for database to be ready
log_info "Waiting for PostgreSQL to be ready..."
sleep 10

# Set environment variables for production
log_info "Setting up production environment variables..."

# Generate secrets for production
JWT_SECRET=$(openssl rand -hex 32)
NEXTAUTH_SECRET=$(openssl rand -hex 32)

log_info "Generated production secrets"

# Set API service variables
log_info "Configuring API service..."
railway variables --set RAILWAY_DOCKERFILE_PATH=apps/api/Dockerfile --service api-pro
railway variables --set DATABASE_URL='${{Postgres.DATABASE_URL}}' --service api-pro
railway variables --set NODE_ENV=production --service api-pro
railway variables --set JWT_SECRET="$JWT_SECRET" --service api-pro
railway variables --set JWT_EXPIRES_IN=1d --service api-pro
railway variables --set NEXTAUTH_SECRET="$NEXTAUTH_SECRET" --service api-pro
railway variables --set NEXTAUTH_URL='https://api-pro-production.up.railway.app' --service api-pro
railway variables --set API_URL='https://api-pro-production.up.railway.app' --service api-pro
railway variables --set CLIENT_URL='https://client-pro-production.up.railway.app' --service api-pro
railway variables --set ADMIN_URL='https://admin-pro-production.up.railway.app' --service api-pro
railway variables --set CORS_ORIGINS='https://client-pro-production.up.railway.app,https://admin-pro-production.up.railway.app' --service api-pro

# Set Client service variables
log_info "Configuring Client service..."
railway variables --set RAILWAY_DOCKERFILE_PATH=apps/client/Dockerfile --service client-pro
railway variables --set NODE_ENV=production --service client-pro
railway variables --set NEXT_PUBLIC_API_URL='https://api-pro-production.up.railway.app' --service client-pro
railway variables --set NEXTAUTH_SECRET="$NEXTAUTH_SECRET" --service client-pro
railway variables --set NEXTAUTH_URL='https://client-pro-production.up.railway.app' --service client-pro

# Set Admin service variables
log_info "Configuring Admin service..."
railway variables --set RAILWAY_DOCKERFILE_PATH=apps/admin/Dockerfile --service admin-pro
railway variables --set NODE_ENV=production --service admin-pro
railway variables --set NEXT_PUBLIC_API_URL='https://api-pro-production.up.railway.app' --service admin-pro
railway variables --set NEXTAUTH_SECRET="$NEXTAUTH_SECRET" --service admin-pro
railway variables --set NEXTAUTH_URL='https://admin-pro-production.up.railway.app' --service admin-pro

log_success "Environment variables configured"

# Push Prisma schema
log_info "Pushing Prisma schema to production database..."
railway run --service api-pro npx prisma db push --accept-data-loss

# Generate Prisma client
log_info "Generating Prisma client..."
railway run --service api-pro npx prisma generate

# Seed database
log_info "Seeding production database..."
railway run --service api-pro yarn db:regenerate-system

log_success "Database setup complete"

# Deploy services
log_info "Deploying services to production..."
railway up

log_success "Production deployment complete! 🎉"

echo ""
echo "🔗 Production URLs:"
echo "  API:    https://api-pro-production.up.railway.app"
echo "  Client: https://client-pro-production.up.railway.app"
echo "  Admin:  https://admin-pro-production.up.railway.app"
echo ""
echo "🔑 Default Login Credentials:"
echo "  Super Admin: admin@rentalshop.com / admin123"
echo "  Merchant 1:  merchant1@example.com / merchant123"
echo "  Merchant 2:  merchant2@example.com / merchant123"
echo ""
echo "📊 Production Environment Status:"
railway status

#!/bin/bash

# ===================================
# Master Deployment Script
# ===================================

set -e  # Exit on any error

echo "🚀 Railway Deployment Manager"
echo "=============================="

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

echo ""
echo "Choose deployment environment:"
echo "1) Development (dev-apis, dev-client, dev-admin, dev-database)"
echo "2) Production (apis, client, admin, database)"
echo "3) Both (Development + Production)"
echo ""

read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        log_info "Deploying to Development Environment..."
        bash "$(dirname "$0")/deploy-development.sh"
        ;;
    2)
        log_info "Deploying to Production Environment..."
        bash "$(dirname "$0")/deploy-production.sh"
        ;;
    3)
        log_info "Deploying to Both Environments..."
        echo ""
        log_warning "This will take longer as we deploy to both environments"
        echo ""
        
        log_info "Step 1: Deploying to Development..."
        bash "$(dirname "$0")/deploy-development.sh"
        
        echo ""
        log_info "Step 2: Deploying to Production..."
        bash "$(dirname "$0")/deploy-production.sh"
        
        log_success "Both environments deployed successfully! 🎉"
        ;;
    *)
        log_error "Invalid choice. Please run the script again and choose 1, 2, or 3."
        exit 1
        ;;
esac

echo ""
log_success "Deployment completed successfully!"
echo ""
echo "📚 Next Steps:"
echo "  - Test your deployed applications"
echo "  - Monitor logs: railway logs --service <service-name>"
echo "  - Check status: railway status"
echo "  - Open dashboard: railway open"

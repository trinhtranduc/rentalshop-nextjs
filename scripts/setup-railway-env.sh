#!/bin/bash

# ============================================================================
# RAILWAY ENVIRONMENT SETUP SCRIPT
# ============================================================================
# This script helps you configure environment variables for Railway deployment
#
# Usage:
#   ./scripts/setup-railway-env.sh
#
# What it does:
#   1. Checks Railway CLI installation
#   2. Generates secure secrets for JWT and NextAuth
#   3. Sets all required environment variables for each service
#   4. Verifies configuration
# ============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# ============================================================================
# VALIDATION FUNCTIONS
# ============================================================================

check_railway_cli() {
    if ! command -v railway &> /dev/null; then
        print_error "Railway CLI not found!"
        echo ""
        print_info "Install Railway CLI:"
        echo "  npm install -g @railway/cli"
        echo ""
        exit 1
    fi
    print_success "Railway CLI found"
}

check_railway_login() {
    if ! railway whoami &> /dev/null; then
        print_error "Not logged into Railway!"
        echo ""
        print_info "Please login first:"
        echo "  railway login"
        echo ""
        exit 1
    fi
    print_success "Logged into Railway"
}

generate_secret() {
    openssl rand -hex 32
}

# ============================================================================
# MAIN SETUP FUNCTION
# ============================================================================

main() {
    print_header "🚂 RAILWAY ENVIRONMENT SETUP"
    
    # Check prerequisites
    print_info "Checking prerequisites..."
    check_railway_cli
    check_railway_login
    
    echo ""
    print_info "Current Railway project: $(railway status 2>/dev/null | grep 'Project:' | awk '{print $2}')"
    echo ""
    
    # Check if PostgreSQL database exists
    print_header "📊 DATABASE CONFIGURATION"
    print_info "Checking for PostgreSQL database..."
    
    # Get database URL
    DB_URL=$(railway variables --service apis 2>/dev/null | grep DATABASE_URL | awk -F'│' '{print $3}' | xargs)
    
    if [ -z "$DB_URL" ] || [ "$DB_URL" == "DATABASE_URL" ]; then
        print_warning "No DATABASE_URL found!"
        echo ""
        print_info "Please add PostgreSQL database to your Railway project:"
        echo "  1. Go to Railway Dashboard"
        echo "  2. Click 'New' → 'Database' → 'Add PostgreSQL'"
        echo "  3. Copy the DATABASE_URL from the PostgreSQL service"
        echo "  4. Run this script again"
        echo ""
        read -p "Press Enter to continue after adding database, or Ctrl+C to exit..."
    else
        print_success "DATABASE_URL configured"
    fi
    
    # Generate secrets
    print_header "🔐 GENERATING SECURE SECRETS"
    
    JWT_SECRET=$(generate_secret)
    NEXTAUTH_SECRET=$(generate_secret)
    
    print_success "JWT_SECRET generated: ${JWT_SECRET:0:20}..."
    print_success "NEXTAUTH_SECRET generated: ${NEXTAUTH_SECRET:0:20}..."
    
    # Get service URLs from Railway
    print_header "🌐 SERVICE URLS"
    
    API_URL=$(railway variables --service apis 2>/dev/null | grep RAILWAY_SERVICE_APIS_URL | awk -F'│' '{print $3}' | xargs)
    ADMIN_URL=$(railway variables --service admin 2>/dev/null | grep RAILWAY_SERVICE_ADMIN_URL | awk -F'│' '{print $3}' | xargs)
    CLIENT_URL=$(railway variables --service client 2>/dev/null | grep RAILWAY_SERVICE_CLIENT_URL | awk -F'│' '{print $3}' | xargs)
    
    # If URLs are empty, use Railway domain format
    if [ -z "$API_URL" ]; then
        API_URL="apis-development.up.railway.app"
    fi
    if [ -z "$ADMIN_URL" ]; then
        ADMIN_URL="admin-development.up.railway.app"
    fi
    if [ -z "$CLIENT_URL" ]; then
        CLIENT_URL="client-development.up.railway.app"
    fi
    
    # Add https:// prefix
    API_URL="https://${API_URL}"
    ADMIN_URL="https://${ADMIN_URL}"
    CLIENT_URL="https://${CLIENT_URL}"
    
    print_info "API URL: $API_URL"
    print_info "Admin URL: $ADMIN_URL"
    print_info "Client URL: $CLIENT_URL"
    
    # CORS origins
    CORS_ORIGINS="${CLIENT_URL},${ADMIN_URL}"
    
    # Confirm before setting variables
    print_header "📝 ENVIRONMENT VARIABLES SUMMARY"
    
    echo "The following environment variables will be set for the API service:"
    echo ""
    echo "  DATABASE_URL: \${{Postgres.DATABASE_URL}} (from PostgreSQL service)"
    echo "  NODE_ENV: production"
    echo "  JWT_SECRET: ${JWT_SECRET:0:20}..."
    echo "  JWT_EXPIRES_IN: 1d"
    echo "  NEXTAUTH_SECRET: ${NEXTAUTH_SECRET:0:20}..."
    echo "  NEXTAUTH_URL: $API_URL"
    echo "  API_URL: $API_URL"
    echo "  CLIENT_URL: $CLIENT_URL"
    echo "  ADMIN_URL: $ADMIN_URL"
    echo "  CORS_ORIGINS: $CORS_ORIGINS"
    echo ""
    
    read -p "$(echo -e ${YELLOW}Continue with setup? [Y/n]:${NC} )" confirm
    
    if [[ "$confirm" =~ ^[Nn] ]]; then
        print_warning "Setup cancelled by user"
        exit 0
    fi
    
    # Set environment variables for API service
    print_header "🔧 CONFIGURING API SERVICE"
    
    print_info "Setting environment variables..."
    
    railway variables --set DATABASE_URL='${{Postgres.DATABASE_URL}}' --service apis
    railway variables --set NODE_ENV=production --service apis
    railway variables --set JWT_SECRET="$JWT_SECRET" --service apis
    railway variables --set JWT_EXPIRES_IN=1d --service apis
    railway variables --set NEXTAUTH_SECRET="$NEXTAUTH_SECRET" --service apis
    railway variables --set NEXTAUTH_URL="$API_URL" --service apis
    railway variables --set API_URL="$API_URL" --service apis
    railway variables --set CLIENT_URL="$CLIENT_URL" --service apis
    railway variables --set ADMIN_URL="$ADMIN_URL" --service apis
    railway variables --set CORS_ORIGINS="$CORS_ORIGINS" --service apis
    
    print_success "API service configured"
    
    # Set environment variables for Admin service
    print_header "🔧 CONFIGURING ADMIN SERVICE"
    
    railway variables --set NODE_ENV=production --service admin
    railway variables --set NEXT_PUBLIC_API_URL="$API_URL" --service admin
    railway variables --set NEXTAUTH_SECRET="$NEXTAUTH_SECRET" --service admin
    railway variables --set NEXTAUTH_URL="$ADMIN_URL" --service admin
    
    print_success "Admin service configured"
    
    # Set environment variables for Client service
    print_header "🔧 CONFIGURING CLIENT SERVICE"
    
    railway variables --set NODE_ENV=production --service client
    railway variables --set NEXT_PUBLIC_API_URL="$API_URL" --service client
    railway variables --set NEXTAUTH_SECRET="$NEXTAUTH_SECRET" --service client
    railway variables --set NEXTAUTH_URL="$CLIENT_URL" --service client
    
    print_success "Client service configured"
    
    # Database migration
    print_header "📊 DATABASE MIGRATION"
    
    echo ""
    read -p "$(echo -e ${YELLOW}Do you want to push Prisma schema to Railway database now? [Y/n]:${NC} )" migrate_confirm
    
    if [[ ! "$migrate_confirm" =~ ^[Nn] ]]; then
        print_info "Pushing Prisma schema to Railway database..."
        
        if railway run --service apis npx prisma db push --accept-data-loss; then
            print_success "Database schema pushed successfully"
            
            echo ""
            read -p "$(echo -e ${YELLOW}Do you want to seed the database with initial data? [Y/n]:${NC} )" seed_confirm
            
            if [[ ! "$seed_confirm" =~ ^[Nn] ]]; then
                print_info "Seeding database..."
                railway run --service apis yarn db:regenerate-system
                print_success "Database seeded successfully"
            fi
        else
            print_error "Failed to push database schema"
            print_warning "Please check your DATABASE_URL and try again"
        fi
    fi
    
    # Summary
    print_header "✅ SETUP COMPLETE"
    
    echo ""
    print_success "All environment variables have been configured!"
    echo ""
    print_info "Next steps:"
    echo "  1. Verify configuration: railway variables --service apis"
    echo "  2. Deploy your services: git push"
    echo "  3. Check logs: railway logs --service apis"
    echo ""
    print_info "Service URLs:"
    echo "  • API: $API_URL"
    echo "  • Admin: $ADMIN_URL"
    echo "  • Client: $CLIENT_URL"
    echo ""
    print_warning "Save these secrets in a secure location:"
    echo "  JWT_SECRET: $JWT_SECRET"
    echo "  NEXTAUTH_SECRET: $NEXTAUTH_SECRET"
    echo ""
}

# Run main function
main


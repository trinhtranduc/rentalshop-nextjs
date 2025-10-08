#!/bin/bash

# ============================================================================
# 🚀 VERCEL DEPLOYMENT SCRIPT
# ============================================================================
# Script tự động deploy Rental Shop lên Vercel
# Author: AI Assistant
# Date: 2025
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# FUNCTIONS
# ============================================================================

print_header() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}   $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
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

check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 chưa được cài đặt"
        echo "  Cài đặt bằng: npm install -g $1"
        exit 1
    fi
}

# ============================================================================
# PRE-DEPLOYMENT CHECKS
# ============================================================================

print_header "1. KIỂM TRA YÊU CẦU"

# Check Vercel CLI
print_info "Kiểm tra Vercel CLI..."
check_command "vercel"
print_success "Vercel CLI đã được cài đặt"

# Check if logged in
print_info "Kiểm tra đăng nhập Vercel..."
if ! vercel whoami &> /dev/null; then
    print_warning "Bạn chưa đăng nhập Vercel"
    print_info "Đang mở trang đăng nhập..."
    vercel login
fi
print_success "Đã đăng nhập Vercel"

# Check Node/Yarn
print_info "Kiểm tra Node.js và Yarn..."
check_command "node"
check_command "yarn"
print_success "Node.js và Yarn đã được cài đặt"

# ============================================================================
# BUILD TEST
# ============================================================================

print_header "2. TEST BUILD LOCAL"

print_info "Đang build tất cả apps..."
if yarn build; then
    print_success "Build thành công! ✨"
else
    print_error "Build thất bại. Vui lòng sửa lỗi trước khi deploy."
    exit 1
fi

# ============================================================================
# DATABASE CHECK
# ============================================================================

print_header "3. KIỂM TRA DATABASE"

print_warning "⚠️  QUAN TRỌNG: Vercel KHÔNG hỗ trợ SQLite!"
print_info "Bạn cần PostgreSQL database để deploy production."
echo ""
print_info "Các lựa chọn:"
echo "  1. Neon PostgreSQL (Khuyên dùng) - https://neon.tech"
echo "  2. Vercel Postgres - https://vercel.com/storage/postgres"
echo "  3. Supabase - https://supabase.com"
echo ""

read -p "$(echo -e ${YELLOW}Bạn đã có PostgreSQL database chưa? [y/N]:${NC} )" -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "Vui lòng tạo PostgreSQL database trước khi tiếp tục"
    print_info "Xem hướng dẫn tại: VERCEL_DEPLOYMENT_GUIDE_VI.md"
    exit 1
fi

read -p "$(echo -e ${YELLOW}Nhập DATABASE_URL (PostgreSQL):${NC} )" DATABASE_URL

if [ -z "$DATABASE_URL" ]; then
    print_error "DATABASE_URL không được để trống"
    exit 1
fi

# Validate PostgreSQL URL
if [[ ! $DATABASE_URL =~ ^postgresql:// ]]; then
    print_error "DATABASE_URL phải bắt đầu bằng 'postgresql://'"
    exit 1
fi

print_success "Database URL hợp lệ"

# ============================================================================
# MIGRATE DATABASE
# ============================================================================

print_header "4. MIGRATE DATABASE SCHEMA"

print_info "Đang push schema lên database production..."
if DATABASE_URL="$DATABASE_URL" npx prisma db push --accept-data-loss; then
    print_success "Schema đã được migrate thành công"
else
    print_error "Migrate thất bại"
    exit 1
fi

print_info "Generate Prisma Client..."
npx prisma generate
print_success "Prisma Client đã được generate"

# ============================================================================
# GENERATE SECRETS
# ============================================================================

print_header "5. GENERATE SECRETS"

print_info "Đang generate JWT_SECRET và NEXTAUTH_SECRET..."

JWT_SECRET=$(openssl rand -hex 32)
NEXTAUTH_SECRET=$(openssl rand -hex 32)

print_success "Secrets đã được generate"
echo "  JWT_SECRET: ${JWT_SECRET:0:10}...${JWT_SECRET: -10}"
echo "  NEXTAUTH_SECRET: ${NEXTAUTH_SECRET:0:10}...${NEXTAUTH_SECRET: -10}"

# ============================================================================
# DEPLOY SELECTION
# ============================================================================

print_header "6. CHỌN ỨNG DỤNG DEPLOY"

echo "Chọn ứng dụng để deploy:"
echo "  1. API Server only"
echo "  2. Client App only"
echo "  3. Admin Dashboard only"
echo "  4. Tất cả (API → Client → Admin)"
echo ""
read -p "$(echo -e ${YELLOW}Lựa chọn [1-4]:${NC} )" -n 1 -r DEPLOY_CHOICE
echo ""

# ============================================================================
# DEPLOYMENT FUNCTIONS
# ============================================================================

deploy_api() {
    print_header "DEPLOYING API SERVER"
    
    cd apps/api
    
    print_info "Đang deploy API server..."
    if vercel --prod --yes; then
        print_success "API Server đã deploy thành công!"
        
        # Get deployment URL
        API_URL=$(vercel inspect --json | grep -o '"url":"[^"]*' | cut -d'"' -f4 | head -1)
        echo "  URL: https://$API_URL"
        
        print_warning "⚠️  Bạn cần set environment variables trên Vercel Dashboard:"
        echo ""
        echo "  DATABASE_URL=$DATABASE_URL"
        echo "  JWT_SECRET=$JWT_SECRET"
        echo "  NEXTAUTH_SECRET=$NEXTAUTH_SECRET"
        echo "  NEXTAUTH_URL=https://$API_URL"
        echo ""
        print_info "Xem chi tiết tại: VERCEL_ENV_TEMPLATE.md"
    else
        print_error "Deploy API thất bại"
        exit 1
    fi
    
    cd ../..
}

deploy_client() {
    print_header "DEPLOYING CLIENT APP"
    
    cd apps/client
    
    print_info "Đang deploy Client app..."
    if vercel --prod --yes; then
        print_success "Client App đã deploy thành công!"
        
        # Get deployment URL
        CLIENT_URL=$(vercel inspect --json | grep -o '"url":"[^"]*' | cut -d'"' -f4 | head -1)
        echo "  URL: https://$CLIENT_URL"
        
        print_warning "⚠️  Bạn cần set environment variables trên Vercel Dashboard:"
        echo ""
        echo "  NEXT_PUBLIC_API_URL=https://<api-url>"
        echo "  NEXTAUTH_SECRET=$NEXTAUTH_SECRET"
        echo "  NEXTAUTH_URL=https://$CLIENT_URL"
        echo ""
    else
        print_error "Deploy Client thất bại"
        exit 1
    fi
    
    cd ../..
}

deploy_admin() {
    print_header "DEPLOYING ADMIN DASHBOARD"
    
    cd apps/admin
    
    print_info "Đang deploy Admin dashboard..."
    if vercel --prod --yes; then
        print_success "Admin Dashboard đã deploy thành công!"
        
        # Get deployment URL
        ADMIN_URL=$(vercel inspect --json | grep -o '"url":"[^"]*' | cut -d'"' -f4 | head -1)
        echo "  URL: https://$ADMIN_URL"
        
        print_warning "⚠️  Bạn cần set environment variables trên Vercel Dashboard:"
        echo ""
        echo "  NEXT_PUBLIC_API_URL=https://<api-url>"
        echo "  NEXTAUTH_SECRET=$NEXTAUTH_SECRET"
        echo "  NEXTAUTH_URL=https://$ADMIN_URL"
        echo ""
    else
        print_error "Deploy Admin thất bại"
        exit 1
    fi
    
    cd ../..
}

# ============================================================================
# EXECUTE DEPLOYMENT
# ============================================================================

case $DEPLOY_CHOICE in
    1)
        deploy_api
        ;;
    2)
        deploy_client
        ;;
    3)
        deploy_admin
        ;;
    4)
        deploy_api
        echo ""
        deploy_client
        echo ""
        deploy_admin
        ;;
    *)
        print_error "Lựa chọn không hợp lệ"
        exit 1
        ;;
esac

# ============================================================================
# POST-DEPLOYMENT
# ============================================================================

print_header "🎉 DEPLOYMENT HOÀN TẤT!"

print_success "Các bước tiếp theo:"
echo ""
echo "  1. Set environment variables trên Vercel Dashboard"
echo "     → https://vercel.com/dashboard"
echo ""
echo "  2. Redeploy sau khi set env vars:"
echo "     cd apps/api && vercel --prod --force"
echo "     cd apps/client && vercel --prod --force"
echo "     cd apps/admin && vercel --prod --force"
echo ""
echo "  3. Update CORS_ORIGINS trong API với Client & Admin URLs"
echo ""
echo "  4. Test deployment:"
echo "     curl https://<api-url>/api/health"
echo ""

print_info "Xem hướng dẫn chi tiết tại:"
echo "  - VERCEL_DEPLOYMENT_GUIDE_VI.md (Tiếng Việt)"
echo "  - VERCEL_ENV_TEMPLATE.md (Environment Variables)"
echo ""

print_success "Chúc mừng bạn đã deploy thành công! 🚀"


#!/bin/bash

# Database Setup Script for Rental Shop
# This script sets up the database for local development

set -e

echo "🚀 Setting up database for Rental Shop..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "prisma" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Set environment
export NODE_ENV=local
export DATABASE_URL_LOCAL="file:./dev.db"

print_status "Environment set to: $NODE_ENV"
print_status "Database URL: $DATABASE_URL_LOCAL"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    yarn install
fi

# Generate Prisma client
print_status "Generating Prisma client..."
yarn db:generate

# Push database schema
print_status "Pushing database schema..."
yarn db:push

# Seed database
print_status "Seeding database..."
yarn db:seed

print_success "Database setup completed!"
echo ""
echo "📋 Available commands:"
echo "  yarn db:studio    - Open Prisma Studio"
echo "  yarn db:reset     - Reset and reseed database"
echo "  yarn db:seed      - Seed database only"
echo ""
echo "🔗 Test accounts:"
echo "  Admin:     admin@rentalshop.com / admin123"
echo "  Client:    client@rentalshop.com / client123"
echo "  Merchant:  merchant@rentalshop.com / merchant123"
echo "  Manager:   manager@rentalshop.com / manager123"
echo "  Staff:     staff@rentalshop.com / staff123"
echo ""
echo "🌐 Start applications:"
echo "  yarn dev:api      - Start API server (port 3002)"
echo "  yarn dev:client   - Start client app (port 3000)"
echo "  yarn dev:admin    - Start admin app (port 3001)" 
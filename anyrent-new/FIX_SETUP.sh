#!/bin/bash

# Quick Setup Fix Script for anyrent-new

set -e

echo "🔍 Checking setup..."

# Get current directory
CURRENT_DIR=$(pwd)
echo "Current directory: $CURRENT_DIR"

# Check if we're in the right place
if [[ ! -f "package.json" ]]; then
    echo "❌ Error: package.json not found"
    echo "Please run this script from the anyrent-new directory"
    exit 1
fi

# Get PostgreSQL username
PG_USER=$(whoami)
echo ""
echo "📋 Detected PostgreSQL username: $PG_USER"
echo ""

# Step 1: Install dependencies
echo "📦 Step 1: Installing dependencies..."
if [ ! -d "node_modules" ]; then
    yarn install
else
    echo "✅ Dependencies already installed"
fi

# Step 2: Create .env.local
echo ""
echo "📝 Step 2: Creating .env.local..."
cat > .env.local << EOF
# Main Database (PostgreSQL) - Stores tenant metadata
MAIN_DATABASE_URL=postgresql://${PG_USER}:@localhost:5432/main_db

# Tenant Database Template (will be overridden per tenant)
DATABASE_URL=postgresql://${PG_USER}:@localhost:5432/template_db

# Domain Configuration
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000
NODE_ENV=development
EOF

echo "✅ Created .env.local with username: $PG_USER"

# Step 3: Check PostgreSQL
echo ""
echo "🔌 Step 3: Checking PostgreSQL connection..."
if command -v pg_isready &> /dev/null; then
    if pg_isready -h localhost > /dev/null 2>&1; then
        echo "✅ PostgreSQL is running"
    else
        echo "⚠️  PostgreSQL might not be running"
        echo "   Start it with: brew services start postgresql (macOS)"
    fi
else
    echo "⚠️  pg_isready not found - cannot check PostgreSQL"
fi

# Step 4: Create main_db
echo ""
echo "🗄️  Step 4: Creating main_db database..."
psql -U "${PG_USER}" postgres -c "CREATE DATABASE main_db;" 2>&1 | grep -v "already exists" || echo "✅ Database main_db exists or created"

# Step 5: Setup main database tables
echo ""
echo "📋 Step 5: Setting up Main DB tables..."
if [ -f "scripts/setup-main-db.js" ]; then
    yarn db:setup-main
else
    echo "❌ Error: scripts/setup-main-db.js not found"
    exit 1
fi

# Step 6: Generate Prisma client
echo ""
echo "⚙️  Step 6: Generating Prisma client..."
yarn db:generate

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Start API server:    cd apps/api && yarn dev"
echo "2. Start Admin app:     cd apps/admin && yarn dev"
echo "3. Start Client app:    cd apps/client && yarn dev"
echo "4. Visit:               http://localhost:3000"
echo ""

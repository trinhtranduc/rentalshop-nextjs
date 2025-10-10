#!/bin/bash

# ============================================================================
# 🗄️ Setup Production Database Schema
# ============================================================================
# Script này tự động chuyển schema từ SQLite → PostgreSQL cho production
# Usage: ./scripts/setup-production-db.sh
# ============================================================================

set -e

echo "🔄 Converting schema from SQLite to PostgreSQL for production..."

# Backup original schema
cp prisma/schema.prisma prisma/schema.prisma.backup

# Replace sqlite with postgresql
sed -i.bak 's/provider = "sqlite"/provider = "postgresql"/g' prisma/schema.prisma

# Remove backup file
rm prisma/schema.prisma.bak 2>/dev/null || true

echo "✅ Schema updated to PostgreSQL"
echo "📝 Backup saved to: prisma/schema.prisma.backup"

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

echo "✅ Production database setup complete!"


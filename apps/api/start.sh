#!/bin/sh
set -e

echo "🚀 Starting API server with automatic migrations..."

# Generate Prisma Client (ensure it's up to date)
echo "🔄 Generating Prisma Client..."
npx prisma generate --schema=../../prisma/schema.prisma

# Run database migrations automatically
echo "📦 Running database migrations..."
npx prisma migrate deploy --schema=../../prisma/schema.prisma

# Start Next.js server
echo "🌐 Starting Next.js server on port 3002..."
exec ../../node_modules/.bin/next start -p 3002

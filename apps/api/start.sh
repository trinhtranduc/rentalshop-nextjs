#!/bin/sh
# Don't use set -e here - we want to handle migration failures gracefully

echo "🚀 Starting API server with automatic migrations..."

# Generate Prisma Client (ensure it's up to date)
echo "🔄 Generating Prisma Client..."
if ! npx prisma generate --schema=../../prisma/schema.prisma; then
  echo "❌ Failed to generate Prisma Client"
  exit 1
fi

# Run database migrations automatically
echo "📦 Running database migrations..."
if ! npx prisma migrate deploy --schema=../../prisma/schema.prisma; then
  echo "⚠️ Migration failed or already applied - continuing anyway"
  echo "⚠️ This is normal if migrations were already applied or database is not ready yet"
  # Don't exit - allow server to start even if migration fails
  # Server will retry on next restart
fi

# Start Next.js server
echo "🌐 Starting Next.js server on port 3002..."
exec ../../node_modules/.bin/next start -p 3002

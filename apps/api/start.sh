#!/bin/sh
set -e

echo "🚀 Starting API server..."

# Run database migrations before starting the server
echo "📦 Running database migrations..."
npx prisma migrate deploy --schema=../../prisma/schema.prisma

if [ $? -eq 0 ]; then
  echo "✅ Migrations completed successfully"
else
  echo "⚠️ Migrations failed, but continuing..."
fi

# Generate Prisma Client (in case it's not generated)
echo "🔄 Ensuring Prisma Client is generated..."
npx prisma generate --schema=../../prisma/schema.prisma

# Start Next.js server
echo "🌐 Starting Next.js server on port 3002..."
exec ../../node_modules/.bin/next start -p 3002


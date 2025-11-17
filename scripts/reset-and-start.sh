#!/bin/sh
set -e

# Script to reset database and then start the server
# This is for Railway deployment when you want to reset DB on deploy

echo "🔄 Starting database reset and server startup..."

# Step 1: Reset database
echo "📦 Step 1: Resetting database..."
node scripts/reset-railway-database.js

# Step 2: Start Next.js server
echo "🌐 Step 2: Starting Next.js server..."
cd apps/api
exec ../../node_modules/.bin/next start -p 3002


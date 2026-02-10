#!/bin/bash

# Script to import all SEO articles with proper environment setup
# Usage: ./scripts/import-all-seo-articles.sh

echo "🚀 Importing all SEO articles..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    echo "Please ensure DATABASE_URL is set in .env file"
    echo "Or set it as environment variable:"
    echo "  export DATABASE_URL='your-database-url'"
    exit 1
fi

# Load .env file
export $(cat .env | grep -v '^#' | xargs)

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not found in .env file"
    echo "Please add DATABASE_URL to .env file"
    exit 1
fi

# Run import script
echo "✅ Environment variables loaded"
echo "📝 Starting import..."
echo ""

node scripts/import-seo-articles.js

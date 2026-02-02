#!/bin/bash

# Script to sync product embeddings to Qdrant in production
# Usage: ./scripts/sync-embeddings-production.sh

set -e

echo "🚀 Syncing product embeddings to Qdrant (Production)"
echo "=================================================="
echo ""

# Check required environment variables
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL is not set"
  echo "   Please set: export DATABASE_URL='postgresql://...'"
  exit 1
fi

if [ -z "$QDRANT_URL" ]; then
  echo "❌ QDRANT_URL is not set"
  echo "   Please set: export QDRANT_URL='https://...'"
  exit 1
fi

if [ -z "$QDRANT_API_KEY" ]; then
  echo "❌ QDRANT_API_KEY is not set"
  echo "   Please set: export QDRANT_API_KEY='...'"
  exit 1
fi

if [ -z "$PYTHON_EMBEDDING_API_URL" ]; then
  echo "❌ PYTHON_EMBEDDING_API_URL is not set"
  echo "   Please set: export PYTHON_EMBEDDING_API_URL='https://...'"
  exit 1
fi

if [ -z "$QDRANT_COLLECTION_ENV" ]; then
  echo "❌ QDRANT_COLLECTION_ENV is not set (REQUIRED)"
  echo "   Please set: export QDRANT_COLLECTION_ENV='production'"
  echo "   This determines which Qdrant collection to use:"
  echo "   - production → product-images-pro"
  echo "   - development → product-images-dev"
  exit 1
fi

if [ -z "$AWS_ACCESS_KEY_ID" ]; then
  echo "⚠️  AWS_ACCESS_KEY_ID is not set (needed for S3 image downloads)"
fi

if [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
  echo "⚠️  AWS_SECRET_ACCESS_KEY is not set (needed for S3 image downloads)"
fi

echo "✅ Environment variables check passed"
echo ""
echo "📋 Configuration:"
echo "   DATABASE_URL: ${DATABASE_URL:0:50}..."
echo "   QDRANT_URL: $QDRANT_URL"
echo "   QDRANT_API_KEY: ${QDRANT_API_KEY:0:20}..."
echo "   PYTHON_EMBEDDING_API_URL: $PYTHON_EMBEDDING_API_URL"
echo "   QDRANT_COLLECTION_ENV: $QDRANT_COLLECTION_ENV (REQUIRED)"
echo "   NODE_ENV: production"
echo "   APP_ENV: production"
echo ""

# Set required environment variables
export USE_PYTHON_EMBEDDING_API=true
export NODE_ENV=production
export APP_ENV=production
# QDRANT_COLLECTION_ENV should already be set, but ensure it's production for production sync
if [ "$QDRANT_COLLECTION_ENV" != "production" ] && [ "$QDRANT_COLLECTION_ENV" != "prod" ]; then
  echo "⚠️  WARNING: QDRANT_COLLECTION_ENV is set to '$QDRANT_COLLECTION_ENV'"
  echo "   For production sync, it should be 'production'"
  echo "   Current value will be used: $QDRANT_COLLECTION_ENV"
fi

echo "🔄 Starting embedding generation..."
echo ""

# Run the script
yarn tsx scripts/generate-embeddings-only.ts

echo ""
echo "✅ Embedding sync completed!"

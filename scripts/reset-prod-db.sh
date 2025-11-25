#!/bin/bash

# Production Database Reset Script (for local testing with public URL)
# WARNING: This will DELETE ALL DATA in production database!

PROD_DB_URL='postgresql://postgres:rcoiKvDAztXzqINtiUYlxZaPDpqrtRLg@maglev.proxy.rlwy.net:46280/railway'

echo "🔴 PRODUCTION DATABASE RESET"
echo "⚠️  WARNING: This will DELETE ALL DATA!"
echo ""
read -p "Are you sure? Type 'yes' to continue: " confirm

if [ "$confirm" != "yes" ]; then
  echo "❌ Cancelled"
  exit 1
fi

echo ""
echo "🔄 Resetting production database..."
echo ""

DATABASE_URL="$PROD_DB_URL" node scripts/reset-railway-database.js

#!/bin/bash

# Export Production Database URL
# Usage: source scripts/export-prod-db-url.sh
# Or: . scripts/export-prod-db-url.sh

export DATABASE_URL='postgresql://postgres:rcoiKvDAztXzqINtiUYlxZaPDpqrtRLg@maglev.proxy.rlwy.net:46280/railway'

echo "✅ Production DATABASE_URL exported!"
echo "   Host: maglev.proxy.rlwy.net:46280"
echo ""
echo "💡 Usage:"
echo "   source scripts/export-prod-db-url.sh"
echo "   node scripts/reset-railway-database.js"

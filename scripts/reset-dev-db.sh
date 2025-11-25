#!/bin/bash

# Development Database Reset Script
# This script resets the development database with fresh data

DEV_DB_URL='postgresql://postgres:kWGqYPjEgJLKSmDroFFSsnVjKsUFcnmv@shuttle.proxy.rlwy.net:25662/railway'

echo "🟢 Resetting Development Database..."
echo ""

DATABASE_URL="$DEV_DB_URL" node scripts/reset-railway-database.js


#!/bin/bash

# Test Production Database Connection
# This script tests connection to production database

PROD_DB_URL='postgresql://postgres:rcoiKvDAztXzqINtiUYlxZaPDpqrtRLg@maglev.proxy.rlwy.net:46280/railway'

echo "🔍 Testing Production Database Connection..."
echo ""

DATABASE_URL="$PROD_DB_URL" node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    await prisma.\$queryRaw\`SELECT 1\`;
    console.log('✅ Connection: SUCCESS');
    
    try {
      const merchants = await prisma.merchant.count();
      console.log('✅ Schema: EXISTS');
      console.log('   Merchants:', merchants);
      console.log('   Orders:', await prisma.order.count());
      console.log('   Users:', await prisma.user.count());
    } catch (error) {
      if (error.message.includes('does not exist')) {
        console.log('⚠️  Schema: NOT EXISTS (need to run migrations)');
      } else {
        throw error;
      }
    }
    
    await prisma.\$disconnect();
  } catch (error) {
    console.error('❌ Connection: FAILED');
    console.error('   Error:', error.message);
    process.exit(1);
  }
}

test();
"

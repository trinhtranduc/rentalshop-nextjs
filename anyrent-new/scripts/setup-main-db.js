#!/usr/bin/env node

/**
 * Setup Main Database Tables
 * This script creates the necessary tables in the Main DB for multi-tenant architecture
 * 
 * Usage: node scripts/setup-main-db.js
 * 
 * Requires: MAIN_DATABASE_URL environment variable
 */

// Load environment variables from .env.local
// Use dotenv if available, otherwise parse manually
let envLoaded = false;
try {
  require('dotenv').config({ path: '.env.local' });
  envLoaded = true;
  console.log('✅ Loaded .env.local using dotenv');
} catch (e) {
  // Fallback: manual parsing
  const path = require('path');
  const fs = require('fs');
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([^#=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let value = match[2].trim();
          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    });
    console.log('✅ Loaded .env.local (manual parsing)');
    envLoaded = true;
  }
}

if (!envLoaded) {
  console.warn('⚠️  .env.local not found, using environment variables from system');
}

const { Client } = require('pg');

async function setupMainDb() {
  const mainDbUrl = process.env.MAIN_DATABASE_URL;

  if (!mainDbUrl) {
    console.error('❌ Error: MAIN_DATABASE_URL environment variable is required');
    console.error('');
    console.error('💡 Solutions:');
    console.error('   1. Create .env.local file in the root directory');
    console.error('   2. Add: MAIN_DATABASE_URL=postgresql://USERNAME:@localhost:5432/main_db');
    console.error('   3. Replace USERNAME with your PostgreSQL username (run: whoami)');
    console.error('');
    const path = require('path');
    const fs = require('fs');
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) {
      console.error(`   📝 File should be at: ${envPath}`);
    } else {
      console.error(`   📝 File exists at: ${envPath}`);
      console.error('   💡 Check if MAIN_DATABASE_URL is defined in the file');
    }
    process.exit(1);
  }

  const url = new URL(mainDbUrl);
  const client = new Client({
    host: url.hostname,
    port: parseInt(url.port || '5432'),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
  });

  try {
    console.log('🔌 Connecting to Main Database...');
    await client.connect();
    console.log('✅ Connected to Main Database');

    // Create Merchant table
    console.log('\n📋 Creating Merchant table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Merchant" (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        email VARCHAR UNIQUE NOT NULL,
        phone VARCHAR,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Merchant table created');

    // Create Tenant table
    console.log('\n📋 Creating Tenant table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Tenant" (
        id VARCHAR PRIMARY KEY,
        subdomain VARCHAR UNIQUE NOT NULL,
        name VARCHAR NOT NULL,
        "merchantId" INTEGER UNIQUE NOT NULL REFERENCES "Merchant"(id),
        "databaseUrl" VARCHAR NOT NULL,
        status VARCHAR DEFAULT 'active',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Tenant table created');

    // Create indexes
    console.log('\n📋 Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_subdomain ON "Tenant"(subdomain);
      CREATE INDEX IF NOT EXISTS idx_tenant_status ON "Tenant"(status);
      CREATE INDEX IF NOT EXISTS idx_merchant_email ON "Merchant"(email);
    `);
    console.log('✅ Indexes created');

    console.log('\n🎉 Main Database setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Run: yarn db:generate (to generate Prisma client for Tenant DB)');
    console.log('2. Start servers: yarn dev (or start each app individually)');
    console.log('3. Visit http://localhost:3000 to create your first tenant');
  } catch (error) {
    console.error('\n❌ Error setting up Main Database:');
    console.error(error.message);
    if (error.code === '42P01') {
      console.error('\n💡 Tip: Make sure the database exists. Create it with:');
      console.error('   CREATE DATABASE main_db;');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupMainDb();

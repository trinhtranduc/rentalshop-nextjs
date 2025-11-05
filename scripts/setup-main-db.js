#!/usr/bin/env node

/**
 * Setup Main Database for Multi-Tenant Architecture
 * Creates Plan and Tenant tables using raw SQL
 * 
 * Supports both:
 * - Local development: Reads from .env.local
 * - Railway deployment: Reads from environment variables
 */

const { Client } = require('pg');

// Try loading .env.local for local development
// On Railway, environment variables are already set
if (process.env.NODE_ENV !== 'production') {
  try {
    require('dotenv').config({ path: '.env.local' });
  } catch (e) {
    // .env.local not found, continue with environment variables
  }
}

async function setupMainDatabase() {
  if (!process.env.MAIN_DATABASE_URL) {
    console.error('❌ Error: MAIN_DATABASE_URL environment variable is required');
    console.error('');
    console.error('Local Development:');
    console.error('  Add MAIN_DATABASE_URL to .env.local');
    console.error('');
    console.error('Railway Deployment:');
    console.error('  Set MAIN_DATABASE_URL in Railway dashboard');
    console.error('  Or use: railway variables --set MAIN_DATABASE_URL=${{Postgres.DATABASE_URL}}');
    process.exit(1);
  }

  // Parse connection string (supports both local and Railway)
  const url = new URL(process.env.MAIN_DATABASE_URL);
  const client = new Client({
    host: url.hostname,
    port: parseInt(url.port || '5432'),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: url.hostname.includes('railway') || url.hostname.includes('railway.app') 
      ? { rejectUnauthorized: false } 
      : false
  });

  try {
    console.log('🔌 Connecting to Main Database...');
    console.log(`   Host: ${url.hostname}`);
    console.log(`   Database: ${url.pathname.slice(1)}`);
    await client.connect();
    console.log('✅ Connected to Main Database');

    // Create Plan table
    console.log('\n📋 Creating Plan table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Plan" (
        id SERIAL PRIMARY KEY,
        name VARCHAR UNIQUE NOT NULL,
        description TEXT NOT NULL,
        "basePrice" DECIMAL(10, 2) NOT NULL,
        currency VARCHAR DEFAULT 'USD',
        "trialDays" INTEGER DEFAULT 14,
        limits TEXT DEFAULT '{"outlets": 0, "users": 0, "products": 0, "customers": 0}',
        features TEXT DEFAULT '[]',
        "isActive" BOOLEAN DEFAULT true,
        "isPopular" BOOLEAN DEFAULT false,
        "sortOrder" INTEGER DEFAULT 0,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        "deletedAt" TIMESTAMP NULL
      )
    `);
    console.log('✅ Plan table created');

    // Create indexes for Plan
    await client.query('CREATE INDEX IF NOT EXISTS idx_plan_is_active ON "Plan"("isActive")');
    await client.query('CREATE INDEX IF NOT EXISTS idx_plan_sort_order ON "Plan"("sortOrder")');
    await client.query('CREATE INDEX IF NOT EXISTS idx_plan_deleted_at ON "Plan"("deletedAt")');
    console.log('✅ Plan indexes created');

    // Create Tenant table
    console.log('\n📋 Creating Tenant table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS "Tenant" (
        id VARCHAR PRIMARY KEY,
        subdomain VARCHAR UNIQUE NOT NULL,
        name VARCHAR NOT NULL,
        email VARCHAR UNIQUE NOT NULL,
        phone VARCHAR,
        address VARCHAR,
        city VARCHAR,
        state VARCHAR,
        "zipCode" VARCHAR,
        country VARCHAR,
        "taxId" VARCHAR,
        "businessType" VARCHAR,
        website VARCHAR,
        description TEXT,
        "databaseUrl" VARCHAR NOT NULL,
        status VARCHAR DEFAULT 'active',
        "planId" INTEGER REFERENCES "Plan"(id),
        "subscriptionStatus" VARCHAR DEFAULT 'trial',
        "currentPeriodStart" TIMESTAMP,
        "currentPeriodEnd" TIMESTAMP,
        "trialStart" TIMESTAMP,
        "trialEnd" TIMESTAMP,
        "canceledAt" TIMESTAMP,
        "cancelReason" TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Tenant table created');

    // Create indexes for Tenant
    await client.query('CREATE INDEX IF NOT EXISTS idx_tenant_subdomain ON "Tenant"(subdomain)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_tenant_status ON "Tenant"(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_tenant_email ON "Tenant"(email)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_tenant_subscription_status ON "Tenant"("subscriptionStatus")');
    await client.query('CREATE INDEX IF NOT EXISTS idx_tenant_plan_id ON "Tenant"("planId")');
    console.log('✅ Tenant indexes created');

    console.log('\n🎉 Main Database setup completed successfully!');
    console.log('\n📊 Tables created:');
    console.log('   - Plan (subscription plans)');
    console.log('   - Tenant (tenant metadata)');

  } catch (error) {
    console.error('\n❌ Error setting up Main Database:', error.message);
    if (error.code === '42P01') {
      console.error('   Make sure the database exists and the user has CREATE TABLE permissions');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   Cannot connect to database. Check connection string and network access.');
    } else if (error.code === '3D000') {
      console.error('   Database does not exist. Create it first or check connection string.');
    }
    console.error('\n   Full error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run setup
setupMainDatabase();

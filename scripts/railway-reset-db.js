#!/usr/bin/env node

/**
 * Script to reset database on Railway, setup Main DB, and create super admin
 * 
 * This script:
 * 1. Resets Main DB (drops all tables and recreates schema)
 * 2. Runs migrations for Main DB
 * 3. Creates super admin user in Main DB
 * 
 * Usage:
 *   # On Railway (recommended)
 *   railway run --service api node scripts/railway-reset-db.js
 * 
 *   # Locally (with environment variables)
 *   MAIN_DATABASE_URL="postgresql://..." DATABASE_URL="postgresql://..." node scripts/railway-reset-db.js
 * 
 *   # With custom admin credentials
 *   ADMIN_EMAIL="admin@rentalshop.com" ADMIN_PASSWORD="admin123" railway run --service api node scripts/railway-reset-db.js
 */

const { execSync } = require('child_process');
const bcrypt = require('bcryptjs');

// Import getMainDb from database package
// Note: Database package must be built first (yarn workspace @rentalshop/database build)
let getMainDb;
try {
  const dbPackage = require('../packages/database/dist/index');
  getMainDb = dbPackage.getMainDb;
  if (!getMainDb) {
    throw new Error('getMainDb not found in database package exports');
  }
} catch (error) {
  console.error('\n❌ Failed to import getMainDb from database package');
  console.error('   Error:', error.message);
  console.error('\n💡 Solution: Build database package first');
  console.error('   Run: yarn workspace @rentalshop/database build');
  console.error('   Or: yarn build (from root)\n');
  throw error;
}

// Helper function to mask sensitive information
function maskDatabaseUrl(url) {
  if (!url) return 'Not set';
  try {
    const urlObj = new URL(url);
    if (urlObj.password) {
      urlObj.password = '***';
    }
    return urlObj.toString();
  } catch (e) {
    return url.substring(0, 20) + '...';
  }
}

// Check environment variables
function checkEnvironment() {
  console.log('\n🔍 Checking environment variables...\n');
  
  const mainDbUrl = process.env.MAIN_DATABASE_URL;
  const dbUrl = process.env.DATABASE_URL;
  
  console.log(`📊 MAIN_DATABASE_URL: ${maskDatabaseUrl(mainDbUrl)}`);
  console.log(`📊 DATABASE_URL: ${maskDatabaseUrl(dbUrl)}`);
  
  if (!mainDbUrl) {
    throw new Error('MAIN_DATABASE_URL environment variable is not set!\n' +
      'Please ensure MAIN_DATABASE_URL is configured:\n' +
      '  - On Railway: railway variables --service api\n' +
      '  - Locally: Set MAIN_DATABASE_URL in .env file');
  }
  
  console.log('✅ Environment variables are set\n');
}

// Reset Main DB by dropping all tables
async function resetMainDb() {
  console.log('🔄 Resetting Main Database...\n');
  
  const mainDb = await getMainDb();
  await mainDb.connect();
  
  try {
    console.log('   ⚠️  Dropping all tables in Main DB...');
    
    // Drop all tables in Main DB (in correct order to handle foreign keys)
    const dropQueries = [
      'DROP TABLE IF EXISTS "Tenant" CASCADE',
      'DROP TABLE IF EXISTS "Merchant" CASCADE',
      'DROP TABLE IF EXISTS "User" CASCADE',
      'DROP TABLE IF EXISTS "Plan" CASCADE'
    ];
    
    for (const query of dropQueries) {
      try {
        await mainDb.query(query);
        console.log(`   ✅ Dropped: ${query.match(/DROP TABLE IF EXISTS "(\w+)"/)?.[1] || 'table'}`);
      } catch (error) {
        console.log(`   ⚠️  ${query.match(/DROP TABLE IF EXISTS "(\w+)"/)?.[1] || 'table'} may not exist: ${error.message}`);
      }
    }
    
    console.log('\n✅ Main Database reset complete\n');
  } catch (error) {
    console.error('\n❌ Error resetting Main DB:', error.message);
    throw error;
  } finally {
    await mainDb.end();
  }
}

// Run Prisma migrations for Main DB
async function migrateMainDb() {
  console.log('📦 Running Prisma migrations for Main DB...\n');
  
  try {
    // Use db push to sync schema (faster than migrations for reset)
    console.log('   Running: npx prisma db push --schema=prisma/main/schema.prisma --accept-data-loss');
    
    execSync('npx prisma db push --schema=prisma/main/schema.prisma --accept-data-loss', {
      stdio: 'inherit',
      env: { ...process.env },
      cwd: process.cwd()
    });
    
    console.log('\n✅ Main DB migrations complete\n');
  } catch (error) {
    console.error('\n❌ Error running Main DB migrations:', error.message);
    throw error;
  }
}

// Create super admin in Main DB
async function createSuperAdmin() {
  console.log('👑 Creating super admin user in Main DB...\n');
  
  const mainDb = await getMainDb();
  await mainDb.connect();
  
  try {
    const email = process.env.ADMIN_EMAIL || 'admin@rentalshop.com';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const firstName = process.env.ADMIN_FIRST_NAME || 'Super';
    const lastName = process.env.ADMIN_LAST_NAME || 'Administrator';
    const phone = process.env.ADMIN_PHONE || '+1-555-0001';

    console.log(`   Email: ${email}`);
    console.log(`   Name: ${firstName} ${lastName}`);

    // Check if admin already exists
    const existing = await mainDb.query(
      'SELECT id, email, role FROM "User" WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      console.log(`\n⚠️  Admin user already exists: ${email}`);
      console.log('   User ID:', existing.rows[0].id);
      console.log('   Role:', existing.rows[0].role);
      
      const updatePassword = process.env.UPDATE_PASSWORD === 'true';
      if (updatePassword) {
        const hashedPassword = await bcrypt.hash(password, 12);
        await mainDb.query(
          'UPDATE "User" SET password = $1, "updatedAt" = NOW() WHERE email = $2',
          [hashedPassword, email]
        );
        console.log(`\n✅ Updated password for admin: ${email}`);
      } else {
        console.log('\n💡 To update password, set UPDATE_PASSWORD=true');
        console.log('\n✅ Skipping creation (user already exists)');
        return;
      }
    } else {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create admin user (admin users don't need email verification)
      const result = await mainDb.query(
        'INSERT INTO "User" (email, password, "firstName", "lastName", phone, role, "isActive", "emailVerified", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, true, true, NOW(), NOW()) RETURNING id, email, "firstName", "lastName", role',
        [email, hashedPassword, firstName, lastName, phone, 'ADMIN']
      );

      const admin = result.rows[0];

      console.log('\n✅ Super admin created successfully!');
      console.log('   ID:', admin.id);
      console.log('   Email:', admin.email);
      console.log('   Name:', admin.firstName, admin.lastName);
      console.log('   Role:', admin.role);
    }

    console.log('\n📝 Login credentials:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('\n⚠️  Please change the default password after first login!');

  } catch (error) {
    console.error('\n❌ Error creating super admin:', error.message);
    console.error('   Details:', error);
    throw error;
  } finally {
    await mainDb.end();
  }
}

// Main function
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Railway Database Reset & Setup Script');
  console.log('='.repeat(60));
  
  try {
    // Step 1: Check environment
    checkEnvironment();
    
    // Step 2: Reset Main DB
    await resetMainDb();
    
    // Step 3: Run migrations
    await migrateMainDb();
    
    // Step 4: Create super admin
    await createSuperAdmin();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Database reset and setup completed successfully!');
    console.log('='.repeat(60));
    console.log('\n📋 Summary:');
    console.log('   ✅ Main DB reset and migrated');
    console.log('   ✅ Super admin created');
    console.log('\n💡 Next steps:');
    console.log('   1. Test login with admin credentials');
    console.log('   2. Change default password');
    console.log('   3. Create test merchants and tenants if needed');
    console.log('\n');
    
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ Script failed:', error.message);
    console.error('='.repeat(60));
    console.error('\n');
    process.exit(1);
  }
}

// Run script
if (require.main === module) {
  main();
}

module.exports = { main, resetMainDb, migrateMainDb, createSuperAdmin };


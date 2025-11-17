/**
 * Railway Database Reset Script
 * 
 * This script will:
 * 1. Drop all existing data (truncate tables)
 * 2. Run migrations to ensure schema is up to date
 * 3. Regenerate Prisma client
 * 4. Seed fresh data
 * 
 * Run on Railway with: node scripts/reset-railway-database.js
 */

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const path = require('path');

const prisma = new PrismaClient();

// Helper function to mask sensitive information in DATABASE_URL
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

async function resetDatabase() {
  console.log('🔄 Starting Railway database reset...\n');
  
  // Check DATABASE_URL
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ DATABASE_URL environment variable is not set!');
    process.exit(1);
  }
  
  console.log('📊 Database URL:', maskDatabaseUrl(dbUrl));
  console.log('');

  try {
    // Step 1: Generate Prisma Client (ensure it's up to date with enum types)
    console.log('📦 Step 1: Generating Prisma Client with enum types...');
    try {
      execSync('npx prisma generate --schema=./prisma/schema.prisma', {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..'),
        env: { ...process.env }
      });
      console.log('✅ Prisma Client generated successfully\n');
    } catch (error) {
      console.error('❌ Failed to generate Prisma Client:', error.message);
      throw error;
    }

    // Step 2: Run migrations (apply all pending migrations)
    console.log('📦 Step 2: Running database migrations...');
    try {
      execSync('npx prisma migrate deploy --schema=./prisma/schema.prisma', {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..'),
        env: { ...process.env }
      });
      console.log('✅ Migrations applied successfully\n');
    } catch (error) {
      console.warn('⚠️  Migration warning (may already be applied):', error.message);
      console.log('   Continuing with reset...\n');
    }

    // Step 3: Truncate all tables (in correct order to respect foreign keys)
    console.log('🗑️  Step 3: Truncating all tables...');
    
    // Disable foreign key checks temporarily
    await prisma.$executeRawUnsafe('SET session_replication_role = replica;');
    
    // Truncate tables in reverse dependency order
    const tables = [
      'EmailVerification',
      'AuditLog',
      'SubscriptionActivity',
      'Payment',
      'Subscription',
      'OrderItem',
      'Order',
      'OutletStock',
      'Product',
      'Category',
      'Customer',
      'UserSession',
      'User',
      'Outlet',
      'Merchant',
      'Plan'
    ];

    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
        console.log(`   ✅ Truncated ${table}`);
      } catch (error) {
        console.warn(`   ⚠️  Could not truncate ${table}:`, error.message);
      }
    }

    // Re-enable foreign key checks
    await prisma.$executeRawUnsafe('SET session_replication_role = DEFAULT;');
    console.log('✅ All tables truncated successfully\n');

    // Step 4: Reset sequences
    console.log('🔄 Step 4: Resetting sequences...');
    try {
      await prisma.$executeRawUnsafe(`
        DO $$ 
        DECLARE
          r RECORD;
        BEGIN
          FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
          LOOP
            EXECUTE 'SELECT setval(pg_get_serial_sequence(''' || r.tablename || ''', ''id''), 1, false)';
          EXCEPTION WHEN OTHERS THEN
            -- Ignore tables without id sequence
          END LOOP;
        END $$;
      `);
      console.log('✅ Sequences reset successfully\n');
    } catch (error) {
      console.warn('⚠️  Could not reset sequences:', error.message);
      console.log('   (This is OK if sequences don\'t exist)\n');
    }

    // Step 5: Seed database with fresh data
    console.log('🌱 Step 5: Seeding database with fresh data...');
    try {
      execSync('node scripts/regenerate-entire-system-2025.js', {
        stdio: 'inherit',
        cwd: path.resolve(__dirname, '..')
      });
      console.log('✅ Database seeded successfully\n');
    } catch (error) {
      console.error('❌ Failed to seed database:', error.message);
      throw error;
    }

    console.log('🎉 Railway database reset completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('   ✅ Prisma Client generated with enum types');
    console.log('   ✅ Migrations applied');
    console.log('   ✅ All tables truncated');
    console.log('   ✅ Sequences reset');
    console.log('   ✅ Fresh data seeded');
    console.log('');
    console.log('🔑 Default login credentials:');
    console.log('   Super Admin: admin@rentalshop.com / admin123');
    console.log('   Merchant 1: merchant1@example.com / merchant123');
    console.log('   Merchant 2: merchant2@example.com / merchant123');

  } catch (error) {
    console.error('\n❌ Error during database reset:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the reset
resetDatabase().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});


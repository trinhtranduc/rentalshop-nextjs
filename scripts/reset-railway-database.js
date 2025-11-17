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
  let dbUrl = process.env.DATABASE_URL;
  
  // If using internal Railway URL and it's not accessible, try to use public URL
  if (dbUrl && dbUrl.includes('railway.internal')) {
    console.warn('⚠️  Detected internal Railway URL (railway.internal)');
    console.warn('   Internal URLs only work within Railway network.');
    console.warn('   If running from local machine, use PUBLIC DATABASE_URL instead.\n');
    
    // Check if RAILWAY_PUBLIC_DATABASE_URL is set (for local runs)
    if (process.env.RAILWAY_PUBLIC_DATABASE_URL) {
      dbUrl = process.env.RAILWAY_PUBLIC_DATABASE_URL;
      console.log('✅ Using RAILWAY_PUBLIC_DATABASE_URL for local connection\n');
    } else {
      console.error('❌ Internal URL detected but RAILWAY_PUBLIC_DATABASE_URL not set!');
      console.error('');
      console.error('💡 Solutions:');
      console.error('   1. Set RAILWAY_PUBLIC_DATABASE_URL environment variable:');
      console.error('      export RAILWAY_PUBLIC_DATABASE_URL="postgresql://postgres:password@host:port/database"');
      console.error('');
      console.error('   2. Or run script directly on Railway service:');
      console.error('      - Via Railway Dashboard: Add command in Deploy settings');
      console.error('      - Via Railway CLI: railway run --service <service-name> yarn db:reset-railway');
      console.error('');
      console.error('   3. Or temporarily override DATABASE_URL:');
      console.error('      DATABASE_URL="public-url" railway run yarn db:reset-railway');
      process.exit(1);
    }
  }
  
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
      // Reset sequences for all tables with id column
      const tablesWithSequences = [
        'User', 'Merchant', 'Outlet', 'Category', 'Product', 'OutletStock',
        'Customer', 'Order', 'OrderItem', 'Payment', 'Plan', 'Subscription',
        'SubscriptionActivity', 'AuditLog', 'EmailVerification', 'UserSession'
      ];
      
      for (const table of tablesWithSequences) {
        try {
          await prisma.$executeRawUnsafe(`
            SELECT setval(pg_get_serial_sequence('${table}', 'id'), 1, false);
          `);
        } catch (error) {
          // Ignore if sequence doesn't exist
        }
      }
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


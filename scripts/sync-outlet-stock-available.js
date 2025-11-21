/**
 * Script to sync OutletStock.available field
 * Recalculates available = stock - renting for all OutletStock entries
 * 
 * Usage: 
 *   - Local: DATABASE_URL="postgresql://..." node scripts/sync-outlet-stock-available.js
 *   - Railway: railway run node scripts/sync-outlet-stock-available.js
 */

const { PrismaClient } = require('@prisma/client');

// Helper function to mask sensitive information in DATABASE_URL
function maskDatabaseUrl(url) {
  if (!url) return 'Not set';
  try {
    const urlObj = new URL(url);
    if (urlObj.password) {
      urlObj.password = '***';
    }
    return urlObj.toString();
  } catch {
    return 'Invalid URL';
  }
}

const prisma = new PrismaClient();

// Check DATABASE_URL
const dbUrl = process.env.DATABASE_URL;
const maskedUrl = maskDatabaseUrl(dbUrl);
console.log(`📊 DATABASE_URL: ${maskedUrl}\n`);

if (!dbUrl) {
  console.error('❌ DATABASE_URL environment variable is not set!\n');
  console.error('Please ensure DATABASE_URL is configured:');
  console.error('  - Locally: Set DATABASE_URL in .env file or export it');
  console.error('  - Railway: DATABASE_URL is automatically set');
  console.error('\nExample:');
  console.error('  export DATABASE_URL="postgresql://user:password@host:port/database"');
  console.error('  node scripts/sync-outlet-stock-available.js');
  process.exit(1);
}

async function syncOutletStockAvailable() {
  console.log('🔄 Starting OutletStock.available sync...');
  
  try {
    // Get all OutletStock entries
    const allOutletStock = await prisma.outletStock.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true
          }
        },
        outlet: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    console.log(`📊 Found ${allOutletStock.length} OutletStock entries to check`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const stock of allOutletStock) {
      try {
        // Recalculate available = stock - renting
        const calculatedAvailable = Math.max(0, stock.stock - stock.renting);

        // Update if different
        if (stock.available !== calculatedAvailable) {
          await prisma.outletStock.update({
            where: { id: stock.id },
            data: { available: calculatedAvailable },
          });

          console.log(`✅ Updated: Product ${stock.product.id} (${stock.product.name}), Outlet ${stock.outlet.id} (${stock.outlet.name})`);
          console.log(`   ${stock.available} → ${calculatedAvailable} (stock: ${stock.stock}, renting: ${stock.renting})`);
          updated++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(`❌ Error updating OutletStock ${stock.id}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Sync Summary:');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped (already correct): ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📦 Total: ${allOutletStock.length}`);

    if (updated > 0) {
      console.log('\n✅ Sync completed successfully!');
    } else {
      console.log('\n✅ All OutletStock entries are already in sync!');
    }

  } catch (error) {
    console.error('❌ Fatal error during sync:', error);
    
    if (error.code === 'P1001') {
      console.error('\n💡 Database connection error:');
      console.error('  1. Check if DATABASE_URL is correct');
      console.error('  2. If running locally, ensure DATABASE_URL uses public URL, not internal Railway URL');
      console.error('  3. Check if database server is running');
      console.error('  4. Verify network connectivity');
    } else if (error.code === 'P1000') {
      console.error('\n💡 Authentication failed - check database credentials in DATABASE_URL');
    }
    
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the sync
syncOutletStockAvailable()
  .then(() => {
    console.log('🎉 Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });

/**
 * Script to sync OutletStock.available field
 * Recalculates available = stock - renting for all OutletStock entries
 * 
 * Usage: node scripts/sync-outlet-stock-available.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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

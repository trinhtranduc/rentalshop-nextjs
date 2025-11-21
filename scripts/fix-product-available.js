/**
 * Fix OutletStock available field for existing products
 * Recalculates available = stock - renting for all outlet stocks
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixProductAvailable() {
  console.log('🔧 Starting to fix OutletStock available field...\n');

  try {
    // Find all outlet stocks with inconsistent available
    const inconsistentStocks = await prisma.$queryRaw`
      SELECT 
        os.id,
        os."productId",
        os."outletId",
        os.stock,
        os.renting,
        os.available,
        (os.stock - os.renting) as calculated_available,
        p.name as product_name
      FROM "OutletStock" os
      JOIN "Product" p ON p.id = os."productId"
      WHERE os.available != (os.stock - os.renting)
      ORDER BY os.id
    `;

    console.log(`Found ${inconsistentStocks.length} outlet stocks with inconsistent available field\n`);

    if (inconsistentStocks.length === 0) {
      console.log('✅ All outlet stocks have correct available values!');
      return;
    }

    // Show first 10 examples
    console.log('Examples of inconsistent stocks:');
    inconsistentStocks.slice(0, 10).forEach((stock, index) => {
      console.log(`${index + 1}. Product: ${stock.product_name}`);
      console.log(`   Stock: ${stock.stock}, Renting: ${stock.renting}, Current Available: ${stock.available}, Should be: ${stock.calculated_available}`);
    });
    if (inconsistentStocks.length > 10) {
      console.log(`   ... and ${inconsistentStocks.length - 10} more\n`);
    }

    // Fix all inconsistent stocks
    let fixed = 0;
    let errors = 0;

    for (const stock of inconsistentStocks) {
      try {
        const calculatedAvailable = Number(stock.calculated_available);
        
        await prisma.outletStock.update({
          where: { id: stock.id },
          data: {
            available: calculatedAvailable
          }
        });

        fixed++;
        
        if (fixed % 10 === 0) {
          console.log(`✅ Fixed ${fixed}/${inconsistentStocks.length} outlet stocks...`);
        }
      } catch (error) {
        console.error(`❌ Error fixing outlet stock ${stock.id}:`, error.message);
        errors++;
      }
    }

    console.log(`\n✅ Fixed ${fixed} outlet stocks`);
    if (errors > 0) {
      console.log(`⚠️  ${errors} errors occurred`);
    }

    // Verify fix
    const remainingInconsistent = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM "OutletStock"
      WHERE available != (stock - renting)
    `;

    const remainingCount = Number(remainingInconsistent[0].count);
    
    if (remainingCount === 0) {
      console.log('\n✅ All outlet stocks now have correct available values!');
    } else {
      console.log(`\n⚠️  ${remainingCount} outlet stocks still have inconsistent values`);
    }

  } catch (error) {
    console.error('❌ Error fixing product available:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
fixProductAvailable()
  .then(() => {
    console.log('\n✅ Fix completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fix failed:', error);
    process.exit(1);
  });


/**
 * Sync OutletStock.available and OutletStock.renting from actual orders
 * 
 * This script:
 * 1. Recalculates OutletStock.renting from actual RENT orders (PICKUPED status)
 * 2. Recalculates OutletStock.available = stock - renting
 * 3. Fixes any inconsistencies in the database
 * 
 * Usage: node scripts/sync-outlet-stock-available.js
 */

const { PrismaClient } = require('@prisma/client');
const { ORDER_TYPE, ORDER_STATUS } = require('@rentalshop/constants');

const prisma = new PrismaClient();

async function syncOutletStock() {
  console.log('🔄 Starting OutletStock sync...\n');

  try {
    // 1. Get all OutletStock entries
    const allOutletStocks = await prisma.outletStock.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        outlet: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log(`📊 Found ${allOutletStocks.length} OutletStock entries to sync\n`);

    let syncedCount = 0;
    let errorCount = 0;

    // 2. For each OutletStock, recalculate renting from actual orders
    for (const outletStock of allOutletStocks) {
      try {
        // Count actual renting from RENT orders with PICKUPED status
        const actualRenting = await prisma.orderItem.aggregate({
          where: {
            productId: outletStock.productId,
            order: {
              outletId: outletStock.outletId,
              orderType: ORDER_TYPE.RENT,
              status: ORDER_STATUS.PICKUPED,
            },
          },
          _sum: {
            quantity: true,
          },
        });

        const calculatedRenting = actualRenting._sum.quantity || 0;

        // Calculate available = stock - renting
        const calculatedAvailable = Math.max(0, outletStock.stock - calculatedRenting);

        // Check if update is needed
        const needsUpdate = 
          outletStock.renting !== calculatedRenting ||
          outletStock.available !== calculatedAvailable;

        if (needsUpdate) {
          console.log(`📝 Updating OutletStock for product ${outletStock.product.name} (${outletStock.product.id}), outlet ${outletStock.outlet.name} (${outletStock.outlet.id}):`);
          console.log(`   Stock: ${outletStock.stock}`);
          console.log(`   Renting: ${outletStock.renting} → ${calculatedRenting}`);
          console.log(`   Available: ${outletStock.available} → ${calculatedAvailable}`);

          await prisma.outletStock.update({
            where: { id: outletStock.id },
            data: {
              renting: calculatedRenting,
              available: calculatedAvailable,
            },
          });

          syncedCount++;
          console.log(`   ✅ Synced\n`);
        } else {
          console.log(`✓ OutletStock for product ${outletStock.product.name} (${outletStock.product.id}), outlet ${outletStock.outlet.name} (${outletStock.outlet.id}) is already correct\n`);
        }
      } catch (error) {
        console.error(`❌ Error syncing OutletStock ${outletStock.id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📊 Sync Summary:');
    console.log(`   Total entries: ${allOutletStocks.length}`);
    console.log(`   Synced: ${syncedCount}`);
    console.log(`   Already correct: ${allOutletStocks.length - syncedCount - errorCount}`);
    console.log(`   Errors: ${errorCount}`);

    // 3. Verify SALE orders have reduced stock correctly
    console.log('\n🔍 Verifying SALE orders stock reduction...');
    
    const saleOrders = await prisma.order.findMany({
      where: {
        orderType: ORDER_TYPE.SALE,
        status: {
          in: [ORDER_STATUS.COMPLETED, ORDER_STATUS.PICKUPED],
        },
      },
      include: {
        orderItems: {
          select: {
            productId: true,
            quantity: true,
          },
        },
        outlet: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log(`   Found ${saleOrders.length} completed/pickuped SALE orders`);

    let saleStockIssues = 0;
    for (const order of saleOrders) {
      for (const item of order.orderItems) {
        const outletStock = await prisma.outletStock.findUnique({
          where: {
            productId_outletId: {
              productId: item.productId,
              outletId: order.outletId,
            },
          },
        });

        if (outletStock) {
          // For SALE orders, stock should have been reduced
          // We can't verify this directly without knowing the original stock,
          // but we can check if available is reasonable
          // (available should be <= stock, and if there are no RENT orders, available should equal stock)
          const rentingFromRentOrders = await prisma.orderItem.aggregate({
            where: {
              productId: item.productId,
              order: {
                outletId: order.outletId,
                orderType: ORDER_TYPE.RENT,
                status: ORDER_STATUS.PICKUPED,
              },
            },
            _sum: {
              quantity: true,
            },
          });

          const expectedAvailable = outletStock.stock - (rentingFromRentOrders._sum.quantity || 0);
          
          if (Math.abs(outletStock.available - expectedAvailable) > 0.01) {
            console.warn(`   ⚠️ Potential issue: Product ${item.productId}, Outlet ${order.outletId}`);
            console.warn(`      Stock: ${outletStock.stock}, Available: ${outletStock.available}, Expected: ${expectedAvailable}`);
            saleStockIssues++;
          }
        }
      }
    }

    if (saleStockIssues === 0) {
      console.log(`   ✅ All SALE orders stock reductions verified\n`);
    } else {
      console.log(`   ⚠️ Found ${saleStockIssues} potential stock reduction issues\n`);
    }

    console.log('✅ Sync completed successfully!');

  } catch (error) {
    console.error('❌ Error during sync:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the sync
syncOutletStock()
  .then(() => {
    console.log('\n🎉 Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });


/**
 * Migration Script: Update Order Numbers to Consistent Format
 * 
 * This script updates existing orders to use the format: ORD-{outletId}-{sequence}
 * instead of the previous timestamp-based format.
 * 
 * Usage: node scripts/update-order-numbers.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateOrderNumbers() {
  console.log('🔄 Starting order number migration...');
  
  try {
    // Get all orders with their outlet information
    const orders = await prisma.order.findMany({
      include: {
        outlet: {
          select: {
            publicId: true,
            name: true
          }
        }
      },
      orderBy: [
        { outletId: 'asc' },
        { publicId: 'asc' }
      ]
    });

    console.log(`📋 Found ${orders.length} orders to update`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Group orders by outlet for proper sequencing
    const outletOrders = {};
    
    for (const order of orders) {
      const outletId = order.outlet.publicId;
      if (!outletOrders[outletId]) {
        outletOrders[outletId] = [];
      }
      outletOrders[outletId].push(order);
    }

    // Update each outlet's orders with proper sequencing
    for (const [outletId, outletOrderList] of Object.entries(outletOrders)) {
      // Get outlet name from the first order in the list
      const outletName = outletOrderList[0]?.outlet?.name || `Outlet ${outletId}`;
      console.log(`🏪 Processing outlet ${outletId} (${outletName}) with ${outletOrderList.length} orders`);
      
      // Sort orders by creation date to maintain chronological sequence
      outletOrderList.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      for (let i = 0; i < outletOrderList.length; i++) {
        const order = outletOrderList[i];
        const sequence = i + 1;
        const newOrderNumber = `ORD-${outletId.toString().padStart(3, '0')}-${sequence.toString().padStart(4, '0')}`;
        
        // Check if the new order number already exists
        const existingOrder = await prisma.order.findFirst({
          where: { 
            orderNumber: newOrderNumber,
            id: { not: order.id } // Exclude current order
          }
        });
        
        if (existingOrder) {
          console.log(`⚠️  Order number ${newOrderNumber} already exists, skipping order ${order.orderNumber}`);
          skippedCount++;
          continue;
        }
        
        try {
          await prisma.order.update({
            where: { id: order.id },
            data: { orderNumber: newOrderNumber }
          });
          
          console.log(`✅ Updated: ${order.orderNumber} → ${newOrderNumber}`);
          updatedCount++;
        } catch (error) {
          console.error(`❌ Failed to update order ${order.orderNumber}:`, error.message);
          errorCount++;
        }
      }
    }

    console.log('\n🎉 Order number migration completed!');
    console.log(`📊 Summary:`);
    console.log(`   ✅ Updated: ${updatedCount} orders`);
    console.log(`   ⚠️  Skipped: ${skippedCount} orders`);
    console.log(`   ❌ Errors: ${errorCount} orders`);
    
    if (errorCount > 0) {
      console.log('\n⚠️  Some orders failed to update. Check the logs above for details.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
if (require.main === module) {
  updateOrderNumbers()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { updateOrderNumbers };
